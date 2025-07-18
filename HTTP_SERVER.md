# md2googleslides HTTP Server

This adds HTTP API server capability to md2googleslides, allowing it to run as a service instead of just a CLI tool.

## Features

- 🌐 **HTTP API** - RESTful endpoints for markdown conversion
- 📁 **File upload support** - Accept markdown files via multipart/form-data
- 📝 **Text input support** - Accept markdown content as JSON
- 🔍 **Health checks** - Built-in health monitoring endpoint
- 🛡️ **Security** - Non-root container execution
- 📊 **Google Slides integration** - Full feature parity with CLI version

## API Endpoints

### Health Check
```bash
GET /health
# Response: {"status": "healthy", "service": "md2slides-server", "timestamp": "..."}
```

### Convert Markdown Text
```bash
POST /convert-text
Content-Type: application/json

{
  "markdown": "# My Presentation\n\n## Slide 1\nContent here",
  "title": "My Presentation",
  "user": "user@example.com",
  "style": "github"
}
```

### Convert Markdown File
```bash
POST /convert
Content-Type: multipart/form-data

# Form data with 'markdown' file field
```

### Other Endpoints
- `GET /` - API documentation
- `GET /version` - Get md2gslides version
- `GET /help` - Get CLI help

## Environment Variables

- `PORT` - Server port (default: 3000)
- `GOOGLE_CREDENTIALS_JSON` - Google service account credentials
- `NODE_ENV` - Environment mode (production/development)

## OAuth Credentials

The HTTP service expects credentials from a Google **Web application** OAuth
client. When creating the OAuth client in the Google Cloud Console, add
`http://localhost` to the list of authorized redirect URIs. Download the JSON
file and place it as `client_id.json` under `~/.md2googleslides/` so the server
can prompt for user authorization when needed.

## Docker Usage

### Build and Run
```bash
# Build the image
docker build -t md2slides-server .

# Run the server
docker run -p 3000:3000 \
  -e GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}' \
  md2slides-server
```

### Docker Compose
```yaml
services:
  md2slides:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GOOGLE_CREDENTIALS_JSON=${GOOGLE_CREDENTIALS_JSON}
    restart: unless-stopped
```

## Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Or run directly
node server.js
```

## Integration with N8N

The HTTP API is designed to work seamlessly with N8N workflows:

```javascript
// N8N HTTP Request node configuration
{
  "method": "POST",
  "url": "http://md2slides:3000/convert-text",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "markdown": "{{$json.markdown_content}}",
    "title": "{{$json.presentation_title}}",
    "user": "{{$json.user_email}}"
  }
}
```

## Response Format

Successful conversion returns:
```json
{
  "success": true,
  "output": "CLI output...",
  "presentationUrl": "https://docs.google.com/presentation/d/...",
  "message": "Conversion completed successfully"
}
```

Error response:
```json
{
  "error": "Conversion failed",
  "details": "Error details...",
  "command": "Sanitized command that was executed"
}
```

## Security Features

- Non-root container execution
- Input validation and sanitization
- Temporary file cleanup
- Resource limits and timeouts
- Health monitoring
- Credential masking in logs

## Monitoring

The service includes comprehensive health checks and monitoring:

- Container health checks via `/health` endpoint
- Docker healthcheck integration
- Graceful shutdown handling
- Resource monitoring ready