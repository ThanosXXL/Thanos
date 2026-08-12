FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY scripts ./scripts

# Daten- und Schlüsselverzeichnis als Volume vorsehen, damit sie einen
# Container-Neustart/-Update überleben.
VOLUME ["/app/data", "/app/keys"]

ENV DATABASE_PATH=/app/data/licenses.sqlite
ENV LICENSE_SERVER_PRIVATE_KEY_PATH=/app/keys/private.pem
ENV PORT=4400

EXPOSE 4400

CMD ["node", "src/server.js"]
