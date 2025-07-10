import { google } from 'googleapis';
import { authorizeUser } from '../src/auth';
import fs from 'fs';
import path from 'path';

export async function authorizeUser(scopes: string[]): Promise<any> {
  const credsPath = '/root/.md2googleslides/client_id.json';

  if (!fs.existsSync(credsPath)) {
    throw new Error(`Credentials not found at ${credsPath}`);
  }

  const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

  const { client_id, client_secret, refresh_token } = credentials;

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error('Missing required credentials: client_id, client_secret, or refresh_token');
  }

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost' // redirectUri, can be unused with refresh_token
  );

  oauth2Client.setCredentials({ refresh_token });

  await oauth2Client.getAccessToken(); // refresh the access token

  return oauth2Client;
}
