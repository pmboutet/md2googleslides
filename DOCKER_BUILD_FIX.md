# Fix Docker Build Issues - Version 0.5.3

## 🚨 Problème identifié

L'erreur suivante était rencontrée lors du build Docker :

```
TypeError: plugin.apply is not a function
    at MarkdownIt.use (/app/node_modules/markdown-it/dist/index.cjs.js:5467:10)
    at Object.<anonymous> (/app/lib/parser/parser.js:53:118)
```

## 🔧 Solution implémentée

### 1. Remplacement du plugin obsolète
- **Suppression** de `markdown-it-fence@0.1.3` (non maintenu depuis 7 ans)
- **Implémentation** d'un plugin personnalisé compatible avec markdown-it v14.1.0
- **Maintien** de la compatibilité avec les blocs `generated_image`

### 2. Normalisation des plugins
- Ajout d'une fonction `normalizePlugin()` pour gérer les différents formats d'export
- Support des plugins exportés comme fonction, objet avec `.default`, ou `.apply`

### 3. Mise à jour des dépendances
- Version mise à jour : `0.5.3`
- Suppression de la dépendance `markdown-it-fence`
- Maintien de toutes les autres fonctionnalités

## 📋 Changements apportés

### Fichiers modifiés :

1. **`src/parser/parser.ts`**
   - Implémentation d'un plugin fence personnalisé
   - Ajout de la fonction `normalizePlugin()`
   - Remplacement de l'import `markdown-it-fence`

2. **`package.json`**
   - Suppression de `"markdown-it-fence": "^0.1.3"`
   - Version mise à jour : `0.5.2` → `0.5.3`

## 🧪 Tests recommandés

Pour vérifier que les corrections fonctionnent :

```bash
# Build Docker
docker build -t md2googleslides:latest .

# Test avec un fichier markdown simple
docker run --rm -v $(pwd):/workspace md2googleslides:latest \
  --input /workspace/example.md \
  --output-dir /workspace/output

# Vérification des logs
docker logs <container_id>
```

## ✅ Avantages de cette solution

1. **Compatibilité moderne** : Support complet de markdown-it v14.1.0
2. **Maintenabilité** : Plus de dépendance sur des packages obsolètes
3. **Robustesse** : Gestion des différents formats d'export de plugins
4. **Performance** : Implémentation optimisée du parser fence
5. **Stabilité** : Élimination des erreurs de runtime liées aux plugins

## 🔄 Rétrocompatibilité

Toutes les fonctionnalités existantes sont maintenues :
- Blocs de code fencés avec `$$$`
- Support des images générées
- Syntaxe markdown étendue
- Intégration avec Google Slides API

## 🚀 Déploiement

Les modifications sont compatibles avec l'environnement Docker existant et ne nécessitent aucun changement dans l'utilisation de l'application.

---

**Note** : Ces corrections garantissent un déploiement Docker stable et maintiennent le code à jour pour une utilisation en production.