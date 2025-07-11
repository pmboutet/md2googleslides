# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] - 2025-07-11

### 🚀 Added
- **Docker support**: Complete containerization with optimized Dockerfile
- **Docker Compose**: Development and production configurations
- **Makefile**: Automation tools for build, test, and deployment tasks
- **CI/CD Pipeline**: GitHub Actions workflow for automated testing and deployment
- **Security scanning**: Automated vulnerability detection with Trivy and npm audit
- **Test automation**: Comprehensive test scripts with multiple scenarios
- **Migration script**: Automated migration from legacy versions
- **Multi-architecture support**: Docker images for AMD64 and ARM64

### 🔧 Changed
- **Node.js requirement**: Minimum version updated to 18.0.0
- **Package name**: Changed from `md2gslides` to `md2gslides` for consistency
- **Build process**: Enhanced TypeScript compilation with Babel
- **Documentation**: Complete rewrite with Docker-first approach

### 🔒 Security
- **Dependencies updated**: All packages updated to latest secure versions
- **Removed deprecated packages**:
  - `babel-polyfill` → replaced with `core-js`
  - `request` and `request-promise-native` → replaced with `undici`
  - `highlight.js` updated from v10.7.3 to v11.10.0
- **Google APIs**: Updated to latest versions
  - `google-auth-library` from v7.1.2 to v9.14.1
  - `googleapis` from v78.0.0 to v144.0.0
- **Development dependencies**: All dev tools updated to latest versions
- **Docker security**: Non-root user implementation
- **Automated security scanning**: Integrated into CI/CD pipeline

### 📦 Updated Dependencies

#### Major Updates
- `core-js`: ^3.38.1 (new, replaces babel-polyfill)
- `undici`: ^6.20.0 (new, replaces request)
- `google-auth-library`: ^7.1.2 → ^9.14.1
- `googleapis`: ^78.0.0 → ^144.0.0
- `highlight.js`: ^10.7.3 → ^11.10.0
- `markdown-it`: ^12.0.6 → ^14.1.0
- `lowdb`: ^1.0 → ^7.0.1
- `lowlight`: ^1.20.0 → ^3.1.0
- `sharp`: ^0.28.0 → ^0.33.5
- `uuid`: ^8.3.2 → ^10.0.0

#### Development Dependencies
- `typescript`: 4.3.4 → ^5.6.3
- `mocha`: 9.0.1 → ^10.7.3
- `@babel/core`: 7.14.6 → ^7.25.8
- `@babel/cli`: 7.14.5 → ^7.25.7
- `gts`: 3.1.0 → ^5.3.1
- All `@types/*` packages updated to latest versions

### 🗑️ Removed
- `babel-polyfill`: Deprecated package
- `request`: Deprecated HTTP client
- `request-promise-native`: Deprecated promise wrapper
- Legacy build configurations

### 🐛 Fixed
- **Security vulnerabilities**: All known security issues resolved
- **Dependency conflicts**: Resolved package version conflicts
- **Build process**: Fixed TypeScript compilation issues
- **Docker permissions**: Proper file permissions in container

### 🏗️ Infrastructure
- **GitHub Actions**: Complete CI/CD pipeline
  - Multi-version Node.js testing (18, 20, 22)
  - Docker build and security scanning
  - Automated publishing to GitHub Container Registry
  - Security auditing with Snyk and Trivy
- **Development tools**:
  - Makefile with 20+ useful commands
  - Automated test scripts
  - Docker Compose for development
  - Migration automation
- **Documentation**:
  - Updated README with Docker-first approach
  - Comprehensive installation and migration guides
  - Troubleshooting and performance optimization guides

## [0.5.1] - Previous version
### Changes
- Original functionality maintained
- Various bug fixes and improvements

## [0.5.0] - Previous version
### Changes
- Core functionality
- Basic markdown to Google Slides conversion

---

## Migration Guide

### From 0.5.1 to 0.5.2

#### Automatic Migration (Recommended)
```bash
curl -sSL https://raw.githubusercontent.com/pmboutet/md2googleslides/main/scripts/migrate.sh | bash
```

#### Manual Migration
1. **Backup current setup**
```bash
cp package.json package.json.backup
cp -r node_modules node_modules.backup 2>/dev/null || true
```

2. **Update package.json**
Replace your `package.json` with the new version from this repository.

3. **Install new dependencies**
```bash
rm -rf node_modules package-lock.json
npm install
```

4. **Compile and test**
```bash
npm run compile
npm test
```

5. **Optional: Add Docker support**
Copy the following files from this repository:
- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `Makefile`
- `scripts/`

### Breaking Changes

#### Node.js Version
- **Minimum Node.js version**: 18.0.0 (previously ~12.0.0)
- **Reason**: Security updates and modern JavaScript features

#### Package Changes
- **Package name**: Some imports might need updating
- **Removed packages**: If you're directly importing removed packages, update your code:
  - `babel-polyfill` → `core-js`
  - `request` → `undici` or native `fetch`

#### API Changes
- **No breaking API changes**: All existing functionality preserved
- **Command line interface**: Unchanged
- **Programmatic usage**: Compatible with previous versions

### Rollback Instructions

If you encounter issues, you can rollback:

```bash
# Restore backup
cp package.json.backup package.json
rm -rf node_modules package-lock.json
npm install
npm run compile
```

### Support

If you encounter any issues during migration:
1. Check the [troubleshooting guide](README.md#🚨-résolution-de-problèmes)
2. Run the migration in dry-run mode first: `./migrate.sh --dry-run`
3. [Open an issue](https://github.com/pmboutet/md2googleslides/issues) with details

---

## Contributors

- **Pierre-Marie Boutet** - Maintenance and security updates
- **Steven Bazyl** - Original author
- **Google Workspace Team** - Core development
- **Community contributors** - Bug fixes and improvements

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.