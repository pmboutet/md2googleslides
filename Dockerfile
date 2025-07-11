# Utiliser l'image Node.js LTS officielle
FROM node:20-alpine

# Installer les dépendances système nécessaires pour Sharp et autres outils natifs
RUN apk add --no-cache \
    g++ \
    make \
    python3 \
    py3-pip \
    vips-dev \
    libc6-compat \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S md2gslides -u 1001

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration des packages
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production && \
    npm cache clean --force

# Copier le code source
COPY . .

# Compiler le TypeScript
RUN npm run compile

# Changer la propriété des fichiers vers l'utilisateur non-root
RUN chown -R md2gslides:nodejs /app
USER md2gslides

# Créer le répertoire pour les credentials Google
RUN mkdir -p /home/md2gslides/.md2googleslides

# Exposer le port (si nécessaire pour une API future)
EXPOSE 3000

# Variables d'environnement
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Point d'entrée
ENTRYPOINT ["node", "bin/md2gslides.js"]

# Commande par défaut (peut être écrasée)
CMD ["--help"]

# Labels pour la documentation
LABEL maintainer="Pierre-Marie Boutet <pmboutet@example.com>"
LABEL description="md2googleslides - Convert Markdown to Google Slides"
LABEL version="0.5.2"