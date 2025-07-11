#!/bin/bash

# Script de test automatisé pour md2googleslides
# Usage: ./test.sh [--docker-only] [--skip-build]

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Variables
DOCKER_ONLY=false
SKIP_BUILD=false
IMAGE_NAME="md2googleslides"
TAG="test"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --docker-only)
            DOCKER_ONLY=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        *)
            log_error "Option inconnue: $1"
            exit 1
            ;;
    esac
done

# Créer les fichiers de test
create_test_files() {
    log_info "Création des fichiers de test..."
    
    # Test basique
    cat > test-basic.md << 'EOF'
# Présentation de test

---

## Introduction
Ceci est une slide d'introduction

---

## Contenu principal
- Point important 1
- Point important 2
- Point important 3

---

## Conclusion
Merci pour votre attention !
EOF

    # Test avec formatage
    cat > test-formatting.md << 'EOF'
# Test de formatage

---

## Styles de texte
**Gras**, *italique*, et ~~barré~~

Lien vers [Google](https://google.com)

---

## Code
```javascript
function hello() {
    console.log("Hello World!");
}
```

---

## Liste numérotée
1. Premier élément
2. Deuxième élément
   1. Sous-élément
   2. Autre sous-élément
EOF

    # Test layouts
    cat > test-layouts.md << 'EOF'
# Titre principal
## Sous-titre

---

# Point principal {.big}

---

# Deux colonnes

Contenu de la colonne gauche

{.column}

Contenu de la colonne droite

---

# 100% {.big}

Important !
EOF

    log_success "Fichiers de test créés"
}

# Tests Node.js locaux
test_nodejs() {
    if [ "$DOCKER_ONLY" = true ]; then
        return 0
    fi

    log_info "=== Tests Node.js locaux ==="
    
    # Vérifier Node.js version
    log_info "Vérification de la version Node.js..."
    node --version
    npm --version
    
    # Installation des dépendances
    if [ "$SKIP_BUILD" = false ]; then
        log_info "Installation des dépendances..."
        npm install
        
        log_info "Compilation TypeScript..."
        npm run clean
        npm run compile
    fi
    
    # Tests unitaires
    log_info "Exécution des tests unitaires..."
    npm test
    
    # Linting
    log_info "Vérification du style de code..."
    npm run lint
    
    # Test fonctionnel basique
    log_info "Test fonctionnel basique..."
    node bin/md2gslides.js --help > /dev/null
    
    log_success "Tests Node.js réussis"
}

# Tests Docker
test_docker() {
    log_info "=== Tests Docker ==="
    
    # Construction de l'image
    if [ "$SKIP_BUILD" = false ]; then
        log_info "Construction de l'image Docker..."
        docker build -t ${IMAGE_NAME}:${TAG} .
    fi
    
    # Vérifier que l'image existe
    if ! docker images ${IMAGE_NAME}:${TAG} --format "table {{.Repository}}:{{.Tag}}" | grep -q "${IMAGE_NAME}:${TAG}"; then
        log_error "Image Docker non trouvée"
        exit 1
    fi
    
    # Test de l'aide
    log_info "Test de l'aide Docker..."
    docker run --rm ${IMAGE_NAME}:${TAG} --help > /dev/null
    
    # Test avec fichier markdown
    log_info "Test de conversion avec Docker..."
    docker run --rm \
        -v $(pwd):/workspace \
        ${IMAGE_NAME}:${TAG} \
        /workspace/test-basic.md \
        --title "Docker Test" \
        --dry-run > /dev/null
    
    # Test de performance (limité en temps)
    log_info "Test de performance..."
    timeout 30s docker run --rm \
        -v $(pwd):/workspace \
        ${IMAGE_NAME}:${TAG} \
        /workspace/test-formatting.md \
        --title "Performance Test" \
        --dry-run > /dev/null
    
    log_success "Tests Docker réussis"
}

# Tests de sécurité
security_tests() {
    log_info "=== Tests de sécurité ==="
    
    if [ "$DOCKER_ONLY" = false ]; then
        # Audit npm
        log_info "Audit des dépendances npm..."
        npm audit --audit-level=high
    fi
    
    # Scan Docker si disponible
    if command -v trivy &> /dev/null; then
        log_info "Scan de sécurité Docker avec Trivy..."
        trivy image --severity HIGH,CRITICAL ${IMAGE_NAME}:${TAG}
    else
        log_warning "Trivy non disponible, scan de sécurité ignoré"
    fi
    
    log_success "Tests de sécurité terminés"
}

# Tests de régression
regression_tests() {
    log_info "=== Tests de régression ==="
    
    local test_files=("test-basic.md" "test-formatting.md" "test-layouts.md")
    
    for file in "${test_files[@]}"; do
        log_info "Test de régression: $file"
        
        if [ "$DOCKER_ONLY" = true ]; then
            docker run --rm \
                -v $(pwd):/workspace \
                ${IMAGE_NAME}:${TAG} \
                /workspace/$file \
                --title "Regression Test: $file" \
                --dry-run > /dev/null
        else
            node bin/md2gslides.js $file \
                --title "Regression Test: $file" \
                --dry-run > /dev/null
        fi
    done
    
    log_success "Tests de régression réussis"
}

# Nettoyage
cleanup() {
    log_info "Nettoyage des fichiers de test..."
    rm -f test-*.md
    log_success "Nettoyage terminé"
}

# Fonction principale
main() {
    log_info "Début des tests pour md2googleslides"
    log_info "Configuration: DOCKER_ONLY=$DOCKER_ONLY, SKIP_BUILD=$SKIP_BUILD"
    
    # Créer les fichiers de test
    create_test_files
    
    # Exécuter les tests
    test_nodejs
    test_docker
    security_tests
    regression_tests
    
    # Nettoyage
    cleanup
    
    log_success "🎉 Tous les tests sont passés avec succès !"
    log_info "L'application est prête pour le déploiement"
}

# Gestion des erreurs
trap 'log_error "Test échoué à la ligne $LINENO"; cleanup; exit 1' ERR

# Exécution
main "$@"