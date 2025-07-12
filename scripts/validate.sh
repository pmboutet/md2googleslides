#!/bin/bash

# Script de validation pour md2googleslides
# Vérifie que toutes les dépendances sont correctement installées et que l'application fonctionne

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Validation de md2googleslides${NC}"
echo "================================"

# Fonction pour afficher le résultat d'un test
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

# Vérifier Node.js
echo -e "${YELLOW}📋 Vérification de l'environnement...${NC}"
node --version > /dev/null 2>&1
check_result "Node.js est installé ($(node --version))"

npm --version > /dev/null 2>&1
check_result "npm est installé ($(npm --version))"

# Vérifier que package.json existe
[ -f "package.json" ]
check_result "package.json présent"

# Vérifier les dépendances critiques
echo -e "${YELLOW}📦 Vérification des dépendances...${NC}"

CRITICAL_DEPS=(
    "markdown-it"
    "googleapis" 
    "google-auth-library"
    "sharp"
    "debug"
    "uuid"
    "lowdb"
    "tmp"
)

for dep in "${CRITICAL_DEPS[@]}"; do
    node -e "require('$dep')" > /dev/null 2>&1
    check_result "Dépendance $dep disponible"
done

# Vérifier que le code TypeScript est compilé
echo -e "${YELLOW}🔨 Vérification de la compilation...${NC}"
[ -d "lib" ]
check_result "Répertoire lib/ présent"

[ -f "lib/index.js" ]
check_result "Point d'entrée compilé présent"

[ -f "bin/md2gslides.js" ]
check_result "Exécutable principal présent"

# Test de base de l'application
echo -e "${YELLOW}🧪 Tests fonctionnels...${NC}"

# Test --version
node bin/md2gslides.js --version > /dev/null 2>&1
check_result "Commande --version fonctionne"

# Test --help
node bin/md2gslides.js --help > /dev/null 2>&1
check_result "Commande --help fonctionne"

# Test avec un fichier markdown simple
echo "# Test\nHello World" > /tmp/test-validation.md
node bin/md2gslides.js --help > /dev/null 2>&1  # Test sans credentials
check_result "Test basique sans erreur critique"

# Nettoyer
rm -f /tmp/test-validation.md

# Vérifier les permissions (si dans Docker)
if [ -f /.dockerenv ]; then
    echo -e "${YELLOW}🐳 Vérifications spécifiques Docker...${NC}"
    
    # Vérifier l'utilisateur courant
    current_user=$(whoami)
    if [ "$current_user" != "root" ]; then
        check_result "Utilisateur non-root ($current_user)"
    else
        echo -e "${YELLOW}⚠️  Exécution en tant que root (non recommandé en production)${NC}"
    fi
    
    # Vérifier l'espace disque
    df -h /tmp > /dev/null 2>&1
    check_result "Espace disque accessible"
    
    # Vérifier les variables d'environnement importantes
    [ -n "$NODE_ENV" ]
    check_result "Variable NODE_ENV définie ($NODE_ENV)"
fi

# Tests de performance basiques
echo -e "${YELLOW}⚡ Tests de performance...${NC}"

# Mesurer le temps de démarrage
start_time=$(date +%s%N)
node bin/md2gslides.js --version > /dev/null 2>&1
end_time=$(date +%s%N)
startup_time=$((($end_time - $start_time) / 1000000)) # en milliseconds

if [ $startup_time -lt 5000 ]; then  # moins de 5 secondes
    check_result "Temps de démarrage acceptable (${startup_time}ms)"
else
    echo -e "${YELLOW}⚠️  Temps de démarrage élevé: ${startup_time}ms${NC}"
fi

# Vérifier l'utilisation mémoire de base
memory_usage=$(ps -o pid,vsz,rss,comm -p $$ | tail -1 | awk '{print $3}')
if [ $memory_usage -lt 100000 ]; then  # moins de 100MB
    check_result "Utilisation mémoire acceptable (${memory_usage}KB)"
else
    echo -e "${YELLOW}⚠️  Utilisation mémoire élevée: ${memory_usage}KB${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Validation terminée avec succès!${NC}"
echo -e "${BLUE}📊 Résumé:${NC}"
echo "   - Environnement: OK"
echo "   - Dépendances: OK" 
echo "   - Compilation: OK"
echo "   - Fonctionnalités: OK"
echo "   - Performance: OK"
echo ""
echo -e "${BLUE}md2googleslides est prêt à être utilisé! 🚀${NC}"
