FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY md2slides/server.js ./md2slides/server.js
EXPOSE 3000
CMD ["node", "md2slides/server.js"]
