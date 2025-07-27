# Service Discover - Documentation Complète

## Vue d'ensemble

Le service **Discover** de md2googleslides permet d'analyser et d'extraire les métadonnées d'une présentation Google Slides existante. Il fournit des informations détaillées sur la structure de la présentation, incluant les layouts, les slides, et leurs placeholders respectifs.

## Fonctionnalités principales

- **Extraction de métadonnées** : Récupère la structure complète d'une présentation
- **Analyse des layouts** : Identifie tous les modèles de mise en page disponibles
- **Mapping des placeholders** : Localise et caractérise tous les espaces réservés
- **Système de marqueurs** : Ajoute automatiquement des marqueurs pour le tracking
- **Support OAuth 2.0** : Authentification sécurisée avec Google APIs

## Architecture technique

### Endpoint principal

```
GET /discover
```

### Paramètres requis

| Paramètre | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `id` ou `presentationId` | string | ID de la présentation Google Slides | `1A2B3C4D5E6F7G8H9I0J` |
| `user` | string | Email de l'utilisateur (optionnel, défaut: 'default') | `user@example.com` |

### Structure de réponse

```typescript
interface PresentationMeta {
  presentationId: string;
  title?: string;
  layouts: LayoutMeta[];
  slides: SlideMeta[];
}

interface LayoutMeta {
  objectId: string;
  name?: string;
  displayName?: string;
  placeholders: PlaceholderMeta[];
}

interface SlideMeta {
  objectId: string;
  layout?: string;
  title?: string;
  index: number;
  placeholders: PlaceholderMeta[];
}

interface PlaceholderMeta {
  objectId: string;
  type?: string;
  text?: string;
  transform?: AffineTransform;
  size?: Size;
}
```

## Utilisation

### 1. Exemple de base

```bash
curl -X GET "https://your-domain.com/discover?id=1A2B3C4D5E6F7G8H9I0J&user=user@example.com"
```

### 2. Avec JavaScript/Node.js

```javascript
const axios = require('axios');

async function discoverPresentation(presentationId, userEmail) {
  try {
    const response = await axios.get('/discover', {
      params: {
        id: presentationId,
        user: userEmail
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la découverte:', error.response.data);
    throw error;
  }
}

// Utilisation
const metadata = await discoverPresentation('1A2B3C4D5E6F7G8H9I0J', 'user@example.com');
console.log('Layouts disponibles:', metadata.presentation.layouts.length);
console.log('Nombre de slides:', metadata.presentation.slides.length);
```

### 3. Réponse type

```json
{
  "success": true,
  "presentation": {
    "presentationId": "1A2B3C4D5E6F7G8H9I0J",
    "title": "Ma Présentation",
    "layouts": [
      {
        "objectId": "layout_1",
        "name": "TITLE_SLIDE",
        "displayName": "Slide de titre",
        "placeholders": [
          {
            "objectId": "placeholder_1",
            "type": "TITLE",
            "text": "Titre de la présentation"
          },
          {
            "objectId": "placeholder_2",
            "type": "SUBTITLE",
            "text": "Sous-titre"
          }
        ]
      }
    ],
    "slides": [
      {
        "objectId": "slide_1",
        "layout": "Slide de titre",
        "title": "Ma Présentation",
        "index": 0,
        "placeholders": [
          {
            "objectId": "title_obj_1",
            "type": "TITLE",
            "text": "Ma Présentation"
          }
        ]
      }
    ]
  }
}
```

## Système de marqueurs

Le service implémente un système de marqueurs automatique pour faciliter le tracking des slides lors des modifications ultérieures.

### Fonctionnement

1. **Vérification** : Le service vérifie si chaque slide possède un marqueur dans ses notes
2. **Ajout automatique** : Si absent, un marqueur `md2gs-slide:{index}` est ajouté
3. **Préfixe standardisé** : Tous les marqueurs utilisent le préfixe `md2gs-slide:`

### Code source (TypeScript)

```typescript
const MARKER_PREFIX = 'md2gs-slide:';

// Vérification et ajout des marqueurs
presentation.slides?.forEach((slide, idx) => {
  const notesPage = slide.slideProperties?.notesPage;
  const speakerObjectId = notesPage?.notesProperties?.speakerNotesObjectId;
  
  if (!speakerObjectId) return;
  
  const hasMarker = notesPage.pageElements?.some(el =>
    el.shape?.text?.textElements?.some(te =>
      te.textRun?.content?.startsWith(MARKER_PREFIX)
    )
  );
  
  if (!hasMarker) {
    requests.push({
      insertText: {
        objectId: speakerObjectId,
        text: `${MARKER_PREFIX}${idx}\n`,
        insertionIndex: 0,
      },
    });
  }
});
```

## Cas d'usage

### 1. Analyse de structure avant conversion

```javascript
// Analyser une présentation existante avant d'y ajouter du contenu
const metadata = await discoverPresentation(existingPresentationId);

// Identifier les layouts disponibles
const titleLayouts = metadata.presentation.layouts.filter(
  layout => layout.name?.includes('TITLE')
);

// Compter les slides par type
const slidesByLayout = metadata.presentation.slides.reduce((acc, slide) => {
  const layout = slide.layout || 'Unknown';
  acc[layout] = (acc[layout] || 0) + 1;
  return acc;
}, {});
```

### 2. Validation avant append

```javascript
// Vérifier qu'une présentation est compatible avant append
async function validateForAppend(presentationId) {
  const metadata = await discoverPresentation(presentationId);
  
  if (metadata.presentation.slides.length === 0) {
    throw new Error('Présentation vide - impossible d\'appendre');
  }
  
  // Vérifier les layouts requis
  const hasContentLayout = metadata.presentation.layouts.some(
    layout => layout.name?.includes('CONTENT') || layout.name?.includes('BODY')
  );
  
  if (!hasContentLayout) {
    console.warn('Aucun layout de contenu détecté');
  }
  
  return metadata;
}
```

### 3. Inspection des placeholders

```javascript
// Analyser les types de placeholders disponibles
function analyzePlaceholders(metadata) {
  const placeholderTypes = new Set();
  
  metadata.presentation.layouts.forEach(layout => {
    layout.placeholders.forEach(ph => {
      if (ph.type) placeholderTypes.add(ph.type);
    });
  });
  
  return Array.from(placeholderTypes);
}

const availableTypes = analyzePlaceholders(metadata);
console.log('Types de placeholders:', availableTypes);
// Sortie possible: ['TITLE', 'BODY', 'SUBTITLE', 'CENTERED_TITLE']
```

## Gestion des erreurs

### Erreurs d'authentification

```json
{
  "error": "authorization_required",
  "auth_url": "https://accounts.google.com/oauth/authorize?...",
  "message": "Please authorize this app by visiting the URL provided"
}
```

**Solution** : Suivre l'URL d'autorisation pour obtenir les tokens OAuth.

### Présentation non trouvée

```json
{
  "error": "Failed to discover presentation"
}
```

**Causes possibles** :
- ID de présentation invalide
- Présentation supprimée
- Permissions insuffisantes
- Présentation dans un autre compte Google

### Présentation inaccessible

```json
{
  "error": "authorization_failed",
  "message": "Failed to generate authorization URL"
}
```

**Solution** : Vérifier la configuration OAuth dans `~/.md2googleslides/client_id.json`.

## Intégration avec md2googleslides

Le service discover s'intègre parfaitement avec les autres fonctionnalités :

### 1. Workflow complet

```bash
# 1. Découvrir la structure
curl -X GET "/discover?id=PRESENTATION_ID&user=user@example.com"

# 2. Utiliser les informations pour la conversion
curl -X POST "/convert-advanced" \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Nouveau contenu\n\n## Section additionnelle",
    "user": "user@example.com",
    "append_to_id": "PRESENTATION_ID"
  }'
```

### 2. Script d'automatisation

```javascript
async function smartConversion(markdownContent, targetPresentationId) {
  // 1. Analyser la présentation cible
  const metadata = await discoverPresentation(targetPresentationId);
  
  // 2. Déterminer la stratégie (append vs new)
  const strategy = metadata.presentation.slides.length > 5 ? 'append' : 'template';
  
  // 3. Exécuter la conversion appropriée
  if (strategy === 'append') {
    return await convertAdvanced({
      markdown: markdownContent,
      append_to_id: targetPresentationId
    });
  } else {
    return await convertAdvanced({
      markdown: markdownContent,
      template_id: targetPresentationId
    });
  }
}
```

## Configuration et sécurité

### Permissions requises

Le service discover nécessite les scopes Google suivants :
- `https://www.googleapis.com/auth/presentations`
- `https://www.googleapis.com/auth/drive`

### Authentification

```javascript
// Vérification du token avant utilisation
function checkAuthStatus(userEmail) {
  return fetch(`/discover?id=test&user=${userEmail}`)
    .then(response => {
      if (response.status === 401) {
        // Redirection OAuth nécessaire
        return response.json().then(data => data.auth_url);
      }
      return null; // Authentifié
    });
}
```

## Limites et considérations

### Performance
- **Latence** : ~2-5 secondes selon la complexité de la présentation
- **Rate limiting** : Respecte les limites de l'API Google Slides
- **Cache** : Pas de mise en cache intégrée (recommandé côté client)

### Limitations techniques
- **Taille maximale** : Dépend des limites Google Slides (généralement 100 MB)
- **Slides simultanés** : Maximum ~500 slides par présentation
- **Complexité** : Les éléments très complexes peuvent ne pas être entièrement mappés

### Recommandations

1. **Mise en cache** : Implémenter un cache côté client pour éviter les appels répétés
2. **Retry logic** : Gérer les timeouts et erreurs temporaires
3. **Validation** : Toujours valider l'ID de présentation avant l'appel
4. **Monitoring** : Surveiller les quotas API Google

## Support et dépannage

### Logs de débogage

Pour activer les logs détaillés :

```bash
DEBUG=md2gslides node server.js
```

### Problèmes courants

1. **"Missing presentation ID"**
   - Vérifier que le paramètre `id` ou `presentationId` est fourni

2. **"Failed to create OAuth client"**
   - Vérifier le fichier `~/.md2googleslides/client_id.json`
   - Renouveler les credentials OAuth si nécessaire

3. **Timeouts fréquents**
   - Réduire la complexité des présentations
   - Implémenter un système de retry

### Contact et contributions

- **Issues** : [GitHub Issues](https://github.com/pmboutet/md2googleslides/issues)
- **Documentation** : Consultez les autres fichiers dans `/docs/`
- **API Reference** : Endpoint `/` pour la documentation interactive

---

*Cette documentation couvre la version actuelle du service discover. Pour les mises à jour, consultez le [CHANGELOG.md](../CHANGELOG.md).*
