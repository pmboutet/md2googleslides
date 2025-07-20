# Configuration OAuth 2.0 pour Application Web

Ce document explique comment configurer correctement OAuth 2.0 pour md2googleslides en tant qu'application web.

## Problèmes résolus

### Avant (Configuration incorrecte)
- **Redirect URI incomplète** : `http://localhost` 
- **Pas d'endpoint callback** : Aucune gestion du retour OAuth
- **Type de client ambigu** : Configuration entre app installée et web app

### Après (Configuration correcte)
- **Redirect URI complète** : `https://n8n-ivayh-u36210.vm.elestio.app/oauth/callback`
- **Endpoint callback fonctionnel** : `GET /oauth/callback`
- **Configuration web app** : Adaptée aux applications web

## Configuration requise dans Google Cloud Console

### 1. Type de client OAuth 2.0
- **Type** : Application Web
- **Nom** : md2googleslides (ou votre nom d'application)

### 2. URI de redirection autorisées
Ajoutez dans Google Cloud Console → APIs & Services → Credentials → Votre Client OAuth 2.0 :

```
https://n8n-ivayh-u36210.vm.elestio.app/oauth/callback
```

### 3. Origines JavaScript autorisées (optionnel)
Si vous avez du JavaScript côté client :

```
http://localhost:3000
```

### 4. Scopes requis
L'application utilise ces scopes :
- `https://www.googleapis.com/auth/presentations`
- `https://www.googleapis.com/auth/drive`

## Nouveaux endpoints ajoutés

### `GET /oauth/callback`
- **Description** : Endpoint de callback OAuth 2.0
- **Paramètres** : 
  - `code` : Code d'autorisation de Google
  - `state` : User ID (email) 
  - `error` : Erreur éventuelle
- **Réponse** : JSON avec statut d'autorisation

### `GET /health`
Maintenant inclut l'URI de redirection OAuth pour vérification :
```json
{
  "status": "healthy",
  "oauth_redirect_uri": "https://n8n-ivayh-u36210.vm.elestio.app/oauth/callback"
}
```

## Flux d'autorisation corrigé

### 1. Demande d'autorisation
```bash
POST /convert
# ou
POST /convert-text
```

Si l'utilisateur n'est pas autorisé, réponse :
```json
{
  "error": "authorization_required",
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "Please authorize this app by visiting the URL provided"
}
```

### 2. Autorisation utilisateur
L'utilisateur visite `auth_url` et autorise l'application.

### 3. Callback automatique
Google redirige vers `https://n8n-ivayh-u36210.vm.elestio.app/oauth/callback` avec le code d'autorisation.

### 4. Stockage des tokens
L'application échange le code contre des tokens et les stocke pour utilisation future.

### 5. Utilisation normale
Les appels suivants utilisent les tokens stockés automatiquement.

## Meilleures pratiques implémentées

### ✅ Redirect URI complète avec port
```javascript
const REDIRECT_URI = `https://n8n-ivayh-u36210.vm.elestio.app/oauth/callback`;
```

### ✅ Gestion d'état (state parameter)
Le paramètre `state` transmet l'identifiant utilisateur :
```javascript
state: user // Pass user in state parameter for later retrieval
```

### ✅ Gestion d'erreurs robuste
- Erreurs d'autorisation
- Codes manquants
- Échec d'échange de tokens

### ✅ Stockage sécurisé des tokens
- Fichier `~/.md2googleslides/credentials.json`
- Tokens par utilisateur
- Refresh tokens pour accès à long terme

### ✅ Support multi-utilisateurs
Chaque utilisateur (email) a ses propres tokens stockés séparément.

## Configuration pour la production

Pour la production, modifiez :

1. **URI de redirection** dans Google Cloud Console :
```
https://votredomaine.com/oauth/callback
```

2. **Variable d'environnement** :
```bash
export PORT=443
# ou configurez HTTPS avec certificats
```

3. **Domaines autorisés** dans l'écran de consentement OAuth.

## Dépannage

### Erreur "Client is not authorized for this flow"
- ✅ **Résolu** : Configuration correcte du type client web
- Vérifiez que le client est de type "Application Web"
- Vérifiez les URI de redirection

### Erreur "redirect_uri_mismatch"
- ✅ **Résolu** : URI complète avec port et chemin
- L'URI doit correspondre exactement à celle configurée

### Erreur 404 sur callback
- ✅ **Résolu** : Endpoint `/oauth/callback` ajouté
- Le serveur gère maintenant le callback automatiquement

## Commandes de test

1. **Santé du service** :
```bash
curl http://localhost:3000/health
```

2. **Test d'autorisation** :
```bash
curl -X POST http://localhost:3000/convert-text \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test","user":"votre-email@gmail.com"}'
```

3. **Vérification après autorisation** :
```bash
# Après avoir visité l'URL d'autorisation
curl -X POST http://localhost:3000/convert-text \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test","user":"votre-email@gmail.com"}'
```
