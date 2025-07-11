# Troubleshooting Guide

## 🚨 Problèmes de compilation TypeScript

### Erreur: lowdb API incompatible

**Symptôme:**
```
error TS2724: 'lowdb' has no exported member named 'LowdbSync'. Did you mean 'LowSync'?
```

**Solution:**
Les fichiers source ont été mis à jour pour utiliser l'API lowdb v7. Si vous rencontrez encore cette erreur :

1. **Nettoyage complet:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run compile
```

2. **Vérification des versions:**
```bash
npm list lowdb
# Doit afficher lowdb@7.0.1
```

### Erreur: Babel plugin obsolète

**Symptôme:**
```
@babel/plugin-proposal-class-properties has been deprecated
```

**Solution:**
Le fichier `.babelrc` a été mis à jour pour utiliser `@babel/plugin-transform-class-properties`. 

Vérifiez que votre `.babelrc` contient :
```json
{
  "plugins": [
    "@babel/plugin-transform-class-properties"
  ]
}
```

### Erreur: @types packages problématiques

**Symptôme:**
```
This is a stub types definition. [package] provides its own type definitions
```

**Solution:**
Certains packages @types ont été supprimés du package.json car les packages principaux fournissent maintenant leurs propres types.

Packages supprimés :
- `@types/lowdb` 
- `@types/lowlight`
- `@types/sharp`
- `@types/parse5`
- `@types/mkdirp`

## 🐳 Problèmes Docker

### Build Docker échoue

**Solution étape par étape:**

1. **Vérification de l'environnement:**
```bash
docker --version
make check-env
```

2. **Build sans cache:**
```bash
docker build --no-cache -t md2googleslides:latest .
```

3. **Logs détaillés:**
```bash
docker build --progress=plain --no-cache -t md2googleslides:latest .
```

### Permissions dans le container

**Symptôme:**
```
Permission denied accessing credentials
```

**Solution:**
```bash
# Vérifier les permissions des credentials
ls -la ~/.md2googleslides/
chmod 600 ~/.md2googleslides/client_id.json

# Rebuild l'image
docker build --no-cache -t md2googleslides:latest .
```

## 📦 Problèmes npm

### Installation échoue

**Solution complète:**

1. **Nettoyage complet:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
```

2. **Installation avec logs:**
```bash
npm install --verbose
```

3. **Si les erreurs persistent:**
```bash
npm install --legacy-peer-deps
```

### Script prepublish échoue

**Symptôme:**
L'installation npm déclenche automatiquement `npm run compile` qui échoue.

**Solution:**
```bash
# Installation sans scripts
npm install --ignore-scripts

# Compilation manuelle après
npm run compile
```

## 🔧 Problèmes de dépendances

### Version Node.js incompatible

**Symptôme:**
```
Unsupported engine: node@<16
```

**Solution:**
Mise à jour Node.js vers la version 18 ou supérieure :
```bash
# Avec nvm
nvm install 18
nvm use 18

# Vérification
node --version  # Doit être >= 18.0.0
```

### Dépendances manquantes

**Solution de diagnostic:**
```bash
# Audit des dépendances
npm audit

# Vérification des peer dependencies
npm ls --depth=0

# Installation force si nécessaire
npm install --force
```

## 🛠️ Tests de diagnostic

### Script de test rapide

Utilisez le script de test intégré :
```bash
chmod +x scripts/test-compile.sh
./scripts/test-compile.sh
```

### Tests manuels étape par étape

1. **Test TypeScript seul:**
```bash
npx tsc --noEmit --skipLibCheck
```

2. **Test Babel seul:**
```bash
npx babel --extensions '.ts,.js' -d lib/ src/
```

3. **Test des imports:**
```bash
node -e "console.log(require('./lib/auth.js'))"
```

## 🔍 Debug avancé

### Logs détaillés npm

```bash
npm install --loglevel=verbose 2>&1 | tee install.log
```

### Debug TypeScript

```bash
npx tsc --noEmit --skipLibCheck --listFiles
```

### Debug Babel

```bash
npx babel src/auth.ts --out-file /tmp/auth.js --verbose
```

## 📞 Support

Si les problèmes persistent après avoir suivi ce guide :

1. **Vérifiez la version de Node.js:**
```bash
node --version  # Doit être >= 18.0.0
npm --version   # Doit être >= 8.0.0
```

2. **Collectez les informations de diagnostic:**
```bash
npm ls --depth=0 > deps.log
npm config list > config.log
node --version > versions.log
```

3. **Créez une issue GitHub** avec :
   - Versions de Node.js et npm
   - Logs d'erreur complets
   - OS et architecture
   - Étapes pour reproduire

## 🚀 Migration depuis l'ancienne version

Si vous migrez depuis une version antérieure :

1. **Backup complet:**
```bash
cp package.json package.json.backup
cp -r node_modules node_modules.backup 2>/dev/null || true
```

2. **Migration automatique:**
```bash
curl -sSL https://raw.githubusercontent.com/pmboutet/md2googleslides/main/scripts/migrate.sh | bash
```

3. **Migration manuelle si automatique échoue:**
```bash
# Remplacer package.json avec la nouvelle version
# Supprimer node_modules
rm -rf node_modules package-lock.json
npm install
npm run compile
```

## ✅ Validation finale

Une fois tous les problèmes résolus :

```bash
# Test complet
make test

# Test Docker
make docker-test

# Validation finale
echo "✅ Installation réussie !"
```