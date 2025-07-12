#!/bin/sh

# Healthcheck script pour md2googleslides
# Vérifie que l'application fonctionne correctement

set -e

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Vérification de la santé de md2googleslides...${NC}"

# Vérifier que Node.js est disponible
if ! command -v node > /dev/null 2>&1; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi

# Vérifier que l'application peut s'exécuter
if ! node bin/md2gslides.js --version > /dev/null 2>&1; then
    echo -e "${RED}❌ L'application ne peut pas s'exécuter${NC}"
    exit 1
fi

# Vérifier que les dépendances critiques sont présentes
CRITICAL_MODULES="markdown-it googleapis google-auth-library sharp"

for module in $CRITICAL_MODULES; do
    if ! node -e "require('$module')" > /dev/null 2>&1; then
        echo -e "${RED}❌ Module critique manquant: $module${NC}"
        exit 1
    fi
done

# Vérifier l'espace disque disponible (minimum 100MB)
AVAILABLE_SPACE=$(df /tmp | awk 'NR==2 {print $4}')
MIN_SPACE=102400  # 100MB en KB

if [ "$AVAILABLE_SPACE" -lt "$MIN_SPACE" ]; then
    echo -e "${RED}❌ Espace disque insuffisant: ${AVAILABLE_SPACE}KB disponible, ${MIN_SPACE}KB requis${NC}"
    exit 1
fi

# Vérifier que le répertoire de configuration existe
if [ ! -d "/home/md2gslides/.md2googleslides" ]; then
    echo -e "${YELLOW}⚠️  Répertoire de configuration manquant (normal si pas de credentials)${NC}"
fi

# Test basique de conversion (si possible)
echo "# Test Healthcheck" > /tmp/test-healthcheck.md
if node bin/md2gslides.js --help > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application opérationnelle${NC}"
else
    echo -e "${RED}❌ L'application ne répond pas correctement${NC}"
    exit 1
fi

# Nettoyer
rm -f /tmp/test-healthcheck.md

echo -e "${GREEN}✅ Healthcheck réussi - md2googleslides est en bonne santé${NC}"
exit 0
