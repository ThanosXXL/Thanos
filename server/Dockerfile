FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY signaling-server.js ./

ENV NODE_ENV=production
# Render/Fly.io/etc. setzen PORT selbst per Umgebungsvariable; 8787 ist nur der lokale
# Standard aus signaling-server.js.
EXPOSE 8787

CMD ["node", "signaling-server.js"]
