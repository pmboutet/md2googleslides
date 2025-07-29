# Makefile pour md2googleslides
.PHONY: help install build clean docker-build docker-run security all

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
	@echo "  🧹 clean          - Nettoyer les fichiers de build"
	@echo "  🐳 docker-build   - Construire l'image Docker"
	@echo "  🐳 docker-run     - Lancer le conteneur interactif"
	@echo "  📤 docker-push    - Pousser l'image vers le registry"
	@echo "  🔒 security       - Lancer les tests de sécurité"
	@echo "  ⚡ all            - Tout construire"
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
	@npm run compile
	@echo "✅ Build terminé"

# Nettoyage
clean:
	@echo "🧹 Nettoyage..."
	@rm -rf node_modules package-lock.json || true
	@docker rmi $(IMAGE_NAME):$(TAG) 2>/dev/null || true
	@docker rmi $(IMAGE_NAME):test 2>/dev/null || true
	@echo "✅ Nettoyage terminé"

# Construction Docker
docker-build:
	@echo "🐳 Construction de l'image Docker..."
	@docker build -t $(IMAGE_NAME):$(TAG) .
	@echo "✅ Image Docker construite: $(IMAGE_NAME):$(TAG)"

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

# Construction complète
all: clean install build docker-build security
	@echo "⚡ Construction complète terminée!"

# Commandes Docker Compose
compose-up:
	@docker-compose up -d

compose-down:
	@docker-compose down

compose-logs:
	@docker-compose logs -f

# Utilitaires de développement
watch:
	@echo "👀 Mode watch pour le développement..."
	@npm run compile -- --watch

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
prod: clean install build docker-build security
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
