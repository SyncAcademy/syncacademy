# SyncAcademy — Agent & Engineer Governance Instructions (`AGENTS.md`)

This file is the authoritative instruction manual for all AI coding agents and software engineers operating within the `SyncAcademy/syncacademy-mvp` repository. Every contributor and automated agent must read and obey these instructions before inspecting, planning, or modifying any code.

---

## 1. Project Identity

- **Product Name**: SyncAcademy
- **Product Category**: Multi-tenant Education Management SaaS Platform
- **Initial Target Market**: Tanzanian primary and secondary schools (supporting NECTA-aligned grading, multi-term academic structures, registrar admissions, bursar fee operations, headmaster approvals, and guardian communications).
- **Long-Term Vision**: One connected education ecosystem uniting schools, teachers, students, and families—including cross-school guardian accounts for parents with children enrolled in multiple SyncAcademy schools.
- **Current Stage**: Web-first Minimum Viable Product (MVP) designed for school pilots and customer validation.

---

## 2. Approved Technology Stack

Do not introduce alternative frameworks, ORMs, state management libraries, or unapproved infrastructure services.

| Layer | Approved Technology | Implementation Notes |
|---|---|---|
| **Frontend** | Angular 18 (`^18.2.0`) + TypeScript (`~5.5.4`) | Standalone components (`standalone: true`), Angular Signals (`signal`, `computed`), reactive/template forms, `HttpClient` (`withCredentials: true`). |
| **UI Components** | Custom SCSS + `@ionic/angular` (`^8.0.0`) + `ionicons` (`^7.0.0`) | Responsive web-first design. Ionic is registered globally and used selectively in portal components (`<ion-icon>`). |
| **Backend** | NestJS 10 (`^10.0.0`) + Express + TypeScript | REST API under `/api/*`, Server-Sent Events (SSE) at `/api/realtime/stream`, background outbox worker (`apps/api/src/worker.ts`). |
| **Database & ORM** | PostgreSQL 16 + Prisma (`^5.22.0`) | Schema at `apps/api/prisma/schema.prisma`. Multi-tenant relational schema with transactional outbox (`Outbox` table). |
| **Authentication** | Server-side DB Sessions (`UserSession`) | Opaque tokens stored as SHA-256 hashes in PostgreSQL, delivered via `HttpOnly`, `SameSite=Lax` cookie (`syncacademy_session`) + `x-csrf-token` validation on mutating requests. |
| **Target Deployment** | Cloudflare-First + Low-Cost Container/DB | Cloudflare Pages (static web SPA), Cloudflare DNS/WAF/CDN, Cloudflare R2 (S3-compatible object storage), containerized NestJS API + Worker, and managed PostgreSQL. |

---

## 3. Repository Boundaries & Monorepo Structure

SyncAcademy uses an **npm workspaces** monorepo layout:

- `apps/web/` — Angular 18 + Ionic 8 single-page application (`syncacademy-web`). See [`apps/web/AGENTS.md`](./apps/web/AGENTS.md) for frontend-specific rules.
- `apps/api/` — NestJS 10 REST API, background worker, and Prisma schema/migrations (`@syncacademy/api`). See [`apps/api/AGENTS.md`](./apps/api/AGENTS.md) for backend-specific rules.
- `packages/api-contracts/` — Reserved workspace package for shared API request/response contracts (`@syncacademy/api-contracts`).
- `packages/shared-types/` — Reserved workspace package for shared TypeScript domain types (`@syncacademy/shared-types`).
- `packages/shared-utils/` — Reserved workspace package for shared pure utility functions (`@syncacademy/shared-utils`).
- `docs/` — Canonical product, architecture, communication, and deployment documentation.
- `infrastructure/` — Container routing (`infrastructure/nginx.conf`) and deployment reference configurations.
- `scripts/` — Local environment bootstrap (`scripts/setup-local.mjs`).

---

## 4. Required Reading Before Making Changes

Before implementing any feature, bugfix, or refactoring, read the relevant canonical documentation:

1. **Product Overview, MVP Scope & Portal Workflows**:
   - [`docs/product-and-workflows.md`](./docs/product-and-workflows.md)
2. **End-to-End System Design & Architecture (Frontend, Backend, Database, Security, Multi-Tenancy, Guardian Communications & ADRs)**:
   - [`docs/system-design-and-architecture.md`](./docs/system-design-and-architecture.md)
3. **Development Setup, Testing Standards & Cloudflare Deployment**:
   - [`docs/development-and-deployment.md`](./docs/development-and-deployment.md)

---

## 5. Strict UI Preservation Policy (Non-Negotiable)

The existing Angular and Ionic user interface in `apps/web` is **strictly protected**.

Unless explicitly instructed and approved by the repository owner for a specific task, **DO NOT**:
1. Redesign any existing screen, portal, or modal.
2. Modify page layouts, grid structures, spacing, or breakpoints.
3. Change color palettes, gradients, themes, or CSS custom properties.
4. Change typography, font families, font weights, or sizing.
5. Replace existing components or alter navigation hierarchies.
6. Remove or alter working form controls, tables, or interactive workflows.
7. Introduce a competing CSS framework (such as Tailwind or Bootstrap) or another frontend framework.
8. Do not use Emojis in anywhere in the code and minimize the use of em-dashes.

When wiring new backend capabilities into the frontend, preserve the exact visual structure, class names, and design tokens established in `apps/web/src/styles.scss` and the existing portal components.

### 5.1 Design Governance & Canonical Designing-Skills Integration

When creating new user-facing workflows, designing new components, or updating responsive layouts, agents and contributors must follow strict design engineering governance:

1. **Canonical Design-Skills Source**:
   - Primary reference repository: [`https://github.com/realmadede/Designing-Skills.git`](https://github.com/realmadede/Designing-Skills.git).
   - Pinned reviewed commit revision: `2d228630ba1446365f614a108cb8252f1feda202`.
   - Never execute unreviewed external scripts or commands from external sources automatically.
2. **Mandatory Skills Consultation**:
   - Contributors and agents **must consult the relevant design skill** from the canonical repository when:
     - Creating new screens or portals.
     - Designing new UI components.
     - Introducing transitions or animations.
     - Improving layout responsiveness across breakpoints.
     - Designing or refining mobile web experiences.
     - Performing UI quality reviews.
     - Implementing new user-facing workflows.
3. **Selective Application & Framework Boundary**:
   - Select skills strictly based on task relevance and Angular 18 + SCSS compatibility.
   - **Relevant & Recommended Skills**:
     - `mobile-native`: Mobile web polish (safe area insets `env(safe-area-inset-*)`, viewport units `100dvh`, `touch-action: manipulation`, preventing input zoom `< 16px`).
     - `break-ui`: Adversarial UI stress-testing with realistic worst-case data (Tanzanian multi-part names, long email addresses, missing avatars, extreme TZS currency balances, zero-item empty states, 320px viewport, 200% browser zoom).
     - `animate`, `review-animations`, `animation-performance`: 60fps composited animations (`transform` and `opacity` only, correct easing curves, zero layout thrashing).
     - `emil-design-eng`, `apple-design`: Hierarchy, micro-interactions, subtle borders, and accessible contrasts.
   - **Strictly Excluded Frameworks**: Do not apply skills that introduce React, React Native, Expo, Swift, Tailwind, or competing component libraries (e.g., `animate-expo`, `write-swift`, `ask-sonner` are strictly excluded).
4. **Existing Design System Authority**:
   - The existing SyncAcademy UI tokens, colors, gradients, typography, and class conventions in `apps/web/src/styles.scss` remain authoritative. External skills inform technique, polish, and edge-case handling—they do not replace SyncAcademy's brand or visual language.

---

## 6. Security Requirements

1. **Zero Committed Secrets**:
   - Never commit real passwords, API keys, SMTP credentials, session secrets, encryption keys, or personal developer email addresses into tracked files (`.env.example`, `docker-compose.yml`, `scripts/*`, `apps/**`, or `docs/**`).
   - All secrets must be loaded from untracked environment variables validated via Zod in `apps/api/src/config.ts`.
   - Local generated credentials or test outputs must be written only to gitignored paths (`.env`, `.runtime/`) with restrictive file permissions (`0o600`).
2. **Authentication & CSRF Protection**:
   - All authenticated browser endpoints must validate the `syncacademy_session` cookie via `PlatformService.requireAuthenticatedSession()` or `resolveOptionalViewer()`.
   - All state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) authenticated by cookie must enforce CSRF token validation (`x-csrf-token` header matching `UserSession.csrfTokenHash`), except explicitly public pre-auth routes (`/api/auth/login`, `/api/auth/password-reset/*`, `/api/auth/invitations/accept`, `/api/contact-submissions`).
3. **Password & Sensitive Data Cryptography**:
   - Passwords must be hashed with `argon2id` (`apps/api/src/security.ts`).
   - Sensitive platform credentials stored in the database (such as runtime SMTP passwords in `PlatformSetting`) must be encrypted at rest using AES-256-GCM (`DATA_ENCRYPTION_KEY`).
4. **Input Validation**:
   - Every controller endpoint must validate incoming request payloads, query parameters, and route parameters using strict **Zod** schemas before invoking service or database logic.

---

## 7. Multi-Tenancy & Authorization Rules

SyncAcademy is a multi-tenant platform where tenant boundaries are defined by `School.id` (`schoolId`).

1. **Never Trust Client-Supplied Tenant Identifiers Without Membership Verification**:
   - Any endpoint accepting a `schoolId` (or `schoolCode`) parameter **must** verify that the authenticated user is either a `SUPER_ADMIN` or holds an `ACTIVE` `SchoolMembership` for that exact `schoolId`.
2. **Enforce Role-Based Access Control (RBAC) at the Backend Boundary**:
   - UI route guards (`apps/web/src/app/core/guards/`) are for UX navigation only and are **not** a security boundary.
   - Every backend controller/service action must explicitly verify the caller's role (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `HEAD_TEACHER`, `REGISTRAR`, `BURSAR`, `CLASS_TEACHER`, `TEACHER`, `PARENT`, `STUDENT`) within the target school.
3. **Scope All Queries by Tenant (`schoolId`)**:
   - Every Prisma `findMany`, `findFirst`, `findUnique`, `update`, `upsert`, and `delete` operation on tenant-scoped models must include `schoolId` in its `where` clause (or verify parent ownership within a serializable/atomic `prisma.$transaction`).
4. **Assignment-Scoped Access for Teachers**:
   - Class teachers (`CLASS_TEACHER`) and subject teachers (`TEACHER`) must only modify marks, attendance, or class records for classes and subjects explicitly assigned to them in `TeacherSubjectAssignment` / `AcademicClassAssignment`.
5. **Audit Logging**:
   - All security-sensitive and state-mutating actions (authentication events, role/membership changes, student admissions/promotions, marks submission/approval, fee mutations, and guardian communications) must append an immutable `AuditLog` record containing `actorId`, `schoolId`, `action`, `targetType`, `targetId`, and `ipAddress`.

---

## 8. Database & Migration Rules

1. **Preserve Existing Migrations**:
   - Never delete, rename, or edit already-committed migration SQL files under `apps/api/prisma/migrations/**`.
2. **Additive Schema Evolution**:
   - Evolve `apps/api/prisma/schema.prisma` through new forward-compatible Prisma migrations (`npx prisma migrate dev --name <descriptive_name>`).
   - Never run `prisma migrate reset` or destructive `DROP TABLE` / `DROP COLUMN` commands against shared or production databases without explicit written approval and a verified backup.
3. **Transactional Outbox Pattern**:
   - Asynchronous side effects (emails, SMS, WhatsApp notifications, background jobs) must be enqueued into the PostgreSQL `Outbox` table inside the same database transaction as the domain state change, then processed asynchronously by `apps/api/src/worker.ts`.

---

## 9. Testing & Verification Requirements

Before considering any change complete, verify:

1. **Prisma Client & Backend Build**:
   - `npm run prisma:generate --workspace=apps/api`
   - `npm run build --workspace=apps/api`
2. **Frontend Production Build**:
   - `npm run build --workspace=apps/web`
3. **Automated Test Suites**:
   - Backend unit & integration tests: `npm test --workspace=apps/api` (or targeted `node --test` suites when PostgreSQL is unavailable).
   - Frontend workflow verification scripts:
     - `npm run test:registrar-workflow --workspace=apps/web`
     - `npm run test:academic-workflow --workspace=apps/web`
     - `npm run test:academic-years --workspace=apps/web`
     - `npm run test:bursar-workflow --workspace=apps/web`
     - `npm run test:head-oversight --workspace=apps/web`
     - `npm run test:class-teacher --workspace=apps/web`
     - `npm run test:school-setup --workspace=apps/web`
     - `npm run test:super-admin --workspace=apps/web`

---

## 10. Documentation & Change Approval Requirements

1. **Single Source of Truth**:
   - Keep `docs/` synchronized with the actual implementation. Do not create duplicate or competing Markdown files at the repository root.
   - Clearly distinguish between **Current Implementation** and **Planned / Target Architecture** in all design documents.
2. **Explicit Approval Required For**:
   - Any visual or structural UI modification in `apps/web`.
   - Any destructive database migration or data model breaking change.
   - Rewriting shared Git history (`git filter-repo`, `git push --force`).
   - Adding paid third-party infrastructure services or external runtime dependencies.

---

## 11. Definition of Done (DoD)

A task, feature, or bugfix is **Done** only when:
- [ ] All code compiles cleanly with zero TypeScript errors across `apps/api` and `apps/web`.
- [ ] All existing and new automated tests pass.
- [ ] Multi-tenant isolation (`schoolId` scoping) and role-based authorization are enforced on every touched endpoint.
- [ ] No secrets, credentials, or personal developer emails are present in tracked files or diffs.
- [ ] The existing UI layout, styling, and behavior remain 100% intact (unless an approved UI task).
- [ ] Canonical documentation in `docs/` is updated if endpoints, workflows, or schemas changed.
- [ ] Changes are committed in small, logical, reviewable commits with clear commit messages.
