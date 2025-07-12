# Docker Deployment Guide

Ce guide explique comment déployer et utiliser md2googleslides avec Docker.

## 🚀 Démarrage rapide

### Utilisation avec Docker

```bash
# Construire l'image
docker build -t md2googleslides .

# Utiliser l'application
docker run --rm -v $(pwd):/workspace md2googleslides input.md
```

### Utilisation avec Docker Compose

```bash
# Build et lancement
docker-compose up --build

# Utilisation en mode interactif
docker-compose run --rm md2googleslides input.md

# Pour le développement
docker-compose --profile dev up

# Pour les tests
docker-compose --profile test up
```

## 📁 Structure des volumes

L'image Docker utilise plusieurs points de montage :

- `/workspace` : Répertoire de travail pour vos fichiers Markdown et de sortie
- `/home/md2gslides/.md2googleslides` : Credentials Google API

## 🔧 Configuration

### Variables d'environnement

- `NODE_ENV` : Environnement d'exécution (production, development, test)
- `NODE_OPTIONS` : Options Node.js (par défaut : `--max-old-space-size=2048`)

### Authentification Google

Pour utiliser l'API Google Slides, vous devez :

1. Créer un projet dans Google Cloud Console
2. Activer l'API Google Slides
3. Créer des credentials (OAuth 2.0 ou Service Account)
4. Monter le fichier de credentials dans le container

```bash
# Avec credentials OAuth
docker run --rm \
  -v $(pwd):/workspace \
  -v ~/.md2googleslides:/home/md2gslides/.md2googleslides:ro \
  md2googleslides input.md
```

## 🛠️ Scripts utilitaires

### Build automatisé

Utilisez le script de build fourni :

```bash
chmod +x scripts/build-docker.sh
./scripts/build-docker.sh
```

Ce script :
- Construit l'image Docker
- Effectue des tests basiques
- Affiche la taille de l'image
- Fournit des exemples d'utilisation

## 📊 Optimisations

### Multi-stage build

Le Dockerfile utilise un build multi-étapes pour :
- Réduire la taille de l'image finale
- Séparer les dépendances de build et runtime
- Améliorer la sécurité

### Sécurité

- Utilisation d'un utilisateur non-root (`md2gslides`)
- Images Alpine minimales
- Séparation des stages de build et production

## 🐛 Dépannage

### Problèmes courants

1. **Erreur de permissions** : Vérifiez que l'utilisateur a les droits sur les volumes montés
2. **Manque de mémoire** : Augmentez `NODE_OPTIONS` ou les limites Docker
3. **Credentials manquants** : Vérifiez le montage du répertoire `.md2googleslides`

### Logs

```bash
# Voir les logs du container
docker logs md2googleslides

# Mode debug
docker run --rm -e DEBUG=* md2googleslides input.md
```

### Inspection de l'image

```bash
# Taille de l'image
docker images md2googleslides

# Inspection des layers
docker history md2googleslides

# Shell interactif
docker run --rm -it md2googleslides sh
```

## 🧪 Tests

### Tests unitaires

```bash
# Via Docker Compose
docker-compose --profile test up

# Via Docker directement
docker run --rm md2googleslides npm test
```

### Tests d'intégration

```bash
# Test avec un fichier exemple
echo "# Test\nHello World" > test.md
docker run --rm -v $(pwd):/workspace md2googleslides test.md
```

## 📈 Monitoring et Performance

### Limites de ressources

Le docker-compose.yml inclut des limites par défaut :
- Mémoire : 1GB max, 512MB réservés
- CPU : 1.0 max, 0.5 réservé

Ajustez selon vos besoins :

```yaml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '2.0'
```

### Métriques

```bash
# Utilisation des ressources
docker stats md2googleslides

# Inspection du container
docker inspect md2googleslides
```

## 🔄 Mise à jour

Pour mettre à jour l'image :

```bash
# Rebuild sans cache
docker build --no-cache -t md2googleslides .

# Ou avec Docker Compose
docker-compose build --no-cache
```
