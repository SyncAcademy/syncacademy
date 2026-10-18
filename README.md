# SyncAcademy MVP

SyncAcademy is a multi-tenant education management SaaS platform built initially for Tanzanian primary and secondary schools. It unites school administration, registrar admissions, teacher assignments, examination marks entry, NECTA-aligned grading, academic approvals, report cards, attendance, bursar fee workflows, and guardian communications in one connected web platform.

---

## 1. Technology Stack

- **Frontend (`apps/web`)**: Angular 18 + Ionic 8 + TypeScript + SCSS (`syncacademy-web`)
- **Backend (`apps/api`)**: NestJS 10 + Express + TypeScript (`@syncacademy/api`)
- **Database & ORM (`apps/api/prisma`)**: PostgreSQL 16 + Prisma 5 (`schema.prisma`, transactional `Outbox`)
- **Shared Workspace Packages (`packages/*`)**: `@syncacademy/api-contracts`, `@syncacademy/shared-types`, `@syncacademy/shared-utils`
- **Target Production Topology**: Cloudflare Pages (SPA) + Cloudflare R2 (Object Storage) + Cloudflare DNS/WAF + Containerized NestJS API/Worker + Managed PostgreSQL 16

> **Governance Notice**: Before making any changes to this repository, read [`AGENTS.md`](./AGENTS.md), [`apps/web/AGENTS.md`](./apps/web/AGENTS.md), and [`apps/api/AGENTS.md`](./apps/api/AGENTS.md). The existing UI in `apps/web` is strictly protected.

---

## 2. Quick Start (Local Development)

```bash
# 1. Install workspace dependencies
npm ci

# 2. Generate local .env file with random cryptographic secrets
node scripts/setup-local.mjs

# 3. Start PostgreSQL 16 and apply Prisma migrations + seed data
docker compose up -d db
npm run prisma:generate --workspace=apps/api
npm run prisma:migrate:deploy --workspace=apps/api
npm run prisma:seed --workspace=apps/api

# 4. Run API, Outbox Worker, and Angular Web App
npm run dev:api
npm run dev:worker
npm run dev:web
```

Or run the full stack via Docker Compose:
```bash
npm run docker:up
```

---

## 3. Canonical Documentation Index (`docs/`)

The documentation is organized into 4 comprehensive specifications:

1. **[Product Overview, MVP Scope & Portal Workflows](./docs/product-and-workflows.md)**
   - Product vision, Tanzanian school context, MVP scope matrix, user roles and capability matrix, end-to-end portal workflows (Super Admin, Headmaster, Registrar, Academic Master, Class & Subject Teachers, Bursar), and the multi-phase engineering roadmap.

2. **[End-to-End System Design & Architecture](./docs/system-design-and-architecture.md)**
   - Complete technical architecture from frontend to backend: Angular 18 standalone components and reactive state, UI design system and responsive layout guidelines, NestJS 10 controller inventory and outbox worker, PostgreSQL 16 relational database schema, multi-tenancy isolation model, security architecture and credential governance, query and concurrency optimizations, and Architecture Decision Records (ADRs).

3. **[Guardian Identity & Multi-Channel Communication Architecture](./docs/communication-architecture.md)**
   - Cross-school family accounts (single parent identity linked to children in multiple SyncAcademy schools), pluggable SMS/WhatsApp/Email provider abstraction, PostgreSQL transactional outbox integration with retry/failover policies, secure expiring report-access links (`ReportAccessLink`), and delivery cost governance.

4. **[Development, Testing & Cloud Deployment Guide](./docs/development-and-deployment.md)**
   - Local environment bootstrap, automated test suites (backend unit/integration tests and frontend workflow checks), and the hybrid Cloudflare-first low-cost production deployment architecture (Cloudflare Pages + Cloudflare R2 + Containerized NestJS API/Worker + Managed PostgreSQL 16).

