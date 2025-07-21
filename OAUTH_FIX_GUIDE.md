# OAuth Fix Deployment Guide

## 🚨 Problème résolu

Ce fix résout les erreurs OAuth récurrentes dans md2googleslides :
- ❌ `Error: No refresh token is set.`
- ❌ `Failed to exchange code for tokens: invalid_grant`
- ❌ `Discovery error: Error: No refresh token is set.`

## 🔧 Solutions appliquées

### 1. Améliorations du code d'authentification (`src/auth.ts`)
- ✅ **Validation des tokens** avec timestamp pour détecter les tokens expirés
- ✅ **Force le consentement OAuth** (`prompt: 'consent'`) pour garantir l'obtention du refresh token
- ✅ **Retry automatique** en cas d'échec de refresh token
- ✅ **Suppression automatique** des tokens invalides
- ✅ **Messages d'erreur explicites** pour un meilleur diagnostic

### 2. Améliorations du serveur HTTP (`server.js`)
- ✅ **Écriture atomique** des credentials pour éviter la corruption
- ✅ **Validation des refresh tokens** avant utilisation
- ✅ **Gestionnaire de tokens automatique** pour la persistence
- ✅ **Messages d'erreur spécifiques** (invalid_grant, expired tokens)

### 3. Corrections Docker (`docker-compose.yml`, `Dockerfile`)
- ✅ **Suppression du flag `:ro`** sur le volume credentials
- ✅ **Permissions correctes** (755) pour lecture/écriture des tokens
- ✅ **Alignement des user IDs** (1001:1001) entre host et conteneur
- ✅ **Configuration des variables d'environnement** OAuth

## 🚀 Déploiement rapide

### Option 1: Script automatique (Recommandé)

```bash
# 1. Rendre le script exécutable
chmod +x scripts/deploy-oauth-fix.sh

# 2. Exécuter le déploiement automatique
./scripts/deploy-oauth-fix.sh
```

Le script va :
- ✅ Vérifier les prérequis (Docker, fichiers)
- ✅ Sauvegarder les tokens existants
- ✅ Rebuilder l'image avec les corrections
- ✅ Redéployer le service
- ✅ Tester le flux OAuth

### Option 2: Déploiement manuel

```bash
# 1. Préparer l'environnement
mkdir -p ./credentials
cp ~/.md2googleslides/client_id.json ./credentials/
chmod -R 755 ./credentials

# 2. Arrêter et rebuilder
docker-compose down md2googleslides
docker-compose build --no-cache md2googleslides

# 3. Redémarrer avec les corrections
docker-compose up -d md2googleslides

# 4. Vérifier le démarrage
curl http://localhost:3000/health
```

## 🩺 Diagnostic des problèmes

### Script de diagnostic automatique

```bash
# Rendre le script exécutable
chmod +x scripts/oauth-diagnostic.sh

# Exécuter le diagnostic complet
./scripts/oauth-diagnostic.sh
```

Le script de diagnostic vérifie :
- ✅ Validité des fichiers de configuration JSON
- ✅ Présence des refresh tokens
- ✅ Permissions sur l'hôte et dans le conteneur
- ✅ Fonctionnement du service HTTP
- ✅ Test du flux OAuth complet
- ✅ Configuration Google Cloud Console

### Diagnostic manuel

```bash
# 1. Vérifier que le service répond
curl http://localhost:3000/health

# 2. Tester le flux OAuth
curl -X POST http://localhost:3000/convert-text \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test OAuth","user":"test@example.com"}'

# 3. Vérifier les logs
docker-compose logs -f md2googleslides

# 4. Vérifier les permissions dans le conteneur
docker exec md2slides ls -la /home/md2gslides/.md2googleslides/
```

## 🔑 Configuration OAuth Google Cloud

Assurez-vous que dans **Google Cloud Console** :

### 1. APIs activées
- ✅ Google Slides API
- ✅ Google Drive API

### 2. Credentials OAuth 2.0
- ✅ **Type de client** : Application Web
- ✅ **URI de redirection autorisée** : 
  ```
  https://n8n-ivayh-u36210.vm.elestio.app/oauth/callback
  ```
- ✅ **Origines JavaScript autorisées** (optionnel) :
  ```
  http://localhost:3000
  ```

### 3. Fichier client_id.json
Téléchargez le fichier JSON depuis Google Cloud Console et placez-le dans :
```
./credentials/client_id.json
```

## 🧪 Test complet du flux OAuth

### 1. Première autorisation

```bash
# Déclencher l'autorisation
curl -X POST http://localhost:3000/convert-text \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Test OAuth\n\n## Slide 1\nHello World!",
    "user": "votre-email@exemple.com",
    "title": "Test OAuth Fix"
  }'
```

Réponse attendue :
```json
{
  "error": "authorization_required",
  "auth_url": "https://accounts.google.com/oauth/authorize?...",
  "message": "Please authorize this app by visiting the URL provided"
}
```

### 2. Autorisation dans le navigateur

1. ✅ Visitez l'URL `auth_url` retournée
2. ✅ Connectez-vous avec votre compte Google  
3. ✅ **Acceptez tous les permissions** (critique pour obtenir refresh token)
4. ✅ Vous serez redirigé vers l'URI de callback

### 3. Test après autorisation

```bash
# Retester la conversion (devrait fonctionner maintenant)
curl -X POST http://localhost:3000/convert-text \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Test Success\n\n## OAuth Fixed!\nTokens are working",
    "user": "votre-email@exemple.com",
    "title": "OAuth Success"
  }'
```

Réponse attendue :
```json
{
  "success": true,
  "presentation_url": "https://docs.google.com/presentation/d/...",
  "message": "Conversion completed successfully"
}
```

## 🛠️ Dépannage

### Erreur : "No refresh token is set"

**Cause** : Token expiré ou permissions insuffisantes

**Solution** :
```bash
# 1. Supprimer les tokens existants
rm ./credentials/credentials.json

# 2. Redémarrer le service
docker-compose restart md2googleslides

# 3. Réautoriser l'application (avec consentement forcé)
```

### Erreur : "invalid_grant"

**Cause** : Code d'autorisation expiré ou déjà utilisé

**Solution** :
```bash
# 1. Attendre 30 secondes
# 2. Refaire l'autorisation complète
# 3. S'assurer d'utiliser le code rapidement après génération
```

### Erreur : "read-only file system"

**Cause** : Permissions Docker incorrectes

**Solution** :
```bash
# 1. Vérifier docker-compose.yml (pas de :ro sur credentials)
# 2. Corriger les permissions
chmod -R 755 ./credentials

# 3. Rebuilder si nécessaire  
docker-compose build --no-cache md2googleslides
docker-compose up -d md2googleslides
```

### Service inaccessible

**Solution** :
```bash
# 1. Vérifier les logs
docker-compose logs md2googleslides

# 2. Redémarrage propre
docker-compose down
docker-compose up -d md2googleslides

# 3. Vérifier la santé
curl http://localhost:3000/health
```

## 📊 Monitoring

### Santé du service

```bash
curl -s http://localhost:3000/health | jq '.'
```

### Logs en temps réel

```bash
docker-compose logs -f md2googleslides
```

### Statistiques du conteneur

```bash
docker stats md2slides
```

## 📚 Documentation API

Une fois le service démarré, consultez la documentation complète :

```
http://localhost:3000/
```

Endpoints principaux :
- `GET /health` - Santé du service
- `POST /convert-text` - Conversion Markdown → Google Slides
- `POST /convert-advanced` - Conversion avancée avec templates
- `GET /oauth/callback` - Callback OAuth (automatique)

## ✅ Vérification du succès

Le fix OAuth est réussi si :

1. ✅ `curl http://localhost:3000/health` répond `200 OK`
2. ✅ Les logs ne montrent plus `"No refresh token is set"`
3. ✅ L'autorisation OAuth génère une URL valide
4. ✅ La conversion fonctionne après autorisation
5. ✅ Les tokens sont persistés dans `./credentials/credentials.json`
6. ✅ Le fichier `credentials.json` contient des `refresh_token`

## 🎉 Récapitulatif

Ces modifications résolvent définitivement les erreurs OAuth récurrentes en :

- **Forçant le consentement** pour obtenir les refresh tokens
- **Validant les tokens** avant utilisation  
- **Gérant les erreurs** avec retry automatique
- **Corrigeant les permissions** Docker
- **Persistant correctement** les credentials

Le flux OAuth est maintenant **robuste et fiable** ! 🚀
