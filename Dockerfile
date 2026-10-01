# syntax=docker/dockerfile:1
# LiteCMS: imagen de producción
#   docker build -t litecms .
#   docker run -p 3000:3000 -v litecms-content:/app/content -e JWT_SECRET=... litecms

# ---- Compilación ----
FROM node:22-bookworm-slim AS build
WORKDIR /src
COPY core/package.json core/package-lock.json core/
COPY admin/package.json admin/package-lock.json admin/
RUN npm ci --prefix core && npm ci --prefix admin
COPY . .
RUN node scripts/package.mjs --no-zip

# ---- Producción ----
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    TRUST_PROXY=1
WORKDIR /app
COPY --from=build /src/release/litecms ./
RUN npm ci --omit=dev && npm cache clean --force \
    && chown -R node:node /app
USER node

# Base de datos SQLite e imágenes subidas: deben persistir entre actualizaciones
VOLUME ["/app/content"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "app.js"]
