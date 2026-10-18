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

### Product & Portal Workflows (`docs/product/`)
- [Product Vision](./docs/product/vision.md)
- [MVP Scope](./docs/product/mvp-scope.md)
- [Product & Engineering Roadmap](./docs/product/roadmap.md)
- [User Roles & Permissions Matrix](./docs/product/user-roles.md)
- [Role Portal Workflows Guide (Super Admin, Headmaster, Registrar, Academic, Teacher, Bursar)](./docs/product/portal-workflows.md)

### Architecture & Security (`docs/architecture/`)
- [System Architecture](./docs/architecture/system-architecture.md)
- [Frontend Architecture (`apps/web`)](./docs/architecture/frontend-architecture.md)
- [Backend Architecture (`apps/api`)](./docs/architecture/backend-architecture.md)
- [Database Architecture (`apps/api/prisma`)](./docs/architecture/database-architecture.md)
- [Multi-Tenancy Architecture](./docs/architecture/multi-tenancy.md)
- [Security Architecture & Credential Remediation](./docs/architecture/security.md)
- [Performance, Concurrency & Scalability Architecture](./docs/architecture/performance-and-scalability.md)
- [Architecture Decision Records (ADRs)](./docs/architecture/adr.md)

### Communication, UX, Development & Deployment
- [Guardian Identity & Multi-Channel Communication Architecture (SMS, WhatsApp, Email, Expiring Links)](./docs/communication/communication-architecture.md)
- [Cloudflare-First & Low-Cost Production Deployment Architecture](./docs/deployment/cloudflare-deployment-architecture.md)
- [UI Preservation & Responsive Layout Guidelines](./docs/UX/responsive-layout-guidelines.md)
- [Development Setup & Testing Standards](./docs/development/setup-and-testing.md)
