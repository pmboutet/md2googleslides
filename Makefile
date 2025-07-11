# Makefile pour md2googleslides
.PHONY: help install build test clean docker-build docker-test docker-run lint fix

# Variables
IMAGE_NAME := md2googleslides
TAG := latest
CONTAINER_NAME := md2googleslides

# Aide par défaut
help:
	@echo "Commands disponibles:"
	@echo "  install      - Installer les dépendances npm"
	@echo "  build        - Compiler le projet TypeScript"
	@echo "  test         - Lancer tous les tests"
	@echo "  test-unit    - Lancer uniquement les tests unitaires"
	@echo "  test-docker  - Lancer les tests Docker"
	@echo "  lint         - Vérifier le style de code"
	@echo "  fix          - Corriger automatiquement le style"
	@echo "  clean        - Nettoyer les fichiers de build"
	@echo "  docker-build - Construire l'image Docker"
	@echo "  docker-test  - Tester l'image Docker"
	@echo "  docker-run   - Lancer le container interactif"
	@echo "  docker-push  - Pousser l'image vers le registry"
	@echo "  security     - Lancer les tests de sécurité"
	@echo "  all          - Tout construire et tester"

# Installation des dépendances
install:
	@echo "Installation des dépendances..."
	npm install

# Compilation
build:
	@echo "Compilation du projet..."
	npm run clean
	npm run compile

# Tests complets
test:
	@echo "Lancement de tous les tests..."
	chmod +x scripts/test.sh
	./scripts/test.sh

# Tests unitaires seulement
test-unit:
	@echo "Tests unitaires..."
	npm test

# Tests Docker seulement
test-docker:
	@echo "Tests Docker..."
	chmod +x scripts/test.sh
	./scripts/test.sh --docker-only

# Linting
lint:
	@echo "Vérification du style de code..."
	npm run lint

# Correction automatique
fix:
	@echo "Correction automatique du style..."
	npm run fix

# Nettoyage
clean:
	@echo "Nettoyage..."
	npm run clean
	rm -rf node_modules
	docker rmi $(IMAGE_NAME):$(TAG) 2>/dev/null || true
	docker rmi $(IMAGE_NAME):test 2>/dev/null || true

# Construction Docker
docker-build:
	@echo "Construction de l'image Docker..."
	docker build -t $(IMAGE_NAME):$(TAG) .

# Test Docker
docker-test: docker-build
	@echo "Test de l'image Docker..."
	docker run --rm $(IMAGE_NAME):$(TAG) --help

# Lancement interactif
docker-run: docker-build
	@echo "Lancement du container interactif..."
	docker run --rm -it \
		-v $(PWD):/workspace \
		-v ~/.md2googleslides:/home/md2gslides/.md2googleslides \
		$(IMAGE_NAME):$(TAG) /bin/sh

# Push vers registry (à adapter selon votre registry)
docker-push: docker-build
	@echo "Push de l'image..."
	@echo "Attention: Configurez d'abord votre registry dans ce Makefile"
	# docker tag $(IMAGE_NAME):$(TAG) your-registry.com/$(IMAGE_NAME):$(TAG)
	# docker push your-registry.com/$(IMAGE_NAME):$(TAG)

# Tests de sécurité
security:
	@echo "Tests de sécurité..."
	npm audit --audit-level=high
	@if command -v trivy >/dev/null 2>&1; then \
		echo "Scan Trivy..."; \
		trivy image $(IMAGE_NAME):$(TAG); \
	else \
		echo "Trivy non installé, scan ignoré"; \
	fi

# Construction et tests complets
all: install build test docker-build docker-test security
	@echo "✅ Construction et tests terminés avec succès!"

# Développement rapide
dev: install build
	@echo "Prêt pour le développement"
	@echo "Utilisez 'npm run exec' pour tester rapidement"

# Préparation pour production
prod: clean install build test docker-build security
	@echo "✅ Prêt pour la production!"

# CI/CD Pipeline simulation
ci: install build test-unit lint security docker-build docker-test
	@echo "✅ Pipeline CI/CD simulé avec succès!"

# Commandes Docker Compose
compose-up:
	docker-compose up -d

compose-down:
	docker-compose down

compose-logs:
	docker-compose logs -f

compose-test:
	docker-compose --profile test up --build md2googleslides-test

# Utilitaires de développement
watch:
	@echo "Mode watch pour le développement..."
	npm run compile -- --watch

debug:
	@echo "Mode debug..."
	npm run test-debug

# Métriques et monitoring
metrics:
	@echo "Taille de l'image Docker:"
	@docker images $(IMAGE_NAME):$(TAG) --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
	@echo ""
	@echo "Vulnérabilités npm:"
	@npm audit --audit-level=moderate --json | jq '.metadata.vulnerabilities // empty'

# Nettoyage Docker complet
docker-clean:
	@echo "Nettoyage Docker complet..."
	docker system prune -f
	docker rmi $(shell docker images $(IMAGE_NAME) -q) 2>/dev/null || true

# Vérification de l'environnement
check-env:
	@echo "Vérification de l'environnement..."
	@node --version
	@npm --version
	@docker --version
	@echo "✅ Environnement OK"