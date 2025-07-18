const express = require('express');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const app = express();
const port = process.env.PORT || 3000;

const SCOPES = [
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive',
];

const HOME = os.homedir();
const CREDENTIALS_PATH = path.join(HOME, '.md2googleslides', 'credentials.json');
const CLIENT_ID_PATH = path.join(HOME, '.md2googleslides', 'client_id.json');

function getStoredToken(user) {
    try {
        const data = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
        const tokens = JSON.parse(data);
        return tokens[user];
    } catch (err) {
        return null;
    }
}

function generateAuthUrl(user) {
    try {
        const data = fs.readFileSync(CLIENT_ID_PATH, 'utf8');
        const creds = JSON.parse(data).installed;
        const oAuth2Client = new OAuth2Client(
            creds.client_id,
            creds.client_secret,
            'urn:ietf:wg:oauth:2.0:oob'
        );
        return oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            login_hint: user
        });
    } catch (err) {
        console.error('Failed to generate auth URL:', err.message);
        return null;
    }
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({
    dest: '/tmp/uploads/',
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'md2slides-server',
        timestamp: new Date().toISOString(),
        version: require('./package.json').version
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
        endpoints: {
            'GET /': 'This help page',
            'GET /health': 'Health check',
            'GET /version': 'Get md2gslides version',
            'GET /help': 'Get md2gslides CLI help',
            'POST /convert': 'Convert markdown file to Google Slides (multipart/form-data)',
            'POST /convert-text': 'Convert markdown text to Google Slides (JSON)'
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
            convertFile: {
                url: 'POST /convert',
                headers: { 'Content-Type': 'multipart/form-data' },
                body: 'Form data with "markdown" file field'
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

// Setup Google credentials if provided via environment variable
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

module.exports = app;

