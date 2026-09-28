# IT - World – Produktions-Image (keine npm-Abhängigkeiten nötig)
FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 DB_FILE=/data/it-world.db
WORKDIR /app
COPY package.json server.js ./
COPY src ./src
COPY public ./public
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
