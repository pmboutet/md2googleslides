#!/bin/bash

# Script de migration automatique pour md2googleslides
# Ce script migre l'ancien projet vers la nouvelle version avec dépendances mises à jour

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
PROJECT_DIR=$(pwd)
DRY_RUN=false
FORCE=false

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Fonction d'aide
show_help() {
    cat << EOF
Script de migration md2googleslides

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help      Afficher cette aide
    -d, --dry-run   Mode simulation (pas de modifications)
    -f, --force     Forcer la migration même si des erreurs sont détectées
    --backup-dir    Répertoire pour les backups (défaut: backup_YYYYMMDD_HHMMSS)

EXEMPLES:
    $0                    # Migration normale
    $0 --dry-run         # Simulation
    $0 --force           # Forcer la migration
EOF
}

# Parse des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Vérifications préliminaires
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier qu'on est dans un projet md2googleslides
    if [[ ! -f "package.json" ]]; then
        log_error "package.json non trouvé. Êtes-vous dans le bon répertoire ?"
        exit 1
    fi
    
    # Vérifier le nom du projet
    if ! grep -q '"name".*"md2.*slides"' package.json; then
        log_warning "Ce ne semble pas être un projet md2googleslides"
        if [[ "$FORCE" != true ]]; then
            read -p "Continuer quand même ? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    # Vérifier les outils nécessaires
    local tools=("node" "npm" "docker" "git")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool n'est pas installé"
            exit 1
        fi
    done
    
    log_success "Prérequis vérifiés"
}

# Créer un backup complet
create_backup() {
    log_info "Création du backup dans $BACKUP_DIR..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Backup créé dans $BACKUP_DIR"
        return
    fi
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup des fichiers importants
    local files_to_backup=(
        "package.json"
        "package-lock.json"
        "yarn.lock"
        "tsconfig.json"
        ".babelrc"
        "docker-compose.yml"
        "Dockerfile"
        "Makefile"
    )
    
    for file in "${files_to_backup[@]}"; do
        if [[ -f "$file" ]]; then
            cp "$file" "$BACKUP_DIR/" 2>/dev/null || true
        fi
    done
    
    log_success "Backup créé dans $BACKUP_DIR"
}

# Analyser l'état actuel
analyze_current_state() {
    log_info "Analyse de l'état actuel..."
    
    # Version actuelle
    local current_version=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
    log_info "Version actuelle: $current_version"
    
    # Vérifier les dépendances problématiques
    local problematic_deps=()
    
    if grep -q '"babel-polyfill"' package.json; then
        problematic_deps+=("babel-polyfill (obsolète)")
    fi
    
    if grep -q '"request"' package.json; then
        problematic_deps+=("request (déprécié)")
    fi
    
    if grep -q '"request-promise-native"' package.json; then
        problematic_deps+=("request-promise-native (déprécié)")
    fi
    
    if [[ ${#problematic_deps[@]} -gt 0 ]]; then
        log_warning "Dépendances problématiques détectées:"
        for dep in "${problematic_deps[@]}"; do
            log_warning "  - $dep"
        done
    fi
    
    # Vérifier l'état de compilation
    if [[ -d "lib" ]]; then
        log_info "Répertoire lib/ existant détecté"
    fi
    
    # Vérifier Docker
    if [[ -f "Dockerfile" ]]; then
        log_info "Dockerfile existant détecté"
    else
        log_warning "Aucun Dockerfile trouvé"
    fi
}

# Télécharger les nouveaux fichiers depuis GitHub
download_updates() {
    log_info "Téléchargement des fichiers mis à jour..."
    
    local base_url="https://raw.githubusercontent.com/pmboutet/md2googleslides/main"
    local files_to_download=(
        "package.json"
        "Dockerfile"
        ".dockerignore"
        "docker-compose.yml"
        "Makefile"
        "scripts/test.sh"
    )
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Téléchargement des fichiers depuis GitHub"
        return
    fi
    
    for file in "${files_to_download[@]}"; do
        log_info "Téléchargement de $file..."
        if curl -sSL "$base_url/$file" -o "$file" 2>/dev/null; then
            log_success "✓ $file téléchargé"
        else
            log_warning "✗ Impossible de télécharger $file"
        fi
    done
}

# Installation et test
install_and_test() {
    log_info "Installation des nouvelles dépendances..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Installation des dépendances"
        log_info "[DRY-RUN] Compilation TypeScript"
        log_info "[DRY-RUN] Tests"
        return
    fi
    
    # Nettoyer l'ancien node_modules
    if [[ -d "node_modules" ]]; then
        log_info "Suppression de l'ancien node_modules..."
        rm -rf node_modules
    fi
    
    if [[ -f "package-lock.json" ]]; then
        rm package-lock.json
    fi
    
    # Installation
    npm install
    
    # Compilation
    log_info "Compilation du projet..."
    npm run compile
    
    # Tests basiques
    log_info "Tests basiques..."
    if npm test; then
        log_success "Tests réussis"
    else
        log_warning "Tests échoués - vérification manuelle recommandée"
    fi
}

# Post-migration
post_migration() {
    log_info "Finalisation de la migration..."
    
    # Rendre les scripts exécutables
    if [[ -f "scripts/test.sh" ]]; then
        chmod +x scripts/test.sh
    fi
    
    if [[ -f "Makefile" ]]; then
        chmod +x Makefile
    fi
    
    # Conseils post-migration
    cat << EOF

🎉 Migration terminée avec succès !

📋 Étapes suivantes recommandées :

1. Vérifiez que tout fonctionne :
   make test

2. Construisez l'image Docker :
   make docker-build

3. Testez avec Docker :
   make docker-test

4. Commitez les changements :
   git add .
   git commit -m "Mise à jour des dépendances et dockerisation"

5. Configurez vos credentials Google si nécessaire :
   mkdir -p ~/.md2googleslides
   cp /path/to/client_id.json ~/.md2googleslides/

📁 Backup créé dans : $BACKUP_DIR

⚠️  En cas de problème, vous pouvez restaurer :
   cp $BACKUP_DIR/package.json .
   npm install

EOF
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Migration simulée terminée"
    fi
}

# Fonction principale
main() {
    log_info "🚀 Début de la migration md2googleslides"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_warning "Mode simulation activé - aucune modification ne sera effectuée"
    fi
    
    check_prerequisites
    analyze_current_state
    create_backup
    download_updates
    install_and_test
    post_migration
    
    log_success "✅ Migration terminée !"
}

# Gestion des erreurs
trap 'log_error "Migration échouée à la ligne $LINENO"; exit 1' ERR

# Lancement
main "$@"