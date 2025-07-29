const express = require('express');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const { ensureMarkers } = require('./lib/src/deck_import');
const { copySlide, editSlide } = require('./lib/src/deck_import');
const app = express();
const port = process.env.PORT || 3000;

const SCOPES = [
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive',
];

const HOME = os.homedir();
const CREDENTIALS_PATH = path.join(HOME, '.md2googleslides', 'credentials.json');
const CLIENT_ID_PATH = path.join(HOME, '.md2googleslides', 'client_id.json');

// OAuth 2.0 redirect URI - mise à jour avec domaine public
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://n8n-ivayh-u36210.vm.elestio.app/oauth/callback';

/**
 * Obtenir un token stocké pour un utilisateur
 * Amélioré avec validation et gestion des erreurs
 */
function getStoredToken(user) {
    try {
        const data = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
        const tokens = JSON.parse(data);
        const userTokens = tokens[user];
        
        if (!userTokens) {
            return null;
        }
        
        // Vérifier que le refresh token existe
        if (!userTokens.refresh_token) {
            console.warn(`No refresh token found for user ${user}`);
            return null;
        }
        
        return userTokens;
    } catch (err) {
        console.error('Error reading stored tokens:', err.message);
        return null;
    }
}

/**
 * Stocker un token pour un utilisateur
 * Amélioré avec validation et atomic writes
 */
function storeToken(user, tokens) {
    try {
        let data = {};
        
        // Lire les données existantes
        if (fs.existsSync(CREDENTIALS_PATH)) {
            try {
                const existingData = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
                data = JSON.parse(existingData);
            } catch (parseErr) {
                console.warn('Could not parse existing credentials, starting fresh:', parseErr.message);
            }
        }
        
        // Ajouter timestamp pour traçabilité
        data[user] = {
            ...tokens,
            timestamp: Date.now()
        };
        
        // Assurer que le répertoire existe
        const dir = path.dirname(CREDENTIALS_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Écriture atomique via fichier temporaire
        const tempPath = CREDENTIALS_PATH + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
        fs.renameSync(tempPath, CREDENTIALS_PATH);
        
        console.log(`Tokens stored successfully for user: ${user}`);
        return true;
    } catch (err) {
        console.error('Failed to store token:', err.message);
        return false;
    }
}

/**
 * Générer une URL d'autorisation OAuth
 * Amélioré avec meilleure gestion des erreurs
 */
function generateAuthUrl(user) {
    try {
        if (!fs.existsSync(CLIENT_ID_PATH)) {
            throw new Error(`OAuth client file not found at ${CLIENT_ID_PATH}`);
        }

        const data = fs.readFileSync(CLIENT_ID_PATH, 'utf8');
        let parsed;
        try {
            parsed = JSON.parse(data);
        } catch (err) {
            throw new Error(`Invalid JSON in ${CLIENT_ID_PATH}: ${err.message}`);
        }

        const creds = parsed.web || parsed.installed;
        if (!creds) {
            throw new Error('Credentials missing "web" or "installed" section');
        }
        if (!creds.client_id || !creds.client_secret) {
            throw new Error('Credentials missing client_id or client_secret');
        }

        const oAuth2Client = new OAuth2Client(
            creds.client_id,
            creds.client_secret,
            REDIRECT_URI
        );
        
        return oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            login_hint: user,
            state: user, // Pass user in state parameter
            prompt: 'consent' // Force consent to get refresh token
        });
    } catch (err) {
        console.error('Failed to generate auth URL:', err.message);
        console.error(`Ensure a valid client_id.json exists at ${CLIENT_ID_PATH}`);
        return null;
    }
}

/**
 * Échanger un code d'autorisation contre des tokens
 * Amélioré avec meilleure validation et retry logic
 */
async function exchangeCodeForTokens(code, user) {
    try {
        const data = fs.readFileSync(CLIENT_ID_PATH, 'utf8');
        const parsed = JSON.parse(data);
        const creds = parsed.web || parsed.installed;
        
        const oAuth2Client = new OAuth2Client(
            creds.client_id,
            creds.client_secret,
            REDIRECT_URI
        );
        
        console.log(`Attempting to exchange code for tokens for user: ${user}`);
        const { tokens } = await oAuth2Client.getToken(code);
        
        // Vérifier que nous avons un refresh token
        if (!tokens.refresh_token) {
            console.warn('No refresh token received - user may need to revoke app access first');
            throw new Error('No refresh token received. Please revoke this app\'s access in your Google Account settings and authorize again.');
        }
        
        // Stocker les tokens
        if (storeToken(user, tokens)) {
            console.log('Tokens successfully stored');
            return tokens;
        } else {
            throw new Error('Failed to store tokens');
        }
    } catch (err) {
        console.error('Failed to exchange code for tokens:', err.message);
        
        // Messages d'erreur spécifiques
        if (err.message.includes('invalid_grant')) {
            console.error('Authorization code expired or already used. Please try the authorization flow again.');
        }
        
        return null;
    }
}

/**
 * Obtenir un client OAuth2 autorisé
 * Amélioré avec validation et refresh automatique
 */
function getAuthorizedClient(user) {
    try {
        const data = fs.readFileSync(CLIENT_ID_PATH, 'utf8');
        const parsed = JSON.parse(data);
        const creds = parsed.web || parsed.installed;
        const tokens = getStoredToken(user);
        
        if (!tokens) {
            console.log(`No valid tokens found for user: ${user}`);
            return null;
        }
        
        const oAuth2Client = new OAuth2Client(
            creds.client_id,
            creds.client_secret,
            REDIRECT_URI
        );
        
        oAuth2Client.setCredentials(tokens);
        
        // Configurer le gestionnaire de tokens pour la persistence
        oAuth2Client.on('tokens', (newTokens) => {
            console.log('Received new tokens, updating storage');
            const updatedTokens = { ...tokens, ...newTokens };
            storeToken(user, updatedTokens);
        });
        
        return oAuth2Client;
    } catch (err) {
        console.error('Failed to create OAuth client:', err.message);
        return null;
    }
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configurer multer pour les uploads de fichiers
const upload = multer({
    dest: '/tmp/uploads/',
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// OAuth callback endpoint - amélioré
app.get('/oauth/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    if (error) {
        console.error('OAuth authorization error:', error);
        return res.status(400).json({
            error: 'authorization_denied',
            message: `OAuth authorization failed: ${error}`
        });
    }
    
    if (!code) {
        return res.status(400).json({
            error: 'missing_code',
            message: 'Authorization code not received'
        });
    }
    
    const user = state || 'default';
    console.log(`Processing OAuth callback for user: ${user}`);
    
    const tokens = await exchangeCodeForTokens(code, user);
    
    if (tokens) {
        res.json({
            success: true,
            message: 'Authorization successful. You can now use the API.',
            user: user,
            has_refresh_token: !!tokens.refresh_token
        });
    } else {
        res.status(500).json({
            error: 'token_exchange_failed',
            message: 'Failed to exchange authorization code for tokens'
        });
    }
});

// Health check endpoint - amélioré
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'md2slides-server',
        timestamp: new Date().toISOString(),
        version: require('./package.json').version,
        oauth_redirect_uri: REDIRECT_URI,
        credentials_path_exists: fs.existsSync(CLIENT_ID_PATH)
    });
});

// Main conversion endpoint with file upload
app.post('/convert', upload.single('markdown'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No markdown file provided' });
    }

    const markdownPath = req.file.path;
    const { title, user, style, appendId, erase, dryRun } = req.body;

    const userEmail = user || 'default';
    if (!getStoredToken(userEmail)) {
        const authUrl = generateAuthUrl(userEmail);
        if (!authUrl) {
            return res.status(500).json({
                error: 'authorization_failed',
                message: 'Failed to generate authorization URL'
            });
        }
        return res.status(401).json({
            error: 'authorization_required',
            auth_url: authUrl,
            message: 'Please authorize this app by visiting the URL provided'
        });
    }

    // Build command
    let command = `node /app/bin/md2gslides.js "${markdownPath}"`;

    if (title) command += ` --title "${title}"`;
    if (user) command += ` --user "${user}"`;
    if (style) command += ` --style "${style}"`;
    if (appendId) command += ` --append "${appendId}"`;
    if (erase === 'true') command += ' --erase';
    if (dryRun === 'true') command += ' --dry-run';

    // Add no-browser flag for headless operation
    command += ' --no-browser';

    console.log('Executing command:', command);

    // Execute md2gslides
    exec(command, {
        cwd: '/app',
        timeout: 300000, // 5 minutes timeout
        env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_CREDENTIALS_JSON ? '/tmp/google-credentials.json' : undefined }
    }, (error, stdout, stderr) => {
        // Clean up uploaded file
        fs.unlink(markdownPath, () => {});

        if (error) {
            console.error('Conversion error:', error);
            return res.status(500).json({
                error: 'Conversion failed',
                details: stderr || error.message,
                command: command.replace(/--user "[^"]*"/, '--user "[REDACTED]"') // Hide user email
            });
        }

        // Extract presentation URL from stdout if available
        const urlMatch = stdout.match(/https:\/\/docs\.google\.com\/presentation\/d\/[a-zA-Z0-9-_]+/);
        const presentationUrl = urlMatch ? urlMatch[0] : null;

        res.json({
            success: true,
            output: stdout,
            presentationUrl: presentationUrl,
            message: 'Conversion completed successfully'
        });
    });
});

// Convert from text endpoint
app.post('/convert-text', (req, res) => {
    const { markdown, title, user, style, appendId, erase, dryRun } = req.body;

    if (!markdown) {
        return res.status(400).json({ error: 'No markdown content provided' });
    }

    const userEmail = user || 'default';
    if (!getStoredToken(userEmail)) {
        const authUrl = generateAuthUrl(userEmail);
        if (!authUrl) {
            return res.status(500).json({
                error: 'authorization_failed',
                message: 'Failed to generate authorization URL'
            });
        }
        return res.status(401).json({
            error: 'authorization_required',
            auth_url: authUrl,
            message: 'Please authorize this app by visiting the URL provided'
        });
    }

    // Create temporary file
    const tempFile = `/tmp/markdown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.md`;

    try {
        fs.writeFileSync(tempFile, markdown);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to create temporary file' });
    }

    // Build command
    let command = `node /app/bin/md2gslides.js "${tempFile}"`;

    if (title) command += ` --title "${title}"`;
    if (user) command += ` --user "${user}"`;
    if (style) command += ` --style "${style}"`;
    if (appendId) command += ` --append "${appendId}"`;
    if (erase === 'true') command += ' --erase';
    if (dryRun === 'true') command += ' --dry-run';

    command += ' --no-browser';

    console.log('Executing command:', command);

    // Execute md2gslides
    exec(command, {
        cwd: '/app',
        timeout: 300000, // 5 minutes timeout
        env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_CREDENTIALS_JSON ? '/tmp/google-credentials.json' : undefined }
    }, (error, stdout, stderr) => {
        // Clean up temp file
        fs.unlink(tempFile, () => {});

        if (error) {
            console.error('Conversion error:', error);
            return res.status(500).json({
                error: 'Conversion failed',
                details: stderr || error.message,
                command: command.replace(/--user "[^"]*"/, '--user "[REDACTED]"') // Hide user email
            });
        }

        // Extract presentation URL from stdout if available
        const urlMatch = stdout.match(/https:\/\/docs\.google\.com\/presentation\/d\/[a-zA-Z0-9-_]+/);
        const presentationUrl = urlMatch ? urlMatch[0] : null;

        res.json({
            success: true,
            output: stdout,
            presentationUrl: presentationUrl,
            message: 'Conversion completed successfully'
        });
    });
});

// Presentation discovery endpoint
app.get('/discover', async (req, res) => {
    const presentationId = req.query.id || req.query.presentationId;
    const user = req.query.user || 'default';

    if (!presentationId) {
        return res.status(400).json({ error: 'Missing presentation ID' });
    }

    if (!getStoredToken(user)) {
        const authUrl = generateAuthUrl(user);
        if (!authUrl) {
            return res.status(500).json({
                error: 'authorization_failed',
                message: 'Failed to generate authorization URL'
            });
        }
        return res.status(401).json({
            error: 'authorization_required',
            auth_url: authUrl,
            message: 'Please authorize this app by visiting the URL provided'
        });
    }

    const client = getAuthorizedClient(user);
    if (!client) {
        return res.status(500).json({ error: 'Failed to create OAuth client' });
    }

    try {
        const info = await ensureMarkers(client, presentationId);
        res.json({ success: true, presentation: info });
    } catch (err) {
        console.error('Discovery error:', err);
        res.status(500).json({ error: 'Failed to discover presentation' });
    }
});

// Duplicate a slide from a presentation
app.post('/copy-slide', async (req, res) => {
    const { source_presentation_id, slide_id, user } = req.body;

    if (!source_presentation_id || !slide_id) {
        return res.status(400).json({ error: 'Missing source_presentation_id or slide_id' });
    }

    const userEmail = user || 'default';
    if (!getStoredToken(userEmail)) {
        const authUrl = generateAuthUrl(userEmail);
        if (!authUrl) {
            return res.status(500).json({ error: 'authorization_failed', message: 'Failed to generate authorization URL' });
        }
        return res.status(401).json({ error: 'authorization_required', auth_url: authUrl, message: 'Please authorize this app by visiting the URL provided' });
    }

    const client = getAuthorizedClient(userEmail);
    if (!client) {
        return res.status(500).json({ error: 'Failed to create OAuth client' });
    }

    try {
        const newId = await copySlide(client, source_presentation_id, slide_id);
        res.json({ success: true, slide_id: newId });
    } catch (err) {
        console.error('Copy slide error:', err);
        res.status(500).json({ error: 'Failed to copy slide' });
    }
});

// Edit existing slide elements
app.post('/edit-slide', async (req, res) => {
    const { presentation_id, updates, user } = req.body;

    if (!presentation_id || !Array.isArray(updates)) {
        return res.status(400).json({ error: 'Missing presentation_id or updates' });
    }

    const userEmail = user || 'default';
    if (!getStoredToken(userEmail)) {
        const authUrl = generateAuthUrl(userEmail);
        if (!authUrl) {
            return res.status(500).json({ error: 'authorization_failed', message: 'Failed to generate authorization URL' });
        }
        return res.status(401).json({ error: 'authorization_required', auth_url: authUrl, message: 'Please authorize this app by visiting the URL provided' });
    }

    const client = getAuthorizedClient(userEmail);
    if (!client) {
        return res.status(500).json({ error: 'Failed to create OAuth client' });
    }

    try {
        await editSlide(client, presentation_id, updates);
        res.json({ success: true });
    } catch (err) {
        console.error('Edit slide error:', err);
        res.status(500).json({ error: 'Failed to edit slide' });
    }
});

// 🆕 NEW: Advanced conversion endpoint for md2slides_converter service
app.post('/convert-advanced', (req, res) => {
    const { 
        markdown, 
        title, 
        user, 
        template_id, 
        append_to_id, 
        auto_share, 
        share_emails, 
        use_fileio, 
        dry_run,
        style // Legacy support
    } = req.body;

    if (!markdown) {
        return res.status(400).json({ 
            error: 'No markdown content provided',
            service: 'md2googleslides-advanced'
        });
    }

    const userEmail = user || 'default';
    if (!getStoredToken(userEmail)) {
        const authUrl = generateAuthUrl(userEmail);
        if (!authUrl) {
            return res.status(500).json({
                error: 'authorization_failed',
                message: 'Failed to generate authorization URL',
                service: 'md2googleslides-advanced'
            });
        }
        return res.status(401).json({
            error: 'authorization_required',
            auth_url: authUrl,
            message: 'Please authorize this app by visiting the URL provided',
            service: 'md2googleslides-advanced'
        });
    }

    // Create temporary file
    const tempFile = `/tmp/markdown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.md`;

    try {
        fs.writeFileSync(tempFile, markdown);
    } catch (err) {
        return res.status(500).json({ 
            error: 'Failed to create temporary file',
            service: 'md2googleslides-advanced'
        });
    }

    // Build command with new parameters
    let command = `node /app/bin/md2gslides.js "${tempFile}"`;

    if (title) command += ` --title "${title}"`;
    if (user) command += ` --user "${user}"`;
    
    // New: Template support
    if (template_id) command += ` --template-id "${template_id}"`;
    
    // New: Append support (prioritize over template)
    if (append_to_id) {
        command += ` --append "${append_to_id}"`;
    }
    
    // Legacy style support
    if (style) command += ` --style "${style}"`;
    
    // New: File upload support
    if (use_fileio === true || use_fileio === 'true') {
        command += ' --use-fileio';
    }
    
    // Dry run support
    if (dry_run === true || dry_run === 'true') {
        command += ' --dry-run';
    }

    command += ' --no-browser';

    console.log('Executing advanced command:', command);

    // Execute md2gslides
    exec(command, {
        cwd: '/app',
        timeout: 300000, // 5 minutes timeout
        env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_CREDENTIALS_JSON ? '/tmp/google-credentials.json' : undefined }
    }, (error, stdout, stderr) => {
        // Clean up temp file
        fs.unlink(tempFile, () => {});

        if (error) {
            console.error('Advanced conversion error:', error);
            return res.status(500).json({
                error: 'Conversion failed',
                details: stderr || error.message,
                command: command.replace(/--user "[^"]*"/, '--user "[REDACTED]"'),
                service: 'md2googleslides-advanced',
                method: 'http_api'
            });
        }

        // Extract presentation ID and URL from stdout
        const urlMatch = stdout.match(/https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)/);
        const presentationUrl = urlMatch ? urlMatch[0] : null;
        const presentationId = urlMatch ? urlMatch[1] : null;

        // Enhanced response for md2slides_converter compatibility
        const response = {
            status: 'success',
            presentation_id: presentationId,
            presentation_url: presentationUrl,
            service: 'md2googleslides-advanced',
            method: 'http_api',
            timestamp: new Date().toISOString(),
            raw_output: stdout
        };

        // Add enhanced URLs if we have an ID
        if (presentationId) {
            response.edit_url = `https://docs.google.com/presentation/d/${presentationId}/edit`;
            response.preview_url = `https://docs.google.com/presentation/d/${presentationId}/preview`;
            response.export_pdf_url = `https://docs.google.com/presentation/d/${presentationId}/export/pdf`;
        }

        // Note about sharing (actual sharing would need to be implemented in the CLI tool)
        if (auto_share && share_emails && share_emails.length > 0) {
            response.sharing_note = 'Sharing parameters received but not yet implemented in md2googleslides CLI. Use md2slides_converter service for full sharing support.';
            response.requested_sharing = {
                auto_share,
                share_emails
            };
        }

        res.json(response);
    });
});

// Version endpoint
app.get('/version', (req, res) => {
    exec('node /app/bin/md2gslides.js --version', { cwd: '/app' }, (error, stdout) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to get version' });
        }
        res.json({ version: stdout.trim() });
    });
});

// Help endpoint
app.get('/help', (req, res) => {
    exec('node /app/bin/md2gslides.js --help', { cwd: '/app' }, (error, stdout) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to get help' });
        }
        res.json({ help: stdout });
    });
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
    res.json({
        service: 'md2slides HTTP API',
        version: require('./package.json').version,
        description: 'HTTP API wrapper for md2googleslides CLI tool',
        oauth_redirect_uri: REDIRECT_URI,
        endpoints: {
            'GET /': 'This help page',
            'GET /health': 'Health check',
            'GET /version': 'Get md2gslides version',
            'GET /help': 'Get md2gslides CLI help',
            'GET /oauth/callback': 'OAuth 2.0 callback endpoint',
            'GET /discover': 'Get presentation layouts and slides',
            'POST /convert': 'Convert markdown file to Google Slides (multipart/form-data)',
            'POST /convert-text': 'Convert markdown text to Google Slides (JSON)',
            'POST /convert-advanced': '🆕 Advanced conversion with template_id, append_to_id, and sharing support (JSON)'
        },
        examples: {
            convertText: {
                url: 'POST /convert-text',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    markdown: '# My Presentation\n\n## Slide 1\nContent here',
                    title: 'My Presentation',
                    user: 'user@example.com',
                    style: 'github'
                }
            },
            convertAdvanced: {
                url: 'POST /convert-advanced',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    markdown: '# Advanced Presentation\n\n## New Section\nAdvanced content',
                    title: 'Advanced Presentation',
                    user: 'user@example.com',
                    template_id: '1ABC123_TEMPLATE_ID',
                    append_to_id: '1XYZ789_EXISTING_PRESENTATION',
                    auto_share: true,
                    share_emails: [
                        { email: 'colleague@example.com', role: 'writer' }
                    ],
                    dry_run: false
                }
            },
            convertFile: {
                url: 'POST /convert',
                headers: { 'Content-Type': 'multipart/form-data' },
                body: 'Form data with "markdown" file field'
            },
            discover: {
                url: 'GET /discover?id=YOUR_PRESENTATION_ID&user=user@example.com',
                headers: { 'Content-Type': 'application/json' }
            }
        }
    });
});

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
app.use((err, req, res, _next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
    // Setup Google credentials si fourni via variable d'environnement
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
        try {
            fs.writeFileSync('/tmp/google-credentials.json', process.env.GOOGLE_CREDENTIALS_JSON);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/google-credentials.json';
            console.log('Google credentials configured from environment variable');
        } catch (err) {
            console.error('Failed to setup Google credentials:', err.message);
        }
    }

    // Start server
    app.listen(port, '0.0.0.0', () => {
        console.log(`md2slides HTTP server running on port ${port}`);
        console.log(`Health check: http://localhost:${port}/health`);
        console.log(`API documentation: http://localhost:${port}/`);
        console.log(`OAuth callback URI: ${REDIRECT_URI}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down gracefully');
        // eslint-disable-next-line n/no-process-exit
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully');
        // eslint-disable-next-line n/no-process-exit
        process.exit(0);
    });
}

module.exports = { app, generateAuthUrl };
