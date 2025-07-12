# Utiliser l'image Node.js LTS officielle
FROM node:20-alpine AS builder

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

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration des packages
COPY package.json ./

# Générer un nouveau package-lock.json et installer les dépendances
RUN npm install --package-lock-only && \
    npm ci --omit=dev && \
    npm cache clean --force

# Copier le code source
COPY . .

# Compiler le TypeScript
RUN npm run compile

# Stage de production
FROM node:20-alpine AS production

# Installer les dépendances système runtime minimales
RUN apk add --no-cache \
    vips \
    libc6-compat

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S md2gslides -u 1001 -G nodejs

# Définir le répertoire de travail
WORKDIR /app

# Copier les dépendances depuis le stage builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copier le code compilé
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/bin ./bin

# Créer le répertoire pour les credentials Google
RUN mkdir -p /home/md2gslides/.md2googleslides

# Changer la propriété des fichiers vers l'utilisateur non-root
RUN chown -R md2gslides:nodejs /app && \
    chown -R md2gslides:nodejs /home/md2gslides

# Passer à l'utilisateur non-root
USER md2gslides

# Variables d'environnement
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Point d'entrée
ENTRYPOINT ["node", "bin/md2gslides.js"]

# Commande par défaut
CMD ["--help"]

# Labels pour la documentation
LABEL maintainer="Pierre-Marie Boutet <pmboutet@example.com>"
LABEL description="md2googleslides - Convert Markdown to Google Slides"
LABEL version="0.5.2"
