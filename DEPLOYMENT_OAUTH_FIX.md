# Instructions de déploiement avec OAuth fixé

## Modifications apportées

### 1. Dockerfile mis à jour
- ✅ Permissions correctes pour `/home/md2gslides/.md2googleslides`
- ✅ Dossier credentials accessible en écriture pour l'utilisateur `md2gslides`
- ✅ Commandes `chmod -R 755` pour les permissions appropriées

### 2. docker-compose.yml corrigé
- ✅ **Suppression du flag `:ro` (read-only)** sur le volume credentials
- ✅ Volume `./credentials:/home/md2gslides/.md2googleslides` maintenant en lecture/écriture
- ✅ Persistance des tokens OAuth garantie

## Instructions pour le rebuild

### 1. Cloner/mettre à jour le repository
```bash
cd /opt/app
git pull origin main
```

### 2. Préparer le dossier credentials
```bash
# Créer le dossier credentials sur l'hôte
mkdir -p ./credentials

# Copier votre client_id.json existant
cp ~/.md2googleslides/client_id.json ./credentials/
```

### 3. Arrêter et rebuilder les conteneurs
```bash
# Arrêter le conteneur actuel
docker-compose down md2slides

# Rebuilder l'image
docker-compose build md2googleslides

# Redémarrer le service
docker-compose up -d md2googleslides
```

### 4. Vérifier le déploiement
```bash
# Vérifier que le conteneur démarre correctement
docker-compose logs -f md2googleslides

# Tester la santé du service
curl http://localhost:3000/health
```

## Test OAuth après redéploiement

### 1. Demander une nouvelle autorisation
```bash
curl -X POST http://localhost:3000/convert-text \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test Presentation\n\n## Slide 1\nHello World!","user":"contact@groupe-pmvb.com"}'
```

### 2. Visiter l'URL d'autorisation retournée

### 3. Tester le callback OAuth
```bash
# Utiliser le nouveau code d'autorisation
curl "http://localhost:3000/oauth/callback?state=contact@groupe-pmvb.com&code=NOUVEAU_CODE&scope=..."
```

### 4. Vérifier le stockage des tokens
```bash
# Les tokens devraient maintenant être stockés avec succès
docker exec md2slides ls -la /home/md2gslides/.md2googleslides/
```

Vous devriez voir le fichier `credentials.json` créé avec succès !

## Résolution des problèmes

### Si le dossier credentials n'existe pas
```bash
docker exec md2slides mkdir -p /home/md2gslides/.md2googleslides
```

### Si les permissions sont incorrectes
```bash
docker exec md2slides chown -R md2gslides:nodejs /home/md2gslides/.md2googleslides
docker exec md2slides chmod -R 755 /home/md2gslides/.md2googleslides
```

### Logs de diagnostic
```bash
# Voir les logs détaillés du conteneur
docker logs md2slides -f

# Vérifier les permissions dans le conteneur
docker exec md2slides ls -la /home/md2gslides/
```

## Configuration Google Cloud Console

Assurez-vous que dans Google Cloud Console :
- **Type de client** : Application Web
- **URI de redirection autorisée** : `http://localhost:3000/oauth/callback`
- **Origines JavaScript autorisées** (optionnel) : `http://localhost:3000`

Le problème "read-only file system" est maintenant résolu ! 🎯
