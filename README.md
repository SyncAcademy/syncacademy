# SyncAcademy MVP

SyncAcademy is a multi-tenant education management SaaS platform built initially for Tanzanian primary and secondary schools. It unites school administration, registrar admissions, teacher assignments, examination marks entry, NECTA-aligned grading, academic approvals, report cards, attendance, bursar fee workflows, guardian communications, and dedicated mobile applications in one connected platform.

---

## 1. Technology Stack

- **Frontend (`apps/web`)**: Angular 18 + Ionic 8 + TypeScript + SCSS (`syncacademy-web`)
- **Native Mobile Applications (`apps/web/android`, `apps/web/ios`)**:
  - **SyncAcademy Teacher** (`tz.co.syncacademy.teachers`): School-branded mobile experience for attendance, marks recording, offline staging, and staff notifications.
  - **SyncAcademy Parent** (`tz.co.syncacademy.parents`): Globally branded cross-school guardian portal supporting multiple enrolled students, encrypted records, and push notifications.
  - **Native Security Layer**: Android Keystore (TEE/StrongBox) and iOS Keychain (`SecureKeyVaultPlugin`), non-extractable WebCrypto AES-256-GCM encrypted IndexedDB offline storage, and account-scoped offline mutation queues.
- **Backend (`apps/api`)**: NestJS 10 + Express + TypeScript (`@syncacademy/api`)
- **Database & ORM (`apps/api/prisma`)**: PostgreSQL 16 + Prisma 5 (`schema.prisma`, transactional `Outbox`)
- **Shared Workspace Packages (`packages/*`)**: `@syncacademy/api-contracts`, `@syncacademy/shared-types`, `@syncacademy/shared-utils`
- **Target Production Topology**: Cloudflare Pages (SPA) + Cloudflare R2 (Object Storage) + Cloudflare DNS/WAF + Containerized NestJS API/Worker + Managed PostgreSQL 16

> **Architecture & UI Protection Notice**: The existing UI layout, typography, and styling in `apps/web` are strictly protected. Contributors must preserve all established design tokens and multi-tenant isolation boundaries.

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

## 3. Mobile Synchronization and Native Builds

SyncAcademy supports dual product flavors built from the single Angular and Capacitor codebase:

```bash
# Sync Capacitor assets for Parent application
npm run cap:sync:parent --workspace=apps/web

# Sync Capacitor assets for Teacher application
npm run cap:sync:teacher --workspace=apps/web

# Run native crypto vault and mobile architecture test suites
npm run test:crypto-vault --workspace=apps/web
npm run test:mobile-architecture --workspace=apps/web

# Compile Android APKs / App Bundles via Gradle wrapper
cd apps/web/android
./gradlew assembleParentDebug assembleTeacherDebug
./gradlew bundleParentRelease bundleTeacherRelease
```

---

## 4. Canonical Documentation Index (`docs/`)

The documentation is organized into 4 comprehensive specifications:

1. **[Product Overview, MVP Scope & Portal Workflows](./docs/product-and-workflows.md)**
   - Product vision, Tanzanian school context, MVP scope matrix, user roles and capability matrix, end-to-end portal workflows (Super Admin, Headmaster, Registrar, Academic Master, Class & Subject Teachers, Bursar), and the multi-phase engineering roadmap.

2. **[End-to-End System Design & Architecture](./docs/system-design-and-architecture.md)**
   - Complete technical architecture from frontend to backend: Angular 18 standalone components and reactive state, UI design system and responsive layout guidelines, NestJS 10 controller inventory and outbox worker, PostgreSQL 16 relational database schema, multi-tenancy isolation model, security architecture and credential governance, query and concurrency optimizations, cross-school guardian identity and multi-channel communication architecture (SMS/WhatsApp/Email, transactional outbox, expiring report links), and Architecture Decision Records (ADRs).

3. **[Development, Testing & Cloud Deployment Guide](./docs/development-and-deployment.md)**
   - Local environment bootstrap, automated test suites (backend unit/integration tests and frontend workflow checks), and the hybrid Cloudflare-first low-cost production deployment architecture (Cloudflare Pages + Cloudflare R2 + Containerized NestJS API/Worker + Managed PostgreSQL 16).

4. **[Mobile Architecture, Store Readiness & Security Hardening](./docs/mobile-architecture-and-store-readiness.md)**
   - Dual-flavor mobile application architecture (`tz.co.syncacademy.teachers` and `tz.co.syncacademy.parents`), native Android Keystore and iOS Keychain hardware key vault (`SecureKeyVaultPlugin`), session proof trust model, decoupled AES-256-GCM master seed lifecycle, IndexedDB encrypted offline storage, account-scoped mutation dispatching, Apple App Store and Google Play compliance, and adversarial test suites.
