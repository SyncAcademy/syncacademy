# SyncAcademy — Development, Testing & Cloud Deployment Guide

This document covers local development setup, automated testing standards, and the Cloudflare-first low-cost production deployment architecture for SyncAcademy.

---

## 1. Local Development Setup

### 1.1 Prerequisites
- **Node.js**: `>= 20.x` (Node `22.x` recommended, matches CI)
- **npm**: `>= 10.x` (npm workspaces monorepo)
- **PostgreSQL**: `16.x` (via Docker Compose or local PostgreSQL instance)

### 1.2 Bootstrap & Run Locally
```bash
# 1. Install workspace dependencies
npm ci

# 2. Generate local .env with random 32-byte SESSION_SECRET and DATA_ENCRYPTION_KEY
node scripts/setup-local.mjs

# 3. Start PostgreSQL 16 (port 55432) and apply Prisma migrations
docker compose up -d db
npm run prisma:generate --workspace=apps/api
npm run prisma:migrate:deploy --workspace=apps/api
npm run prisma:seed --workspace=apps/api

# 4. Start API (:3000), Outbox Worker, and Angular Web App (:4200)
npm run dev:api
npm run dev:worker
npm run dev:web
```
Alternatively, start the entire containerized stack (`db`, `api`, `worker`, `web` via Nginx on `http://localhost:8080`):
```bash
npm run docker:up
```

*(Never commit `.env` or `.runtime/` to version control.)*

---

## 2. Automated Testing & Verification Standards

Every change must pass build and test verification before commit:

### 2.1 Build Verification
```bash
npm run prisma:generate --workspace=apps/api
npm run build --workspace=apps/api
npm run build --workspace=apps/web
```

### 2.2 Backend Unit & Integration Tests (`apps/api/test/`)
```bash
# In-memory unit tests (no PostgreSQL required)
node --test apps/api/test/email-templates.test.cjs apps/api/test/platform-settings.test.cjs

# Full database integration suite (requires PostgreSQL running on DATABASE_URL)
npm test --workspace=apps/api
```

### 2.3 Frontend Portal Workflow Verification Scripts (`apps/web/scripts/`)
```bash
npm run test:registrar-workflow --workspace=apps/web
npm run test:academic-workflow --workspace=apps/web
npm run test:academic-years --workspace=apps/web
npm run test:bursar-workflow --workspace=apps/web
npm run test:head-oversight --workspace=apps/web
npm run test:class-teacher --workspace=apps/web
npm run test:school-setup --workspace=apps/web
npm run test:super-admin --workspace=apps/web

# Additional state & concurrency checks
node apps/web/scripts/check-concurrent-drafts.mjs
node apps/web/scripts/check-school-sync.mjs
node apps/web/scripts/check-student-result-summary.mjs
node apps/web/scripts/check-teaching-responsibilities.mjs
```

### 2.4 Continuous Integration (CI), Continuous Architecture (CA) & Bot Automation
Automated CI, Continuous Architecture (CA), and GitHub Bot workflows are defined under `.github/workflows/` and `.github/dependabot.yml`:

| Workflow / Automation | File | Purpose & Verification Scope |
|---|---|---|
| **Continuous Integration (CI)** | `.github/workflows/ci.yml` | Triggered on push/PR to `main` and `testing`. Runs in parallel with PostgreSQL 16 service container: Prisma generation, full backend build (`apps/api`), frontend build (`apps/web`), in-memory unit tests, database migration deploy, full auth/database integration tests, and all frontend portal verification scripts. |
| **Continuous Architecture & Code Analysis (CA)** | `.github/workflows/ca.yml` | Triggered on push/PR and weekly cron. Runs `scripts/verify-architecture.mjs` (enforcing zero committed secrets, monorepo import boundaries, UI preservation policies, and multi-tenant constraints) alongside CodeQL static security analysis for JavaScript/TypeScript. |
| **Bot Automation** | `.github/workflows/bot-automation.yml` | Automates PR triage and `dependabot[bot]` interactions. Automatically fetches metadata, verifies semantic version bumps, and approves/merges non-breaking patch and minor updates. |
| **Dependabot Bot** | `.github/dependabot.yml` | Weekly dependency update bot scanning root workspace, `apps/api`, `apps/web`, and GitHub Actions. |

```bash
# Run Continuous Architecture check locally:
npm run verify:architecture
```

---

## 3. Cloudflare-First & Low-Cost Production Deployment Architecture

To keep monthly hosting costs ultra-low during Tanzanian school pilots while providing edge caching, WAF/DDoS protection, and zero-egress object storage, SyncAcademy uses a **hybrid Cloudflare Edge + Containerized NestJS + Managed PostgreSQL 16** architecture:

```mermaid
flowchart TB
    subgraph Users["School Staff & Guardians (Tanzania)"]
        Browser["Desktop & Mobile Browsers"]
    end

    subgraph Cloudflare["Cloudflare Edge Network (Free / Low-Cost Tier)"]
        DNS["Cloudflare DNS + SSL/TLS (Full Strict)<br/>+ WAF & Rate Limiting"]
        Pages["Cloudflare Pages<br/>(Angular 18 Static SPA: apps/web/dist/syncacademy-web/browser)"]
        R2["Cloudflare R2 Object Storage<br/>(School Logos, Generated Report Card PDFs, Exports)"]
    end

    subgraph Compute["Low-Cost Container Host (Render / Fly.io / Railway / VPS)"]
        API["NestJS 10 API Service<br/>(apps/api: dist/src/main.js)"]
        Worker["Outbox Worker Process<br/>(apps/api: dist/src/worker.js)"]
    end

    subgraph Database["Managed PostgreSQL 16 (Neon / Supabase / Managed PG)"]
        PG[("PostgreSQL 16<br/>(Pooled & Direct Connections + Automated Backups)")]
    end

    Browser -->|HTTPS app.syncacademy.co.tz| DNS
    DNS -->|Static Assets /*| Pages
    DNS -->|API & SSE /api/*| API
    API -->|Prisma Connection Pool| PG
    API -->|S3 SDK Presigned URLs| R2
    Worker -->|Poll Outbox & Write Logs| PG
    Worker -->|Upload Rendered PDFs| R2
```

### 3.1 Why NestJS Runs in a Container Instead of Cloudflare Workers
While `apps/web` (Cloudflare Pages) and file storage (Cloudflare R2) are 100% Cloudflare-native, `apps/api` runs in a standard Node.js container behind Cloudflare's proxied DNS (`orange cloud`) because it uses `@nestjs/platform-express`, native `argon2` password hashing, TCP SMTP sockets (`nodemailer`), long-lived Server-Sent Events (`/api/realtime/stream`), and background `Outbox` polling (`worker.ts`).

### 3.2 Production Component Specifications
- **Frontend (Cloudflare Pages)**:
  - Build command: `npm ci --ignore-scripts && npm run build --workspace=apps/web`
  - Output directory: `apps/web/dist/syncacademy-web/browser`
  - SPA fallback rule (`_redirects`): `/* /index.html 200`
- **Object Storage (Cloudflare R2)**:
  - S3-compatible private bucket with zero egress fees for school logos, generated report card PDFs, and certificates, accessed via short-lived presigned URLs generated by `apps/api`.
- **Database (Managed PostgreSQL 16)**:
  - Daily automated snapshots (14-day retention) plus pre-term logical `pg_dump` backups encrypted in a private R2 bucket.

---

## 4. Production Environment Variables Matrix

Configure these variables in the production secret manager (never commit to Git):

| Variable | Required | Production Value / Requirement |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `3000` |
| `APP_ORIGIN` | Yes | `https://app.syncacademy.co.tz` |
| `DATABASE_URL` | Yes | `postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require` |
| `SESSION_SECRET` | Yes | Random 64-char hex string (`openssl rand -hex 32`) |
| `DATA_ENCRYPTION_KEY` | Yes | Random 64-char hex string (`openssl rand -hex 32`) |
| `COOKIE_SECURE` | Yes | `true` |
| `SESSION_COOKIE_NAME` | No | `syncacademy_session` |
| `SESSION_TTL_HOURS` | No | `168` |
| `SMTP_HOST` | Yes | Transactional email SMTP host |
| `SMTP_PORT` | Yes | `587` or `465` |
| `SMTP_SECURE` | No | `false` (587 STARTTLS) or `true` (465 TLS) |
| `SMTP_USER` | Yes | Transactional email username |
| `SMTP_PASS` | Yes | Transactional email password / API key |
| `MAIL_FROM` | Yes | `no-reply@syncacademy.co.tz` |
| `CONTACT_NOTIFICATION_EMAIL` | No | `support@syncacademy.co.tz` |
| `WORKER_POLL_MS` | No | `5000` |

---

## 5. Release & Rollback Procedure

1. **CI Gate (`.github/workflows/ci.yml`)**: Runs PostgreSQL 16 service container, `prisma:generate`, API tests, API build, and Web build.
2. **Migration Step**: Run `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma` before rolling out new API/worker containers.
3. **Health Check**: Verify `GET /api/health` returns `200 OK` before shifting traffic.
4. **Rollback**: Revert container image tag and Cloudflare Pages deployment to the previous green commit SHA.

## 6. Current Implementation: System Health Verification and LAN Releases

The implemented administrator monitoring page is `/super-admin/system`; protected APIs are under `/api/v1/system-health`. See [System Health monitoring](system-health.md) for deployment configuration and the distinction between process health, observed availability and independently measured uptime.

Run `npm run test:monitoring --workspace=apps/api` against the dedicated disposable `syncacademy_monitor_test` database. The test never resets a school database. Run `npm run test:monitoring --workspace=apps/web` for Chrome checks at desktop, tablet, mobile and 320px widths. The current frontend lint command performs TypeScript checking.

For the existing shared-network Docker deployment, run `scripts/deploy-lan.ps1` from PowerShell. It builds API and frontend together, applies additive migrations through the existing migrate service and waits for API, worker and web startup. Give every API replica a unique stable `MONITOR_INSTANCE_ID` before scaling beyond the Compose single-instance setup.
