# SyncAcademy — Product & Engineering Roadmap

## Phase 0: Repository Architecture, Implementation & Product Audit (Completed)
- Comprehensive read-only inspection of frontend (`apps/web`), backend (`apps/api`), Prisma schema (`apps/api/prisma`), scripts, infrastructure, and documentation.
- Identification of exposed credentials, authorization gaps, dual data models, and documentation drift.

## Phase 1: Security Remediation, Repository Cleanup & Documentation Standardization (Current Phase)
- Remediate committed SMTP credentials and hardcoded developer emails across all tracked files.
- Remove 0-byte scaffold files, one-off UI mutation scripts, and contradictory specification documents.
- Establish authoritative `AGENTS.md` governance and standardized documentation across product, architecture, security, multi-tenancy, communication, and Cloudflare deployment.
- Design the multi-school Guardian Data Model, SMS/WhatsApp/Email provider abstraction, and expiring report-access link architecture.

## Phase 2: Backend Authorization Hardening & Data Model Unification
- **Tenant & RBAC Enforcement**: Enforce strict `assertSchoolAccess(viewer, schoolId, allowedRoles)` and `schoolId`-scoped Prisma queries across every route in `RegistryController`, `RegistryWorkflowsController`, `AcademicController`, and `BursarController`.
- **Teacher Assignment Scoping**: Restrict marks entry and attendance mutations so `CLASS_TEACHER` and `TEACHER` users can only modify classes and subjects assigned to them.
- **Academic Schema Unification**: Consolidate the parallel legacy (`Examination`, `Mark`, `ReportCard`) and normalized (`AcademicExamItem`, `AcademicScoreRecord`, `AcademicReportCardRecord`) academic tables into a single canonical persistence path.
- **Automated Integration Test Expansion**: Add negative cross-tenant (IDOR) and role-escalation tests to `apps/api/test/`.

## Phase 3: Guardian Communication Engine & Expiring Report Links
- Implement the multi-school guardian identity and contact verification schema extensions.
- Implement pluggable `SmsProvider`, `WhatsAppProvider`, and `EmailProvider` adapters dispatched by `apps/api/src/worker.ts` via the PostgreSQL `Outbox`.
- Implement cryptographically signed/hashed expiring report-access links (`ReportAccessLink`) with guardian phone verification, revocation, and access audit logging.
- Connect the frontend notification and report-publishing actions to dispatch live SMS/WhatsApp/Email report links to guardians.

## Phase 4: Production Pilot Deployment & Parent Portal
- Deploy `apps/web` to Cloudflare Pages, static/report assets to Cloudflare R2, and `apps/api` + `worker` containers behind Cloudflare DNS/WAF connected to managed PostgreSQL.
- Onboard initial Tanzanian pilot primary and secondary schools using real academic calendars and NECTA grading configurations.
- Introduce the dedicated cross-school Parent Portal allowing a single guardian account to view attendance, academic reports, and fee balances for multiple children across multiple SyncAcademy schools.
