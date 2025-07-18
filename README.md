# md2googleslides

Generate Google Slides from markdown & HTML. Run from the command line or embed in another application.

🚀 **Version 0.5.3** - Mise à jour majeure avec support Docker et dépendances sécurisées !

## ✨ Nouveautés de cette version

- 🔐 **Sécurité renforcée** : Suppression des dépendances obsolètes et vulnérables
- 🐳 **Support Docker complet** : Dockerfile optimisé et Docker Compose
- 🏗️ **CI/CD intégré** : GitHub Actions pour tests automatisés
- 🛠️ **Outils de développement** : Makefile, scripts de test automatisés
- 📦 **Dépendances modernes** : Node.js 18+, dernières versions des packages

## 🚀 Installation rapide

### Option 1: Utilisation avec Docker (Recommandé)

```bash
# Cloner le repository
git clone https://github.com/pmboutet/md2googleslides.git
cd md2googleslides

# Construire et tester
make docker-build
make docker-test

# Utilisation
docker run --rm -v $(pwd):/workspace md2googleslides:latest /workspace/slides.md --title "Ma Présentation"
```

### Option 2: Installation locale

```bash
# Prérequis: Node.js 18+
npm install -g md2gslides

# Utilisation
md2gslides slides.md --title "Ma Présentation"
```

### Option 3: Migration depuis une ancienne version

```bash
# Dans votre projet existant
curl -sSL https://raw.githubusercontent.com/pmboutet/md2googleslides/main/scripts/migrate.sh | bash

# Ou en mode simulation d'abord
curl -sSL https://raw.githubusercontent.com/pmboutet/md2googleslides/main/scripts/migrate.sh | bash -s -- --dry-run
```

## 🔧 Configuration Google

1. Créez un projet sur [Google Cloud Console](https://console.developers.google.com)
2. Activez l'API Google Slides
3. Créez des credentials OAuth 2.0 pour "Application web"
   - Ajoutez `http://localhost` aux **URI de redirection autorisées**
4. Téléchargez le fichier JSON et sauvegardez-le comme `~/.md2googleslides/client_id.json`
5. Lors de la première utilisation, ouvrez l'URL fournie et copiez le paramètre
   `code` affiché dans la barre d'adresse puis collez‑le lorsque le programme
   le demande

```bash
mkdir -p ~/.md2googleslides
cp /path/to/downloaded/credentials.json ~/.md2googleslides/client_id.json
chmod 600 ~/.md2googleslides/client_id.json
```

## 🐳 Utilisation avec Docker

### Docker simple
```bash
# Construction
docker build -t md2googleslides .

# Utilisation avec credentials
docker run --rm \
  -v $(pwd):/workspace \
  -v ~/.md2googleslides:/home/md2gslides/.md2googleslides \
  md2googleslides \
  /workspace/presentation.md --title "Ma Présentation"
```

### Docker Compose
```bash
# Démarrage du service
docker-compose up md2googleslides

# Avec fichier spécifique
docker-compose run --rm md2googleslides /workspace/slides.md --title "Test"
```

## 🛠️ Développement

### Prérequis
- Node.js 18 ou supérieur
- Docker (optionnel)
- Make (optionnel, pour les raccourcis)

### Installation développement
```bash
git clone https://github.com/pmboutet/md2googleslides.git
cd md2googleslides

# Avec Make (recommandé)
make install
make build
make test

# Ou manuellement
npm install
npm run compile
npm test
```

### Commandes utiles
```bash
make help              # Voir toutes les commandes
make all               # Build complet + tests
make docker-build      # Construire l'image Docker
make test-docker       # Tests Docker uniquement
make security          # Audit de sécurité
make ci                # Pipeline CI/CD local
```

### Rebuild rapide
Après avoir mis à jour les dépendances, recompilez le projet avec :

```bash
npm install
npm run compile
```

## 📝 Syntaxe Markdown supportée

### Slides de base
```markdown
# Titre de la présentation
## Sous-titre

---

## Slide suivante
Contenu de la slide

---

## Points importants
- Point 1
- Point 2
- Point 3
```

### Layouts spéciaux
```markdown
# Grand titre {.big}

---

# Deux colonnes

Contenu gauche

{.column}

Contenu droite

---

# Image de fond
![](https://example.com/image.jpg){.background}
```

### Code avec coloration syntaxique
````markdown
```javascript
function hello() {
    console.log("Hello World!");
}
```
````

### Vidéos YouTube
```markdown
@[youtube](VIDEO_ID)
```

## 🔍 Tests et validation

### Tests automatisés
```bash
# Tests complets
./scripts/test.sh

# Tests Docker uniquement
./scripts/test.sh --docker-only

# Tests avec Make
make test
make test-docker
```

### Tests manuels
```bash
# Créer un fichier de test
echo -e "# Test\n---\n## Slide 1\nContenu test" > test.md

# Test avec Node.js
node bin/md2gslides.js test.md --title "Test" --dry-run

# Test avec Docker
docker run --rm -v $(pwd):/workspace md2googleslides:latest \
  /workspace/test.md --title "Test Docker" --dry-run
```

## 🔒 Sécurité

Cette version corrige plusieurs vulnérabilités de sécurité :

- ✅ Suppression de `request` et `request-promise-native` (dépréciés)
- ✅ Remplacement de `babel-polyfill` par `core-js`
- ✅ Mise à jour de toutes les dépendances vers les dernières versions
- ✅ Utilisateur non-root dans Docker
- ✅ Scan automatique des vulnérabilités en CI/CD

### Audit de sécurité
```bash
npm audit
make security
trivy image md2googleslides:latest
```

## 📊 Monitoring et métriques

```bash
# Taille de l'image Docker
make metrics

# Logs en temps réel (Docker Compose)
docker-compose logs -f

# Statistiques d'utilisation
docker stats md2googleslides
```

## 🚨 Résolution de problèmes

### Problèmes courants

**1. Erreur de compilation TypeScript**
```bash
make clean
make install
make build
```

**2. Problèmes Docker permissions**
```bash
chmod 600 ~/.md2googleslides/client_id.json
docker build --no-cache -t md2googleslides .
```

**3. Erreurs credentials Google**
```bash
# Vérifier le fichier
cat ~/.md2googleslides/client_id.json

# Vérifier les permissions
ls -la ~/.md2googleslides/
```

### Mode debug
```bash
# Debug Node.js
DEBUG=* node bin/md2gslides.js slides.md

# Debug Docker
docker run --rm -it --entrypoint /bin/sh md2googleslides:latest
```

## 📈 Performance

### Optimisations intégrées
- 🏗️ Build multi-stage Docker pour réduire la taille
- 📦 Cache des dépendances npm
- 🚀 Image Alpine Linux légère
- 💾 Limitation mémoire configurée (2GB par défaut)

### Métriques de performance
```bash
# Temps de compilation
time npm run compile

# Taille de l'image finale
docker images md2googleslides:latest

# Test de charge
for i in {1..10}; do time docker run --rm -v $(pwd):/workspace md2googleslides:latest /workspace/test.md --dry-run; done
```

## 🔄 Migration depuis l'ancienne version

### Migration automatique
```bash
# Script de migration complet
curl -sSL https://raw.githubusercontent.com/pmboutet/md2googleslides/main/scripts/migrate.sh -o migrate.sh
chmod +x migrate.sh

# Test en mode simulation
./migrate.sh --dry-run

# Migration effective
./migrate.sh
```

### Migration manuelle
1. **Backup de votre configuration actuelle**
```bash
cp package.json package.json.backup
cp -r node_modules node_modules.backup 2>/dev/null || true
```

2. **Mise à jour des fichiers**
```bash
# Remplacer package.json avec la nouvelle version
# Créer Dockerfile, docker-compose.yml, Makefile
# Créer les scripts dans scripts/
```

3. **Installation et test**
```bash
rm -rf node_modules package-lock.json
npm install
npm run compile
npm test
```

## 🌐 Déploiement

### Déploiement Docker simple
```bash
# Production
docker run -d \
  --name md2googleslides-prod \
  --restart unless-stopped \
  -v /data/workspace:/workspace \
  -v /data/credentials:/home/md2gslides/.md2googleslides \
  md2googleslides:latest
```

### Déploiement Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: md2googleslides
spec:
  replicas: 2
  selector:
    matchLabels:
      app: md2googleslides
  template:
    metadata:
      labels:
        app: md2googleslides
    spec:
      containers:
      - name: md2googleslides
        image: ghcr.io/pmboutet/md2googleslides:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Déploiement avec CI/CD
Le pipeline GitHub Actions se déclenche automatiquement sur :
- Push sur `main` → Build et tests
- Pull Request → Tests complets
- Release → Déploiement en production

## 🔗 Intégration avec d'autres outils

### API REST (exemple)
```javascript
const express = require('express');
const { execSync } = require('child_process');

app.post('/convert', (req, res) => {
  const markdown = req.body.markdown;
  const title = req.body.title || 'Presentation';
  
  // Sauvegarder le markdown
  fs.writeFileSync('/tmp/input.md', markdown);
  
  // Convertir avec md2googleslides
  const result = execSync(`docker run --rm -v /tmp:/workspace md2googleslides:latest /workspace/input.md --title "${title}"`);
  
  res.json({ success: true, output: result.toString() });
});
```

### Slides Service Usage
You can run a lightweight HTTP service to convert Markdown directly to slides.

Example request:
```bash
curl -X POST http://localhost:3000/convert-text \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Title","title":"Demo"}'
```

Response:
```json
{
  "presentation_id": "<id>",
  "presentation_url": "https://docs.example.com/presentation/d/<id>"
}
```

### Webhook GitHub
```bash
# Conversion automatique lors de push
curl -X POST https://api.github.com/repos/user/repo/hooks \
  -H "Authorization: token YOUR_TOKEN" \
  -d '{
    "name": "web",
    "active": true,
    "events": ["push"],
    "config": {
      "url": "https://your-server.com/webhook/md2slides",
      "content_type": "json"
    }
  }'
```

## 📚 Ressources et documentation

### Documentation complète
- [Guide d'installation détaillé](docs/installation.md)
- [Référence de la syntaxe Markdown](docs/markdown-syntax.md)
- [Configuration avancée](docs/advanced-config.md)
- [Guide de déploiement](docs/deployment.md)

### Support et communauté
- 🐛 [Issues GitHub](https://github.com/pmboutet/md2googleslides/issues)
- 💬 [Discussions](https://github.com/pmboutet/md2googleslides/discussions)
- 📖 [Wiki](https://github.com/pmboutet/md2googleslides/wiki)

### Changelog
Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique complet des versions.

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les détails.

### Processus de contribution
1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commiter les changements (`git commit -m 'Add AmazingFeature'`)
4. Pousser vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Tests locaux
```bash
# Avant de proposer une PR
make ci
make test
make security
```

## 📄 Licence

Ce projet est sous licence Apache 2.0. Voir [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [Steven Bazyl](https://github.com/sqrrrl) - Auteur original
- [Google Workspace](https://github.com/googleworkspace) - Repository officiel
- Tous les [contributeurs](https://github.com/pmboutet/md2googleslides/graphs/contributors)

---

**⭐ Si ce projet vous aide, n'hésitez pas à lui donner une étoile !**