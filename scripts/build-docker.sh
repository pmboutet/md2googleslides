#!/bin/bash

# Script de build et test Docker pour md2googleslides
set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
IMAGE_NAME="md2googleslides"
VERSION=$(grep '"version"' package.json | cut -d '"' -f 4)
DOCKERFILE="Dockerfile"

echo -e "${YELLOW}🚀 Build Docker pour md2googleslides v${VERSION}${NC}"

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

# Nettoyer les images existantes (optionnel)
echo -e "${YELLOW}🧹 Nettoyage des images existantes...${NC}"
docker rmi "${IMAGE_NAME}:${VERSION}" "${IMAGE_NAME}:latest" 2>/dev/null || true

# Build de l'image Docker
echo -e "${YELLOW}🔨 Construction de l'image Docker...${NC}"
docker build \
    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    --build-arg VCS_REF=$(git rev-parse --short HEAD) \
    --build-arg VERSION=${VERSION} \
    -t "${IMAGE_NAME}:${VERSION}" \
    -t "${IMAGE_NAME}:latest" \
    -f ${DOCKERFILE} \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Image Docker construite avec succès${NC}"
else
    echo -e "${RED}❌ Échec de la construction Docker${NC}"
    exit 1
fi

# Test basique de l'image
echo -e "${YELLOW}🧪 Test de l'image Docker...${NC}"
docker run --rm "${IMAGE_NAME}:latest" --version 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test de l'image réussi${NC}"
else
    echo -e "${RED}❌ Test de l'image échoué${NC}"
    exit 1
fi

# Afficher la taille de l'image
echo -e "${YELLOW}📊 Taille de l'image:${NC}"
docker images "${IMAGE_NAME}:latest" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo -e "${GREEN}🎉 Build Docker terminé avec succès!${NC}"
echo -e "${YELLOW}💡 Pour utiliser l'image:${NC}"
echo -e "   docker run --rm -v \$(pwd):/workspace ${IMAGE_NAME}:latest input.md"
echo -e "${YELLOW}💡 Pour obtenir de l'aide:${NC}"
echo -e "   docker run --rm ${IMAGE_NAME}:latest --help"
