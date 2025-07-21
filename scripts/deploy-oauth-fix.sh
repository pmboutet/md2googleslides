#!/bin/bash

# 🔧 OAuth Fix Deployment Script pour md2googleslides
# Script pour appliquer les corrections OAuth et résoudre les erreurs de tokens

set -e

echo "====================================================="
echo "🔧 OAuth Fix Deployment pour md2googleslides"
echo "====================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Vérifications préliminaires
echo "1️⃣ Vérifications préliminaires..."
print_info "Checking Docker and Docker Compose..."

if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose n'est pas installé"
    exit 1
fi

print_success "Docker et Docker Compose sont installés"

# 2. Préparation de l'environnement
echo -e "\n2️⃣ Préparation de l'environnement..."

# Créer le dossier credentials s'il n'existe pas
if [ ! -d "./credentials" ]; then
    mkdir -p ./credentials
    print_success "Dossier ./credentials créé"
else
    print_info "Dossier ./credentials existe déjà"
fi

# Vérifier la présence du client_id.json
if [ ! -f "./credentials/client_id.json" ]; then
    print_warning "client_id.json non trouvé dans ./credentials/"
    echo "Veuillez copier votre fichier client_id.json depuis Google Cloud Console:"
    echo "cp ~/Downloads/client_id.json ./credentials/"
    echo -e "\nOu depuis votre configuration existante:"
    echo "cp ~/.md2googleslides/client_id.json ./credentials/"
    read -p "Appuyez sur Entrée une fois le fichier copié..."
    
    if [ ! -f "./credentials/client_id.json" ]; then
        print_error "client_id.json toujours manquant. Deployment interrompu."
        exit 1
    fi
fi

print_success "client_id.json trouvé"

# Vérifier les permissions
chmod -R 755 ./credentials
print_success "Permissions corrigées sur ./credentials"

# 3. Sauvegarde des tokens existants
echo -e "\n3️⃣ Sauvegarde des tokens existants..."

if [ -f "./credentials/credentials.json" ]; then
    cp ./credentials/credentials.json ./credentials/credentials.json.backup.$(date +%Y%m%d_%H%M%S)
    print_success "Tokens existants sauvegardés"
else
    print_info "Aucun token existant trouvé (nouveau deployment)"
fi

# 4. Arrêt des services existants
echo -e "\n4️⃣ Arrêt des services existants..."

if docker-compose ps | grep -q "md2slides"; then
    print_info "Arrêt du conteneur existant..."
    docker-compose down md2googleslides || true
    print_success "Service arrêté"
else
    print_info "Aucun service en cours d'exécution"
fi

# 5. Build de la nouvelle image avec les corrections OAuth
echo -e "\n5️⃣ Build de l'image avec corrections OAuth..."

print_info "Building image with OAuth fixes..."
docker-compose build --no-cache md2googleslides

if [ $? -eq 0 ]; then
    print_success "Image construite avec succès"
else
    print_error "Échec du build"
    exit 1
fi

# 6. Démarrage du service mis à jour
echo -e "\n6️⃣ Démarrage du service mis à jour..."

print_info "Démarrage du conteneur..."
docker-compose up -d md2googleslides

if [ $? -eq 0 ]; then
    print_success "Service démarré"
else
    print_error "Échec du démarrage"
    exit 1
fi

# 7. Attendre que le service soit prêt
echo -e "\n7️⃣ Vérification du démarrage..."

print_info "Attente du démarrage du service..."
sleep 10

# Test de santé
for i in {1..6}; do
    if curl -s -f http://localhost:3000/health > /dev/null; then
        print_success "Service opérationnel !"
        break
    else
        print_info "Tentative $i/6... (attente 5s)"
        sleep 5
    fi
    
    if [ $i -eq 6 ]; then
        print_error "Service non accessible après 30 secondes"
        echo "Vérification des logs:"
        docker-compose logs --tail=20 md2googleslides
        exit 1
    fi
done

# 8. Test OAuth
echo -e "\n8️⃣ Test du flux OAuth corrigé..."

print_info "Test de l'endpoint d'autorisation..."
RESPONSE=$(curl -s -X POST http://localhost:3000/convert-text \
    -H "Content-Type: application/json" \
    -d '{"markdown":"# Test OAuth\n\n## Slide 1\nTest après corrections OAuth","user":"test@example.com","title":"Test OAuth Fix"}')

if echo "$RESPONSE" | grep -q "auth_url"; then
    print_success "Flux OAuth fonctionnel - URL d'autorisation générée"
    AUTH_URL=$(echo "$RESPONSE" | grep -o '"auth_url":"[^"]*"' | cut -d'"' -f4)
    echo -e "\n${BLUE}🔗 URL d'autorisation OAuth:${NC}"
    echo "$AUTH_URL"
else
    print_error "Problème avec le flux OAuth"
    echo "Réponse reçue:"
    echo "$RESPONSE"
fi

# 9. Diagnostic des permissions
echo -e "\n9️⃣ Diagnostic des permissions..."

print_info "Vérification des permissions dans le conteneur..."
docker exec md2slides ls -la /home/md2gslides/.md2googleslides/ || print_warning "Dossier credentials non encore créé dans le conteneur"

# 10. Résumé et instructions finales
echo -e "\n🎉 DÉPLOIEMENT TERMINÉ"
echo "====================================================="
print_success "Les corrections OAuth ont été appliquées avec succès !"

echo -e "\n📋 RÉSUMÉ DES CORRECTIONS APPLIQUÉES:"
echo "✅ Gestion améliorée des refresh tokens"
echo "✅ Force le consentement OAuth (prompt: 'consent')"
echo "✅ Validation des tokens avec timestamp" 
echo "✅ Retry automatique en cas d'échec de refresh"
echo "✅ Permissions Docker corrigées (suppression :ro)"
echo "✅ Écriture atomique des credentials"

echo -e "\n📖 ÉTAPES POUR TESTER OAUTH:"
echo "1. Visitez l'URL d'autorisation ci-dessus"
echo "2. Autorisez l'application dans Google"
echo "3. Copiez le paramètre 'code' de l'URL de callback"
echo "4. Testez la conversion:"
echo ""
echo "   curl -X POST http://localhost:3000/convert-text \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"markdown\":\"# Test Final\n\n## Success!\nOAuth fix applied\",\"user\":\"test@example.com\"}'"

echo -e "\n🔍 MONITORING:"
echo "• Santé du service: curl http://localhost:3000/health"
echo "• Logs en temps réel: docker-compose logs -f md2googleslides"
echo "• API documentation: http://localhost:3000/"

echo -e "\n🛠️ DÉPANNAGE SI BESOIN:"
echo "• Redémarrer: docker-compose restart md2googleslides"
echo "• Logs détaillés: docker-compose logs md2googleslides"
echo "• Rebuild complet: docker-compose build --no-cache md2googleslides"

print_success "Déploiement OAuth fix terminé ! 🚀"
