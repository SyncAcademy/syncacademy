FROM node:22.22.2-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --workspace=apps/api --include-workspace-root=false --fetch-retries=5
COPY apps/api apps/api
RUN npm run prisma:generate --workspace=apps/api && npm run build --workspace=apps/api
USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
