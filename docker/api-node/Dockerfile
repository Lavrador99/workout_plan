# ── Build stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json* nx.json tsconfig.base.json ./

# Install ALL deps (needed for NestJS build)
RUN npm ci --ignore-scripts

# Copy only the API source
COPY apps/treino-api ./apps/treino-api

# Compile TypeScript
RUN npx ts-node -e "require('tsconfig-paths/register')" 2>/dev/null || true
RUN npx tsc -p apps/treino-api/tsconfig.app.json

# ── Runtime stage ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output
COPY --from=builder /app/dist/apps/treino-api ./dist/apps/treino-api

# Data directory for the snapshot file
RUN mkdir -p /data
VOLUME ["/data"]

ENV PORT=3334
ENV SNAPSHOT_PATH=/data/treino_autosave.json
ENV NODE_ENV=production

EXPOSE 3334

CMD ["node", "dist/apps/treino-api/src/main.js"]
