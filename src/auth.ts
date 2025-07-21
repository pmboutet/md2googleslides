// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Debug from 'debug';
import {OAuth2Client, Credentials} from 'google-auth-library';
import path from 'path';
import {sync as mkdirpSync} from 'mkdirp';
import {LowSync} from 'lowdb';
import {JSONFileSync} from 'lowdb/node';

const debug = Debug('md2gslides');

export type UserPrompt = (message: string) => Promise<string>;

export interface AuthOptions {
  clientId: string;
  clientSecret: string;
  prompt: UserPrompt;
  filePath?: string;
  redirectUri?: string;
}

interface CredentialsDb {
  [key: string]: Credentials & { timestamp?: number };
}

/**
 * Handles the authorization flow, intended for command line usage.
 * 
 * Améliorations OAuth v2.0:
 * - Meilleure gestion des refresh tokens
 * - Retry automatique en cas d'échec
 * - Validation des tokens avant utilisation
 * - Force le consentement pour obtenir refresh token
 * - Gestion des erreurs améliorée
 */
export default class UserAuthorizer {
  // For web applications, use a proper callback URL
  // For installed/desktop apps, Google deprecated the 'oob' redirect URI. Use loopback and ask the user to
  // copy the code from the failing browser page.
  private redirectUrl: string;
  private db: LowSync<CredentialsDb>;
  private clientId: string;
  private clientSecret: string;
  private prompt: UserPrompt;

  /**
   * Initialize the authorizer.
   *
   * This may block briefly to ensure the token file exists.
   *
   * @param options
   */
  public constructor(options: AuthOptions) {
    this.db = UserAuthorizer.initDbSync(options?.filePath);
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.prompt = options.prompt;
    // Use provided redirect URI or default for installed apps
    this.redirectUrl = options.redirectUri || 'http://localhost:8080';
  }

  /**
   * Fetch credentials for the specified user.
   *
   * If no credentials are available, requests authorization.
   * 
   * Améliorations :
   * - Validation du refresh token avant utilisation
   * - Retry automatique si le refresh token est invalide
   * - Force le consentement OAuth pour garantir refresh token
   * - Meilleure gestion des erreurs
   *
   * @param {String} user ID (email address) of user to get credentials for.
   * @param {String} scopes Authorization scopes to request
   * @returns {Promise.<google.auth.OAuth2>}
   */
  public async getUserCredentials(
    user: string,
    scopes: string
  ): Promise<OAuth2Client> {
    const oauth2Client = new OAuth2Client(
      this.clientId,
      this.clientSecret,
      this.redirectUrl
    );

    oauth2Client.on('tokens', (tokens: Credentials) => {
      if (tokens.refresh_token) {
        debug('Saving refresh token');
        // Stocker les tokens avec timestamp pour validation
        const credentialsWithTimestamp = {
          ...tokens,
          timestamp: Date.now()
        };
        this.db.data[user] = credentialsWithTimestamp;
        this.db.write();
      }
    });

    const tokens = this.db.data[user];
    if (tokens && this.isTokenValid(tokens)) {
      debug('User previously authorized, refreshing');
      oauth2Client.setCredentials(tokens);
      
      try {
        // Tenter de récupérer un nouveau access token
        await oauth2Client.getAccessToken();
        return oauth2Client;
      } catch (error) {
        if (error instanceof Error) {
          debug('Failed to refresh token, requiring re-authorization:', error.message);
        } else {
          debug('Failed to refresh token, requiring re-authorization:', error);
        }
        // Supprimer le token invalide
        delete this.db.data[user];
        this.db.write();
        // Continuer vers la nouvelle autorisation
      }
    }

    debug('Challenging for authorization');
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      login_hint: user,
      prompt: 'consent' // Force le consentement pour obtenir un refresh token
    });

    const code = await this.prompt(authUrl);
    
    try {
      const tokenResponse = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokenResponse.tokens);
      
      // Vérifier que nous avons bien un refresh token
      if (!tokenResponse.tokens.refresh_token) {
        throw new Error('No refresh token received. Please revoke app access in Google Account settings and try again.');
      }
      
      // Persister les credentials avec timestamp
      const credentialsWithTimestamp = {
        ...tokenResponse.tokens,
        timestamp: Date.now()
      };
      this.db.data[user] = credentialsWithTimestamp;
      this.db.write();
      
      return oauth2Client;
    } catch (error) {
      if (error instanceof Error) {
        debug('Token exchange failed:', error.message);
        throw new Error(`Failed to exchange authorization code: ${error.message}`);
      }
      debug('Token exchange failed:', error);
      throw new Error(`Failed to exchange authorization code: ${String(error)}`);
    }
  }

  /**
   * Vérifie si un token est encore valide (pas trop ancien)
   */
  private isTokenValid(tokens: Credentials & { timestamp?: number }): boolean {
    if (!tokens.refresh_token) {
      return false;
    }
    
    // Si pas de timestamp, considérer comme potentiellement valide mais suspect
    if (!tokens.timestamp) {
      debug('Token without timestamp, will attempt refresh');
      return true;
    }
    
    // Vérifier que le token n'est pas trop ancien (ex: 30 jours)
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
    const age = Date.now() - tokens.timestamp;
    
    if (age > maxAge) {
      debug('Token is too old, requiring re-authorization');
      return false;
    }
    
    return true;
  }

  /**
   * Initializes the token database.
   *
   * @param {String} filePath Path to database, null if use in-memory DB only.
   * @returns {Low} database instance
   * @private
   */
  private static initDbSync(filePath?: string): LowSync<CredentialsDb> {
    let adapter: JSONFileSync<CredentialsDb>;
    if (filePath) {
      const parentDir = path.dirname(filePath);
      mkdirpSync(parentDir);
      adapter = new JSONFileSync<CredentialsDb>(filePath);
    } else {
      // For in-memory storage, we'll use a temporary file
      adapter = new JSONFileSync<CredentialsDb>('/tmp/md2gslides-memory.json');
    }

    const db = new LowSync(adapter, {} as CredentialsDb);
    db.read();

    // Initialize data if it doesn't exist
    if (!db.data) {
      db.data = {};
      db.write();
    }

    return db;
  }
}
