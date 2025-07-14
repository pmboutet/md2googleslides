# Development Best Practices

## 🔧 Setup and Maintenance

### Initial Setup
```bash
# Clone and setup
git clone https://github.com/pmboutet/md2googleslides.git
cd md2googleslides

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh dev
```

### Adding New Dependencies

**❌ Don't do this:**
```bash
# This will cause package-lock.json sync issues
npm install express --save
git commit -am "Add express"
```

**✅ Do this instead:**
```bash
# 1. Add dependency
npm install express --save

# 2. Validate lockfile
./scripts/setup.sh validate

# 3. Commit both files
git add package.json package-lock.json
git commit -m "📦 Add express dependency"
```

### Docker Build Issues

**Common Issue:** `package-lock.json` out of sync

**Solutions:**
1. **Quick fix:** Use the robust Dockerfile that handles mismatches
2. **Proper fix:** Update lockfile and commit it
3. **Emergency fix:** Use setup script to regenerate

```bash
# Quick validation
./scripts/setup.sh validate

# Fix package-lock.json
./scripts/setup.sh fix-lock
```

### CI/CD Integration

The GitHub Actions will automatically:
- ✅ Validate package-lock.json consistency
- ✅ Test Docker builds
- ✅ Run health checks
- ❌ Block merges if lockfile is broken

### Troubleshooting

#### Package Lock Issues
```bash
# Symptoms: npm ci fails with "Missing: package@version"
# Solution:
rm package-lock.json
npm install
git add package-lock.json
git commit -m "🔧 Fix package-lock.json"
```

#### Docker Build Failures
```bash
# Use the robust Dockerfile approach
docker build --no-cache -t md2slides .

# Or use setup script approach
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "
  npm install && 
  npm run compile && 
  node -c server.js
"
```

#### Server Won't Start
```bash
# Validate server.js syntax
node -c server.js

# Check dependencies
npm ls express multer

# Test with setup script
./scripts/setup.sh validate
```

## 🚀 Production Deployment

### Environment Variables Required
- `GOOGLE_CREDENTIALS_JSON` - Google service account JSON
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to "production"

### Health Monitoring
- Health endpoint: `GET /health`
- Docker healthcheck: Built-in
- Expected response: `{"status": "healthy", "service": "md2slides-server"}`

### Performance Tuning
- Container memory: 2GB recommended
- CPU: 1-2 cores sufficient
- Timeout: 5 minutes for large presentations

## 🔄 Maintenance

### Updates
```bash
# Update dependencies
npm update
npm audit fix

# Validate after updates
./scripts/setup.sh validate

# Test build
docker build -t md2slides-test .
```

### Monitoring
- Check `/health` endpoint regularly
- Monitor Docker container logs
- Watch for memory/CPU usage spikes

---

**Remember:** Always validate changes with `./scripts/setup.sh validate` before committing!