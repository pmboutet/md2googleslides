# Makefile pour md2googleslides
.PHONY: help install build test clean docker-build docker-test docker-run lint fix security all ci

# Variables
IMAGE_NAME := md2googleslides
TAG := latest
CONTAINER_NAME := md2googleslides
NODE_VERSION := $(shell node --version 2>/dev/null || echo "Not installed")

# Aide par défaut
help:
	@echo "🚀 md2googleslides - Commandes disponibles:"
	@echo ""
	@echo "  📦 install        - Installer les dépendances npm"
	@echo "  🔨 build          - Compiler le projet TypeScript"
	@echo "  🧪 test           - Lancer tous les tests"
	@echo "  🧪 test-unit      - Lancer uniquement les tests unitaires"
	@echo "  🐳 test-docker    - Lancer les tests Docker"
	@echo "  🔍 lint           - Vérifier le style de code"
	@echo "  🔧 fix            - Corriger automatiquement le style"
	@echo "  🧹 clean          - Nettoyer les fichiers de build"
	@echo "  🐳 docker-build   - Construire l'image Docker"
	@echo "  🐳 docker-test    - Tester l'image Docker"
	@echo "  🐳 docker-run     - Lancer le conteneur interactif"
	@echo "  📤 docker-push    - Pousser l'image vers le registry"
	@echo "  🔒 security       - Lancer les tests de sécurité"
	@echo "  🎯 ci             - Pipeline CI/CD simulé"
	@echo "  ⚡ all            - Tout construire et tester"
	@echo ""
	@echo "📋 Environnement actuel:"
	@echo "  Node.js: $(NODE_VERSION)"
	@echo "  Docker: $(shell docker --version 2>/dev/null || echo 'Non installé')"

# Installation des dépendances
install:
	@echo "📦 Installation des dépendances..."
	@if [ ! -f package-lock.json ]; then \
		echo "⚠️  Pas de package-lock.json, exécution de npm install"; \
		npm install; \
	else \
		npm ci; \
	fi
	@echo "✅ Dépendances installées"

# Compilation
build: install
	@echo "🔨 Compilation du projet..."
	@npm run clean || true
	@npm run compile
	@echo "✅ Build terminé"

# Tests complets
test: build
	@echo "🧪 Lancement de tous les tests..."
	@chmod +x scripts/test.sh
	@./scripts/test.sh
	@echo "✅ Tests terminés"

# Tests unitaires seulement
test-unit: build
	@echo "🧪 Tests unitaires..."
	@npm test
	@echo "✅ Tests unitaires terminés"

# Tests Docker seulement
test-docker: docker-build
	@echo "🐳 Tests Docker..."
	@chmod +x scripts/test-docker.sh
	@./scripts/test-docker.sh
	@echo "✅ Tests Docker terminés"

# Linting
lint: install
	@echo "🔍 Vérification du style de code..."
	@npm run lint
	@echo "✅ Linting terminé"

# Correction automatique
fix: install
	@echo "🔧 Correction automatique du style..."
	@npm run fix
	@echo "✅ Corrections appliquées"

# Nettoyage
clean:
	@echo "🧹 Nettoyage..."
	@npm run clean || true
	@rm -rf node_modules package-lock.json || true
	@docker rmi $(IMAGE_NAME):$(TAG) 2>/dev/null || true
	@docker rmi $(IMAGE_NAME):test 2>/dev/null || true
	@echo "✅ Nettoyage terminé"

# Construction Docker
docker-build:
	@echo "🐳 Construction de l'image Docker..."
	@docker build -t $(IMAGE_NAME):$(TAG) .
	@echo "✅ Image Docker construite: $(IMAGE_NAME):$(TAG)"

# Test Docker
docker-test: docker-build
	@echo "🐳 Test de l'image Docker..."
	@docker run --rm $(IMAGE_NAME):$(TAG) --help
	@echo "✅ Test Docker réussi"

# Lancement interactif
docker-run: docker-build
	@echo "🐳 Lancement du conteneur interactif..."
	@docker run --rm -it \
		-v $(PWD):/workspace \
		-v ~/.md2googleslides:/home/md2gslides/.md2googleslides \
		$(IMAGE_NAME):$(TAG) /bin/sh

# Push vers registry (à adapter selon votre registry)
docker-push: docker-build
	@echo "📤 Push de l'image..."
	@echo "⚠️  Attention: Configurez d'abord votre registry dans ce Makefile"
	# docker tag $(IMAGE_NAME):$(TAG) your-registry.com/$(IMAGE_NAME):$(TAG)
	# docker push your-registry.com/$(IMAGE_NAME):$(TAG)

# Tests de sécurité
security:
	@echo "🔒 Tests de sécurité..."
	@npm audit --audit-level=moderate || echo "⚠️  Vulnérabilités détectées"
	@if command -v trivy >/dev/null 2>&1; then \
		echo "🔍 Scan Trivy..."; \
		trivy image $(IMAGE_NAME):$(TAG); \
	else \
		echo "ℹ️  Trivy non installé, scan ignoré"; \
	fi
	@echo "✅ Audit de sécurité terminé"

# Pipeline CI/CD simulé
ci: clean install build test-unit lint security docker-build docker-test
	@echo "🎯 Pipeline CI/CD simulé avec succès!"

# Construction et tests complets
all: ci
	@echo "⚡ Construction et tests complets terminés!"

# Commandes Docker Compose
compose-up:
	@docker-compose up -d

compose-down:
	@docker-compose down

compose-logs:
	@docker-compose logs -f

compose-test:
	@docker-compose --profile test up --build md2googleslides-test

# Utilitaires de développement
watch:
	@echo "👀 Mode watch pour le développement..."
	@npm run compile -- --watch

debug:
	@echo "🐛 Mode debug..."
	@npm run test-debug

# Métriques et monitoring
metrics:
	@echo "📊 Métriques de l'image Docker:"
	@docker images $(IMAGE_NAME):$(TAG) --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
	@echo ""
	@echo "🔒 Vulnérabilités npm:"
	@npm audit --audit-level=moderate --json 2>/dev/null | jq '.metadata.vulnerabilities // empty' || echo "Aucune vulnérabilité détectée"

# Nettoyage Docker complet
docker-clean:
	@echo "🧹 Nettoyage Docker complet..."
	@docker system prune -f
	@docker rmi $(shell docker images $(IMAGE_NAME) -q) 2>/dev/null || true
	@echo "✅ Nettoyage Docker terminé"

# Vérification de l'environnement
check-env:
	@echo "🔍 Vérification de l'environnement..."
	@echo "Node.js: $(shell node --version 2>/dev/null || echo 'Non installé')"
	@echo "npm: $(shell npm --version 2>/dev/null || echo 'Non installé')"
	@echo "Docker: $(shell docker --version 2>/dev/null || echo 'Non installé')"
	@echo "Make: $(shell make --version 2>/dev/null | head -1 || echo 'Non installé')"
	@echo "✅ Environnement vérifié"

# Développement rapide
dev: install build
	@echo "⚡ Prêt pour le développement"
	@echo "Utilisez 'npm run exec' pour tester rapidement"

# Préparation pour production
prod: clean install build test docker-build security
	@echo "🚀 Prêt pour la production!"

# Test de performance simple
perf-test: docker-build
	@echo "⏱️  Test de performance basique..."
	@echo "# Test Markdown" > /tmp/perf-test.md
	@echo "## Slide 1" >> /tmp/perf-test.md
	@echo "Content test" >> /tmp/perf-test.md
	@time docker run --rm -v /tmp:/workspace $(IMAGE_NAME):$(TAG) \
		/workspace/perf-test.md --title "Perf Test" --dry-run
	@echo "✅ Test de performance terminé"
