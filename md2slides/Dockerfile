FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
# Install production dependencies only, skipping lifecycle scripts
RUN npm install --omit=dev --ignore-scripts
COPY md2slides/server.js ./md2slides/server.js
EXPOSE 3000
CMD ["node", "md2slides/server.js"]
