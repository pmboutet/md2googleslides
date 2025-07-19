const express = require('express');
const {google} = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Path to the OAuth client JSON downloaded from Google Cloud Console
const CLIENT_PATH = path.join(process.env.HOME || process.cwd(), '.md2googleslides', 'client_id.json');
// Token storage path
const TOKEN_PATH = path.join(process.env.HOME || process.cwd(), '.md2googleslides', 'tokens.json');

function loadCredentials() {
  const raw = fs.readFileSync(CLIENT_PATH, 'utf8');
  const json = JSON.parse(raw);
  const creds = json.web || json.installed || json;
  if (!creds.client_id || !creds.client_secret) {
    throw new Error('Invalid credentials file');
  }
  return creds;
}

const {client_id: CLIENT_ID, client_secret: CLIENT_SECRET} = loadCredentials();
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive',
];

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

let STATE = crypto.randomBytes(16).toString('hex');

const app = express();

app.get('/auth', (_req, res) => {
  STATE = crypto.randomBytes(16).toString('hex');
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    include_granted_scopes: true,
    state: STATE,
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  if (req.query.state !== STATE) {
    return res.status(400).send('Invalid state');
  }
  try {
    const {tokens} = await oauth2Client.getToken(String(req.query.code));
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    res.send('Authorization complete');
  } catch (err) {
    console.error('Token exchange failed:', err);
    res.status(500).send('Authentication error');
  }
});

async function refreshAccessToken() {
  try {
    const {token} = await oauth2Client.getAccessToken();
    if (!token) {
      const saved = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oauth2Client.setCredentials(saved);
    }
  } catch (err) {
    console.error('Failed to refresh token:', err);
  }
}

app.get('/demo', async (_req, res) => {
  try {
    await refreshAccessToken();

    const slides = google.slides({version: 'v1', auth: oauth2Client});
    const pres = await slides.presentations.create({
      requestBody: {title: 'Ma Présentation Auto'},
    });

    await slides.presentations.batchUpdate({
      presentationId: pres.data.presentationId,
      requestBody: {
        requests: [{createSlide: {insertionIndex: 1}}],
      },
    });

    const drive = google.drive({version: 'v3', auth: oauth2Client});
    await drive.permissions.create({
      fileId: pres.data.presentationId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: 'collab@example.com',
      },
    });

    res.json({presentationId: pres.data.presentationId});
  } catch (err) {
    console.error(err);
    res.status(500).send('Error running demo');
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Visit /auth to start OAuth flow');
});
