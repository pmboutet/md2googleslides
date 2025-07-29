# MD2SLIDES_CONVERTER Service Documentation

## Vue d'ensemble

Le service `md2slides_converter` est un middleware Python qui facilite la conversion de markdown en Google Slides via le service md2googleslides. Il offre des fonctionnalités avancées comme la gestion des templates, l'ajout de contenu à des présentations existantes, et le partage automatique.

## Endpoints HTTP Disponibles

### 1. `/convert-advanced` (NOUVEAU)

Endpoint avancé avec support complet des nouvelles fonctionnalités.

**URL:** `POST /convert-advanced`
**Content-Type:** `application/json`

#### Paramètres d'entrée

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `markdown` | string | ✅ | Contenu markdown à convertir |
| `title` | string | ❌ | Titre de la présentation (défaut: "Présentation générée") |
| `user` | string | ❌ | Email de l'utilisateur OAuth (défaut: "contact@groupe-pmvb.com") |
| `template_id` | string | ❌ | ID du template Google Slides à utiliser comme base |
| `append_to_id` | string | ❌ | ID de la présentation existante à modifier |
| `auto_share` | boolean | ❌ | Partager automatiquement (défaut: true) |
| `share_emails` | array | ❌ | Liste des emails à partager avec leur rôle |
| `use_fileio` | boolean | ❌ | Permettre l'upload d'images locales |
| `dry_run` | boolean | ❌ | Mode test sans création réelle |

#### Exemples d'utilisation

##### Cas d'usage 1: Créer une présentation avec template

```bash
curl -X POST http://localhost:3000/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Ma Présentation\n\n## Slide 1\nContenu ici",
    "title": "Présentation avec Template",
    "user": "contact@groupe-pmvb.com",
    "template_id": "1ABC123_TEMPLATE_ID"
  }'
```

**Variables d'environnement pour ce cas:**
```bash
export MD2GOOGLESLIDES_URL="http://localhost:3000"
export TEMPLATE_ID="1ABC123_TEMPLATE_ID"
export USER_EMAIL="contact@groupe-pmvb.com"

curl -X POST $MD2GOOGLESLIDES_URL/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Ma Présentation\n\n## Slide 1\nContenu ici",
    "title": "Présentation avec Template",
    "user": "'$USER_EMAIL'",
    "template_id": "'$TEMPLATE_ID'"
  }'
```

##### Cas d'usage 2: Ajouter du contenu à une présentation existante

```bash
curl -X POST http://localhost:3000/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "## Nouvelle Section\n\nContenu à ajouter",
    "title": "Ajout de contenu",
    "user": "contact@groupe-pmvb.com",
    "append_to_id": "1XYZ789_EXISTING_PRESENTATION"
  }'
```

**Variables d'environnement pour ce cas:**
```bash
export MD2GOOGLESLIDES_URL="http://localhost:3000"
export EXISTING_PRESENTATION_ID="1XYZ789_EXISTING_PRESENTATION"
export USER_EMAIL="contact@groupe-pmvb.com"

curl -X POST $MD2GOOGLESLIDES_URL/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "## Nouvelle Section\n\nContenu à ajouter",
    "title": "Ajout de contenu",
    "user": "'$USER_EMAIL'",
    "append_to_id": "'$EXISTING_PRESENTATION_ID'"
  }'
```

##### Cas d'usage 3: Combinaison template + append

```bash
curl -X POST http://localhost:3000/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "## Contenu Additionnel\n\nNouveaux slides avec le style du template",
    "title": "Template + Append",
    "user": "contact@groupe-pmvb.com",
    "template_id": "1ABC123_TEMPLATE_ID",
    "append_to_id": "1XYZ789_EXISTING_PRESENTATION"
  }'
```

**Variables d'environnement pour ce cas:**
```bash
export MD2GOOGLESLIDES_URL="http://localhost:3000"
export TEMPLATE_ID="1ABC123_TEMPLATE_ID"
export EXISTING_PRESENTATION_ID="1XYZ789_EXISTING_PRESENTATION"
export USER_EMAIL="contact@groupe-pmvb.com"

curl -X POST $MD2GOOGLESLIDES_URL/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "## Contenu Additionnel\n\nNouveaux slides avec le style du template",
    "title": "Template + Append",
    "user": "'$USER_EMAIL'",
    "template_id": "'$TEMPLATE_ID'",
    "append_to_id": "'$EXISTING_PRESENTATION_ID'"
  }'
```

##### Cas d'usage 4: Partage automatique avec plusieurs utilisateurs

```bash
curl -X POST http://localhost:3000/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Présentation Partagée\n\n## Contenu important",
    "title": "Présentation avec partage",
    "user": "contact@groupe-pmvb.com",
    "auto_share": true,
    "share_emails": [
      {"email": "colleague@example.com", "role": "writer"},
      {"email": "manager@example.com", "role": "reader"}
    ]
  }'
```

**Variables d'environnement pour ce cas:**
```bash
export MD2GOOGLESLIDES_URL="http://localhost:3000"
export USER_EMAIL="contact@groupe-pmvb.com"
export COLLEAGUE_EMAIL="colleague@example.com"
export MANAGER_EMAIL="manager@example.com"

curl -X POST $MD2GOOGLESLIDES_URL/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Présentation Partagée\n\n## Contenu important",
    "title": "Présentation avec partage",
    "user": "'$USER_EMAIL'",
    "auto_share": true,
    "share_emails": [
      {"email": "'$COLLEAGUE_EMAIL'", "role": "writer"},
      {"email": "'$MANAGER_EMAIL'", "role": "reader"}
    ]
  }'
```

### 2. `/convert-text` (Legacy)

Endpoint existant pour la compatibilité rétroactive.

### 3. `/convert` (Legacy)

Endpoint existant avec upload de fichier.

### 4. Macros `{copy}` et `{edit}`

Le service supporte désormais deux macros dans le markdown permettant de
dupliquer ou de modifier une slide existante sans passer par un nouvel
endpoint :

```markdown
{copy="ID_DE_LA_SLIDE"}
{.bloc="ID_DU_BLOC"}
Nouveau contenu du bloc
```

- `{copy=id}` crée une nouvelle slide en dupliquant celle dont l'identifiant est
  fourni.
- `{edit=id}` applique les mises à jour directement sur la slide existante.
- Les attributs `{.bloc=...}` servent à cibler l'élément (texte, image ou vidéo)
  à remplacer dans la slide copiée ou éditée.

Ces macros fonctionnent avec l'endpoint `/convert-advanced` déjà présent. Il
suffit d'inclure les directives dans le markdown envoyé à l'API.

## Concepts Clés

### Template ID vs Append ID

- **`template_id`** = "copier le style" 🎨
  - Utilise un template existant comme base de design
  - Crée une nouvelle présentation avec le style du template
  - Les slides du template ne sont pas copiés, seul le style l'est

- **`append_to_id`** = "ajouter du contenu" ➕📄
  - Ajoute de nouveaux slides à une présentation existante
  - Conserve tout le contenu existant
  - Les nouveaux slides suivent le style de la présentation existante

- **Combinaison template + append** = "ajouter avec style" 🎨➕📄
  - Ajoute du contenu à une présentation existante
  - Mais applique le style d'un template différent aux nouveaux slides
  - Cas d'usage avancé pour maintenir la cohérence visuelle

## Réponse Type

```json
{
  "status": "success",
  "presentation_id": "1DEF456_NEW_PRESENTATION_ID",
  "presentation_url": "https://docs.google.com/presentation/d/1DEF456_NEW_PRESENTATION_ID/edit",
  "edit_url": "https://docs.google.com/presentation/d/1DEF456_NEW_PRESENTATION_ID/edit",
  "preview_url": "https://docs.google.com/presentation/d/1DEF456_NEW_PRESENTATION_ID/preview",
  "export_pdf_url": "https://docs.google.com/presentation/d/1DEF456_NEW_PRESENTATION_ID/export/pdf",
  "service": "md2googleslides-advanced",
  "method": "http_api",
  "timestamp": "2025-07-19T14:30:00.000Z",
  "raw_output": "Detailed CLI output..."
}
```

## Intégration avec md2slides_converter Service

Le service Python `md2slides_converter` utilise cet endpoint comme méthode principale et propose des fallbacks automatiques :

1. **HTTP Advanced** (`/convert-advanced`) - Méthode principale
2. **HTTP Legacy** (`/convert-text`) - Fallback 1
3. **Docker** - Fallback 2  
4. **CLI** - Fallback 3

## Variables d'Environnement Recommandées

```bash
# Configuration du service
export MD2GOOGLESLIDES_URL="http://md2slides:3000"
export DEFAULT_USER_EMAIL="contact@groupe-pmvb.com"

# Templates et présentations fréquemment utilisées
export COMPANY_TEMPLATE_ID="1ABC123_COMPANY_TEMPLATE"
export STANDARD_PRESENTATION_ID="1XYZ789_STANDARD_PRESENTATION"

# Partage par défaut
export DEFAULT_SHARE_EMAILS='[{"email":"contact@getflowdesign.com","role":"writer"},{"email":"contact@groupe-pmvb.com","role":"writer"}]'
```

## Gestion des Erreurs

### Erreurs d'Autorisation

```json
{
  "error": "authorization_required",
  "auth_url": "https://accounts.google.com/oauth2/auth?...",
  "message": "Please authorize this app by visiting the URL provided",
  "service": "md2googleslides-advanced"
}
```

### Erreurs de Conversion

```json
{
  "error": "Conversion failed",
  "details": "Detailed error message",
  "command": "--user \"[REDACTED]\"",
  "service": "md2googleslides-advanced",
  "method": "http_api"
}
```

### Erreurs de Paramètres

```json
{
  "error": "No markdown content provided",
  "service": "md2googleslides-advanced"
}
```

## Scripts Bash Pratiques

### Script de test complet

```bash
#!/bin/bash
# test_md2slides_converter.sh

# Configuration
export MD2GOOGLESLIDES_URL="http://localhost:3000"
export USER_EMAIL="contact@groupe-pmvb.com"
export TEMPLATE_ID="1ABC123_TEMPLATE_ID"
export EXISTING_PRESENTATION_ID="1XYZ789_EXISTING_PRESENTATION"

# Test 1: Présentation simple
echo "Test 1: Présentation simple"
curl -X POST $MD2GOOGLESLIDES_URL/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Test Simple\n\n## Slide 1\nContenu de test",
    "title": "Test Simple",
    "user": "'$USER_EMAIL'",
    "dry_run": true
  }' | jq '.'

echo -e "\n---\n"

# Test 2: Avec template
echo "Test 2: Avec template"
curl -X POST $MD2GOOGLESLIDES_URL/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Test Template\n\n## Slide avec style\nContenu stylé",
    "title": "Test Template",
    "user": "'$USER_EMAIL'",
    "template_id": "'$TEMPLATE_ID'",
    "dry_run": true
  }' | jq '.'

echo -e "\n---\n"

# Test 3: Append
echo "Test 3: Append à présentation existante"
curl -X POST $MD2GOOGLESLIDES_URL/convert-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "## Nouveau Contenu\n\nAjout à la présentation",
    "title": "Test Append",
    "user": "'$USER_EMAIL'",
    "append_to_id": "'$EXISTING_PRESENTATION_ID'",
    "dry_run": true
  }' | jq '.'
```

### Script de déploiement

```bash
#!/bin/bash
# deploy_presentation.sh

MARKDOWN_FILE="$1"
TITLE="$2"
TEMPLATE_ID="$3"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <markdown_file> <title> [template_id]"
    exit 1
fi

if [ ! -f "$MARKDOWN_FILE" ]; then
    echo "Erreur: Fichier $MARKDOWN_FILE non trouvé"
    exit 1
fi

# Configuration
export MD2GOOGLESLIDES_URL="${MD2GOOGLESLIDES_URL:-http://localhost:3000}"
export USER_EMAIL="${USER_EMAIL:-contact@groupe-pmvb.com}"

# Lire le contenu markdown
MARKDOWN_CONTENT=$(cat "$MARKDOWN_FILE")

# Construire la requête JSON
JSON_DATA="{
    \"markdown\": $(echo "$MARKDOWN_CONTENT" | jq -R -s '.'),
    \"title\": \"$TITLE\",
    \"user\": \"$USER_EMAIL\"
}"

# Ajouter template_id si fourni
if [ -n "$TEMPLATE_ID" ]; then
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg template_id "$TEMPLATE_ID" '. + {template_id: $template_id}')
fi

echo "Création de la présentation: $TITLE"
echo "URL du service: $MD2GOOGLESLIDES_URL"

# Envoyer la requête
RESPONSE=$(curl -s -X POST $MD2GOOGLESLIDES_URL/convert-advanced \
  -H "Content-Type: application/json" \
  -d "$JSON_DATA")

# Vérifier la réponse
if echo "$RESPONSE" | jq -e '.status == "success"' > /dev/null; then
    echo "✅ Présentation créée avec succès!"
    PRESENTATION_URL=$(echo "$RESPONSE" | jq -r '.edit_url // .presentation_url')
    echo "🔗 URL: $PRESENTATION_URL"
    
    # Ouvrir automatiquement dans le navigateur (optionnel)
    if command -v xdg-open > /dev/null; then
        xdg-open "$PRESENTATION_URL"
    elif command -v open > /dev/null; then
        open "$PRESENTATION_URL"
    fi
else
    echo "❌ Erreur lors de la création:"
    echo "$RESPONSE" | jq '.'
    exit 1
fi
```

## Monitoring et Logs

### Health Check

```bash
curl -X GET http://localhost:3000/health | jq '.'
```

### Version Check

```bash
curl -X GET http://localhost:3000/version | jq '.'
```

### Logs du Service

Les logs du service md2slides peuvent être consultés via Docker :

```bash
# Logs en temps réel
docker logs -f md2slides

# Logs des dernières 100 lignes
docker logs --tail 100 md2slides
```

## Troubleshooting

### Problèmes Courants

1. **Erreur d'autorisation OAuth**
   - Vérifier que le fichier `client_id.json` est présent
   - S'assurer que l'utilisateur a autorisé l'application
   - Visiter l'URL d'autorisation fournie dans la réponse d'erreur

2. **Template ID invalide**
   - Vérifier que l'ID du template est correct
   - S'assurer que l'utilisateur a accès au template
   - Tester d'abord sans template_id

3. **Présentation inexistante pour append**
   - Vérifier l'ID de la présentation existante
   - S'assurer que l'utilisateur a les droits d'écriture
   - Tester d'abord la création d'une nouvelle présentation

4. **Timeout de conversion**
   - Réduire la taille du contenu markdown
   - Vérifier la connectivité réseau
   - Augmenter le timeout si nécessaire

### Debug Mode

Pour activer le mode debug, ajouter `"dry_run": true` à la requête. Cela affichera les commandes qui seraient exécutées sans créer réellement la présentation.

## Migration depuis l'ancien endpoint

Pour migrer du `/convert-text` vers `/convert-advanced` :

```bash
# Ancien format
curl -X POST /convert-text -d '{
  "markdown": "...",
  "title": "...",
  "user": "...",
  "style": "github",
  "appendId": "..."
}'

# Nouveau format
curl -X POST /convert-advanced -d '{
  "markdown": "...",
  "title": "...",
  "user": "...",
  "template_id": "...",      # Remplace style
  "append_to_id": "..."      # Remplace appendId
}'
```

Les paramètres `style` et `appendId` sont toujours supportés pour la compatibilité rétroactive, mais il est recommandé d'utiliser les nouveaux noms.
