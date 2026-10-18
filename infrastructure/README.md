# SyncAcademy Infrastructure (`infrastructure/`)

This directory contains container routing configuration for local and containerized deployments:

- `infrastructure/nginx.conf` — Nginx configuration used by `apps/web/Dockerfile` (`docker-compose.yml`) to serve the built Angular 18 SPA (`dist/syncacademy-web/browser`) and reverse-proxy `/api/` requests (including SSE `/api/realtime/stream`) to the `api` container (`http://api:3000`).

For production deployment architecture using Cloudflare Pages, Cloudflare R2, containerized NestJS API/Worker, and managed PostgreSQL, see [`docs/deployment/cloudflare-deployment-architecture.md`](../docs/deployment/cloudflare-deployment-architecture.md).
