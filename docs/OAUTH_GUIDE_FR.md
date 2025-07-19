# Guide OAuth 2.0 pas-à-pas

Ce document explique comment générer l'URL d'autorisation, récupérer le callback puis utiliser les APIs Google Slides et Google Drive avec **md2googleslides**.

## 1. Pré‑requis Google Cloud

1. Créez un projet sur la [console Google Cloud](https://console.cloud.google.com).
2. Activez les APIs **Google Slides** et **Google Drive**.
3. Configurez l'écran de consentement OAuth (mode Test ou Production) et ajoutez vos comptes à la section *Test users* si nécessaire.
4. Ajoutez les scopes sensibles :
   - `https://www.googleapis.com/auth/presentations`
   - `https://www.googleapis.com/auth/drive`
5. Dans les identifiants OAuth 2.0, déclarez un URI de redirection : `http://localhost:3000/oauth2callback` (ou adaptez selon votre serveur).
6. Téléchargez le fichier JSON contenant `client_id` et `client_secret` et stockez‑le en lieu sûr (ex. `~/.md2googleslides/client_id.json`).

## 2. Génération de l'URL d'autorisation

```javascript
const {google} = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  '425405491654-d42fsitjsnmgpofek86inddgq20b5l9f.apps.googleusercontent.com',
  CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

const scopes = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive',
];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  include_granted_scopes: true,
  state: STATE, // chaîne aléatoire pour éviter le CSRF
  prompt: 'consent',
});
console.log(url);
```

Ouvrez cette URL dans un navigateur. Après validation, Google redirige vers :

```
http://localhost:3000/oauth2callback?code=4/XYZ123&state=STATE
```

## 3. Récupération du `code` et échange contre les jetons

```javascript
const express = require('express');
const {google} = require('googleapis');

const app = express();

app.get('/oauth2callback', async (req, res) => {
  if (req.query.state !== STATE) {
    return res.status(400).send('Invalid state');
  }

  const {tokens} = await oauth2Client.getToken(String(req.query.code));
  oauth2Client.setCredentials(tokens); // {access_token, refresh_token, ...}

  // Persistez le refresh_token côté serveur
  saveTokens(tokens);

  res.send('Authorization complete');
});
```

## 4. Rafraîchir le `access_token`

```javascript
const {tokens: refreshed} = await oauth2Client.refreshAccessToken();
oauth2Client.setCredentials(refreshed);
```

## 5. Appels Google Slides et Drive

Création d'une présentation :

```javascript
const slides = google.slides({version: 'v1', auth: oauth2Client});
const pres = await slides.presentations.create({
  requestBody: {title: 'Ma Présentation Auto'},
});
console.log(`ID: ${pres.data.presentationId}`);
```

Ajout d'une diapositive :

```javascript
await slides.presentations.batchUpdate({
  presentationId: pres.data.presentationId,
  requestBody: {
    requests: [{createSlide: {insertionIndex: 1}}],
  },
});
```

Partage du fichier via l'API Drive :

```javascript
const drive = google.drive({version: 'v3', auth: oauth2Client});
await drive.permissions.create({
  fileId: pres.data.presentationId,
  requestBody: {
    role: 'writer',
    type: 'user',
    emailAddress: 'collab@example.com',
  },
});
```

## 6. Bonnes pratiques

- Ne jamais exposer le `client_secret` ou le `refresh_token` côté front‑end.
- Stockez ces secrets dans des variables d'environnement ou un gestionnaire de secrets.
- Utilisez la bibliothèque officielle `googleapis` pour faciliter le refresh automatique et la validation des jetons.
- Prévoyez un endpoint pour révoquer les tokens le cas échéant :`https://oauth2.googleapis.com/revoke`.
