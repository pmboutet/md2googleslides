#!/bin/bash

# Robust setup script for md2googleslides development
set -e

echo "🔧 Setting up md2googleslides development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to check and fix package-lock.json
fix_package_lock() {
    log_info "Checking package-lock.json consistency..."
    
    # Try npm ci first
    if npm ci --ignore-scripts &> /dev/null; then
        log_success "package-lock.json is consistent"
        return 0
    fi
    
    log_warning "package-lock.json is out of sync. Regenerating..."
    
    # Backup existing lockfile
    if [ -f "package-lock.json" ]; then
        cp package-lock.json package-lock.json.backup
        log_info "Backed up existing package-lock.json"
    fi
    
    # Remove lockfile and reinstall
    rm -f package-lock.json
    npm install --no-optional
    
    log_success "Generated new package-lock.json"
}

# Function to setup development environment
setup_dev_environment() {
    log_info "Setting up development environment..."
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    log_info "Node.js version: $NODE_VERSION"
    
    # Install/update dependencies
    fix_package_lock
    
    # Run TypeScript compilation
    if npm run compile; then
        log_success "TypeScript compilation successful"
    else
        log_warning "TypeScript compilation failed (may be optional)"
    fi
    
    # Create necessary directories
    mkdir -p scripts tmp uploads shared
    
    log_success "Development environment ready"
}

# Function to setup production environment
setup_production_environment() {
    log_info "Setting up production environment..."
    
    # Install only production dependencies
    npm ci --omit=dev --ignore-scripts
    
    # Ensure server.js exists
    if [ ! -f "server.js" ]; then
        log_error "server.js not found!"
        exit 1
    fi
    
    # Create runtime directories
    mkdir -p /tmp/uploads shared
    
    log_success "Production environment ready"
}

# Function to validate setup
validate_setup() {
    log_info "Validating setup..."
    
    local errors=0
    
    # Check required files
    for file in "server.js" "package.json" "bin/md2gslides.js"; do
        if [ -f "$file" ]; then
            log_success "✅ $file found"
        else
            log_error "❌ $file missing"
            ((errors++))
        fi
    done
    
    # Check if we can start the server (dry run)
    if node -c server.js; then
        log_success "✅ server.js syntax valid"
    else
        log_error "❌ server.js has syntax errors"
        ((errors++))
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "🎉 Setup validation passed!"
        return 0
    else
        log_error "❌ Setup validation failed ($errors errors)"
        return 1
    fi
}

# Main execution
main() {
    case "${1:-dev}" in
        "dev")
            setup_dev_environment
            ;;
        "prod")
            setup_production_environment
            ;;
        "validate")
            validate_setup
            ;;
        "fix-lock")
            fix_package_lock
            ;;
        *)
            echo "Usage: $0 [dev|prod|validate|fix-lock]"
            echo "  dev      - Setup development environment (default)"
            echo "  prod     - Setup production environment"
            echo "  validate - Validate current setup"
            echo "  fix-lock - Fix package-lock.json only"
            exit 1
            ;;
    esac
    
    # Always validate at the end unless it's just fixing lockfile
    if [ "$1" != "fix-lock" ] && [ "$1" != "validate" ]; then
        echo
        validate_setup
    fi
}

main "$@"