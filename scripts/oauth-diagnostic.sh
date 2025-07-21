#!/bin/bash

# 🩺 Script de diagnostic OAuth pour md2googleslides
# Diagnostique et répare les problèmes OAuth récurrents

set -e

echo "====================================================="
echo "🩺 Diagnostic OAuth md2googleslides"
echo "====================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_section() {
    echo -e "\n${CYAN}📋 $1${NC}"
    echo "----------------------------------------"
}

# Variables globales
ISSUES_FOUND=0
FIXES_APPLIED=0

# 1. Diagnostic des fichiers de configuration
print_section "1. DIAGNOSTIC DES FICHIERS"

# Vérifier client_id.json
if [ -f "./credentials/client_id.json" ]; then
    print_success "client_id.json trouvé"
    
    # Valider le JSON
    if jq empty ./credentials/client_id.json 2>/dev/null; then
        print_success "client_id.json est un JSON valide"
        
        # Vérifier les champs requis
        if jq -e '.web // .installed' ./credentials/client_id.json >/dev/null 2>&1; then
            print_success "Structure OAuth correcte (web/installed)"
        else
            print_error "Structure OAuth incorrecte"
            ((ISSUES_FOUND++))
        fi
        
        if jq -e '(.web // .installed).client_id' ./credentials/client_id.json >/dev/null 2>&1; then
            print_success "client_id présent"
        else
            print_error "client_id manquant"
            ((ISSUES_FOUND++))
        fi
        
        if jq -e '(.web // .installed).client_secret' ./credentials/client_id.json >/dev/null 2>&1; then
            print_success "client_secret présent"
        else
            print_error "client_secret manquant"
            ((ISSUES_FOUND++))
        fi
    else
        print_error "client_id.json contient du JSON invalide"
        ((ISSUES_FOUND++))
    fi
else
    print_error "client_id.json manquant dans ./credentials/"
    print_info "Copiez le fichier depuis Google Cloud Console:"
    echo "   cp ~/Downloads/client_id.json ./credentials/"
    ((ISSUES_FOUND++))
fi

# Vérifier credentials.json (tokens)
if [ -f "./credentials/credentials.json" ]; then
    print_success "credentials.json trouvé (tokens stockés)"
    
    if jq empty ./credentials/credentials.json 2>/dev/null; then
        print_success "credentials.json est un JSON valide"
        
        # Vérifier les refresh tokens
        USERS=$(jq -r 'keys[]' ./credentials/credentials.json 2>/dev/null || echo "")
        if [ -n "$USERS" ]; then
            echo "Utilisateurs avec tokens:"
            for user in $USERS; do
                if jq -e ".\"$user\".refresh_token" ./credentials/credentials.json >/dev/null 2>&1; then
                    print_success "  $user: refresh_token présent"
                else
                    print_warning "  $user: refresh_token manquant"
                    ((ISSUES_FOUND++))
                fi
                
                # Vérifier l'âge du token
                if jq -e ".\"$user\".timestamp" ./credentials/credentials.json >/dev/null 2>&1; then
                    TIMESTAMP=$(jq -r ".\"$user\".timestamp" ./credentials/credentials.json)
                    AGE_DAYS=$(( ($(date +%s) - $TIMESTAMP/1000) / 86400 ))
                    if [ $AGE_DAYS -gt 30 ]; then
                        print_warning "  $user: token âgé de $AGE_DAYS jours (>30)"
                    else
                        print_info "  $user: token âgé de $AGE_DAYS jours"
                    fi
                else
                    print_info "  $user: pas de timestamp (token ancien format)"
                fi
            done
        else
            print_warning "Aucun token utilisateur trouvé"
        fi
    else
        print_error "credentials.json contient du JSON invalide"
        ((ISSUES_FOUND++))
    fi
else
    print_info "credentials.json absent (normal pour premier démarrage)"
fi

# 2. Diagnostic des permissions
print_section "2. DIAGNOSTIC DES PERMISSIONS"

# Permissions sur l'hôte
print_info "Permissions sur l'hôte:"
ls -la ./credentials/ 2>/dev/null && print_success "Dossier credentials accessible" || (print_error "Dossier credentials inaccessible"; ((ISSUES_FOUND++)))

# Permissions dans le conteneur (si running)
if docker ps --format "table {{.Names}}" | grep -q "md2slides"; then
    print_info "Permissions dans le conteneur:"
    if docker exec md2slides ls -la /home/md2gslides/.md2googleslides/ 2>/dev/null; then
        print_success "Dossier credentials accessible dans le conteneur"
        
        # Vérifier les permissions d'écriture
        if docker exec md2slides test -w /home/md2gslides/.md2googleslides/; then
            print_success "Permissions d'écriture OK"
        else
            print_error "Pas de permissions d'écriture"
            ((ISSUES_FOUND++))
        fi
    else
        print_warning "Dossier credentials non accessible dans le conteneur"
        ((ISSUES_FOUND++))
    fi
else
    print_info "Conteneur non en cours d'exécution"
fi

# 3. Diagnostic du service
print_section "3. DIAGNOSTIC DU SERVICE"

if docker ps --format "table {{.Names}}" | grep -q "md2slides"; then
    print_success "Conteneur en cours d'exécution"
    
    # Test de santé
    if curl -s -f http://localhost:3000/health >/dev/null; then
        print_success "Service répond sur /health"
        
        # Afficher les infos de santé
        HEALTH_INFO=$(curl -s http://localhost:3000/health)
        echo "Informations du service:"
        echo "$HEALTH_INFO" | jq '.' 2>/dev/null || echo "$HEALTH_INFO"
    else
        print_error "Service ne répond pas sur /health"
        ((ISSUES_FOUND++))
    fi
    
    # Vérifier les logs récents pour erreurs OAuth
    print_info "Analyse des logs récents (OAuth errors):"
    OAUTH_ERRORS=$(docker logs md2slides --since=10m 2>&1 | grep -i "refresh token\|invalid_grant\|oauth\|discovery error" | tail -5)
    if [ -n "$OAUTH_ERRORS" ]; then
        print_warning "Erreurs OAuth trouvées dans les logs:"
        echo "$OAUTH_ERRORS"
        ((ISSUES_FOUND++))
    else
        print_success "Aucune erreur OAuth récente dans les logs"
    fi
else
    print_error "Conteneur non en cours d'exécution"
    ((ISSUES_FOUND++))
fi

# 4. Test du flux OAuth
print_section "4. TEST DU FLUX OAUTH"

if curl -s -f http://localhost:3000/health >/dev/null; then
    print_info "Test de génération d'URL d'autorisation..."
    
    RESPONSE=$(curl -s -X POST http://localhost:3000/convert-text \
        -H "Content-Type: application/json" \
        -d '{"markdown":"# Test Diagnostic\n\n## OAuth Check\nTesting OAuth flow","user":"diagnostic@test.com","title":"Diagnostic OAuth"}')
    
    if echo "$RESPONSE" | grep -q "auth_url"; then
        print_success "Génération d'URL d'autorisation OK"
        AUTH_URL=$(echo "$RESPONSE" | jq -r '.auth_url' 2>/dev/null)
        if [ "$AUTH_URL" != "null" ] && [ -n "$AUTH_URL" ]; then
            print_info "URL générée: ${AUTH_URL:0:80}..."
        fi
    elif echo "$RESPONSE" | grep -q "authorization_required"; then
        print_success "Flux OAuth fonctionnel (autorisation requise comme attendu)"
    else
        print_error "Problème avec le flux OAuth"
        print_info "Réponse reçue: $RESPONSE"
        ((ISSUES_FOUND++))
    fi
else
    print_warning "Service inaccessible, impossible de tester OAuth"
fi

# 5. Configuration Google Cloud
print_section "5. VÉRIFICATION CONFIGURATION GOOGLE CLOUD"

if [ -f "./credentials/client_id.json" ]; then
    print_info "Configuration OAuth détectée:"
    
    # Extraire l'URI de redirection si présent
    REDIRECT_URIS=$(jq -r '(.web // .installed).redirect_uris[]?' ./credentials/client_id.json 2>/dev/null || echo "")
    if [ -n "$REDIRECT_URIS" ]; then
        echo "URIs de redirection configurées:"
        echo "$REDIRECT_URIS" | while read uri; do
            if [ -n "$uri" ]; then
                print_info "  $uri"
            fi
        done
        
        # Vérifier si l'URI actuelle est configurée
        EXPECTED_URI="https://n8n-ivayh-u36210.vm.elestio.app/oauth/callback"
        if echo "$REDIRECT_URIS" | grep -q "$EXPECTED_URI"; then
            print_success "URI de redirection correcte configurée"
        else
            print_warning "URI de redirection manquante dans Google Cloud:"
            print_info "Ajoutez dans Google Cloud Console: $EXPECTED_URI"
            ((ISSUES_FOUND++))
        fi
    else
        print_info "Aucune URI de redirection trouvée dans le fichier"
    fi
fi

# 6. Recommandations et fixes automatiques
print_section "6. RECOMMANDATIONS ET FIXES"

if [ $ISSUES_FOUND -gt 0 ]; then
    print_warning "$ISSUES_FOUND problème(s) détecté(s)"
    
    echo -e "\n🔧 FIXES AUTOMATIQUES DISPONIBLES:"
    
    # Fix 1: Permissions
    if docker ps --format "table {{.Names}}" | grep -q "md2slides"; then
        if ! docker exec md2slides test -w /home/md2gslides/.md2googleslides/ 2>/dev/null; then
            echo -n "Corriger les permissions dans le conteneur ? [y/N] "
            read -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "Application du fix permissions..."
                docker exec md2slides sh -c "chown -R md2gslides:nodejs /home/md2gslides/.md2googleslides && chmod -R 755 /home/md2gslides/.md2googleslides"
                print_success "Permissions corrigées"
                ((FIXES_APPLIED++))
            fi
        fi
    fi
    
    # Fix 2: Nettoyer tokens corrompus
    if [ -f "./credentials/credentials.json" ] && ! jq empty ./credentials/credentials.json 2>/dev/null; then
        echo -n "Nettoyer le fichier credentials.json corrompu ? [y/N] "
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Sauvegarde et nettoyage du fichier corrompu..."
            cp ./credentials/credentials.json ./credentials/credentials.json.backup.$(date +%Y%m%d_%H%M%S)
            echo "{}" > ./credentials/credentials.json
            print_success "Fichier credentials.json nettoyé"
            ((FIXES_APPLIED++))
        fi
    fi
    
    # Fix 3: Redémarrer le service si erreurs détectées
    if docker ps --format "table {{.Names}}" | grep -q "md2slides" && [ $ISSUES_FOUND -gt 2 ]; then
        echo -n "Redémarrer le service pour appliquer les corrections ? [y/N] "
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Redémarrage du service..."
            docker-compose restart md2googleslides
            sleep 5
            if curl -s -f http://localhost:3000/health >/dev/null; then
                print_success "Service redémarré avec succès"
                ((FIXES_APPLIED++))
            else
                print_error "Problème lors du redémarrage"
            fi
        fi
    fi
else
    print_success "Aucun problème détecté ! 🎉"
fi

# 7. Résumé et recommandations
print_section "7. RÉSUMÉ ET RECOMMANDATIONS"

echo -e "\n📊 RÉSUMÉ DU DIAGNOSTIC:"
echo "• Problèmes détectés: $ISSUES_FOUND"
echo "• Corrections appliquées: $FIXES_APPLIED"

if [ $ISSUES_FOUND -eq 0 ]; then
    print_success "Système OAuth opérationnel !"
elif [ $FIXES_APPLIED -gt 0 ]; then
    print_info "Corrections partielles appliquées"
    REMAINING=$((ISSUES_FOUND - FIXES_APPLIED))
    if [ $REMAINING -gt 0 ]; then
        print_warning "$REMAINING problème(s) restant(s) nécessitent une intervention manuelle"
    fi
else
    print_warning "Intervention manuelle requise pour corriger les problèmes"
fi

echo -e "\n🚀 ACTIONS RECOMMANDÉES:"

if [ $ISSUES_FOUND -gt 0 ]; then
    echo "1. Si tokens manquants/corrompus:"
    echo "   • Supprimer ./credentials/credentials.json"
    echo "   • Relancer l'autorisation OAuth via l'API"
    echo ""
    echo "2. Si problèmes de permissions persistants:"
    echo "   • chmod -R 755 ./credentials"
    echo "   • docker-compose down && docker-compose up -d"
    echo ""
    echo "3. Si erreurs de configuration Google Cloud:"
    echo "   • Vérifier les URIs de redirection dans Google Cloud Console"
    echo "   • S'assurer que les APIs Google Slides/Drive sont activées"
    echo ""
fi

echo "4. Tests recommandés après corrections:"
echo "   • curl http://localhost:3000/health"
echo "   • Test OAuth complet via /convert-text"
echo ""

echo "5. Monitoring continu:"
echo "   • docker-compose logs -f md2googleslides"
echo "   • ./scripts/oauth-diagnostic.sh (ce script) régulièrement"

echo -e "\n📋 COMMANDES UTILES:"
echo "• Logs en temps réel: docker-compose logs -f md2googleslides"
echo "• Redémarrage propre: docker-compose restart md2googleslides"
echo "• Reset complet: docker-compose down && docker-compose up -d"
echo "• Santé du service: curl -s http://localhost:3000/health | jq ."

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "\n${GREEN}🎉 Diagnostic terminé - Système OAuth opérationnel !${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Diagnostic terminé - $ISSUES_FOUND problème(s) nécessitent attention${NC}"
    exit 1
fi
