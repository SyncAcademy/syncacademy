FROM node:22.22.2-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --workspace=apps/web --include-workspace-root=false --fetch-retries=5
COPY apps/web apps/web
RUN npm run build --workspace=apps/web -- --configuration production --output-path /app/web-dist
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY infrastructure/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web-dist/browser /usr/share/nginx/html
EXPOSE 8080
