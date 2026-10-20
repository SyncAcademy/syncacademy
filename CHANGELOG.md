# Changelog

All notable changes to the SyncAcademy project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — Phase 2 Planning

### Planned
- Strict tenant authorization (`assertSchoolAccess`) and `schoolId` scoping across every endpoint in `RegistryController`, `RegistryWorkflowsController`, `AcademicController`, and `BursarController`.
- Teacher assignment-scoped authorization (restricting marks and attendance entry strictly to assigned classes/subjects).
- Academic schema consolidation (unifying parallel legacy and normalized relational models).
- Negative cross-tenant integration test expansion (IDOR and privilege escalation tests).

---

## [0.1.0-alpha.2] - 2026-10-19 — Phase 1: Security Remediation, Repository Cleanup & Documentation Standardization

### Security
- **Remediated Committed Credentials**: Replaced exposed Google App Password and personal developer email with safe placeholders across `.env.example`, `docker-compose.yml`, `scripts/setup-local.mjs`, `apps/api/src/config.ts`, and `apps/api/src/api.controller.ts`.
- **Restricted Credential Generation**: Updated `scripts/configure-kigoma-teacher-logins.mjs` (prior to script removal) to write credentials exclusively to `.runtime/` with restrictive `0o600` permissions.
- **Git History Remediation Runbook**: Documented step-by-step `git filter-repo` procedure in `docs/system-design-and-architecture.md` for cleaning historical commits upon owner approval.
- **Commercial Security Policy**: Added root `SECURITY.md` defining private vulnerability reporting SLA, tenant isolation guarantees, and responsible disclosure terms.
- **Commercial Source-Available License**: Replaced 0-byte `LICENSE` with commercial source-available terms (publicly viewable on GitHub for evaluation and review, but proprietary with all rights reserved, not open source).

### Removed & Cleaned Up
- **Scaffolds & UI Scripts**: Removed 104 unrouted, 0-byte, and ad-hoc mutation scripts (`update.js`, `apps/web/*.py`, unused 0-byte NestJS module stubs, 0-byte package sub-files, and misplaced CI workflows).
- **Kigoma Load-Test Scripts**: Removed premature load-testing scripts (`scripts/kigoma-load-data.mjs`, `scripts/kigoma-load-data.test.mjs`, `scripts/verify-kigoma-load.mjs`, `scripts/configure-kigoma-teacher-logins.mjs`, `scripts/benchmark-*.cjs`, and `docs/KIGOMA_LOAD_DATA.md`) per owner directive for the current MVP development phase.
- **Fragmented Documentation Folders**: Eliminated micro-directories (`docs/UX/`, `docs/product/`, `docs/architecture/`, `docs/deployment/`, `docs/development/`, `docs/communication/`) and deleted 35+ loose/conflicting/0-byte Markdown files (including contradictory `school.MD`).

### Added & Consolidated
- **Developer & Architecture Governance**: Established authoritative governance rules enforcing UI preservation, multi-tenancy boundaries, security standards, and definition of done.
- **Unified Canonical Specifications (`docs/`)**:
  - `docs/system-design-and-architecture.md`: Complete end-to-end design from frontend to backend, UI/responsive design standards, database schema, multi-tenancy, security, query optimizations, guardian identity, multi-channel communication architecture, and ADRs.
  - `docs/product-and-workflows.md`: Product vision, MVP scope, user roles, capability matrix, end-to-end portal workflows, and roadmap.
  - `docs/development-and-deployment.md`: Local development bootstrap, automated test standards, and Cloudflare-first low-cost production deployment architecture.
- **Workspace Documentation**: Added `packages/README.md` defining shared contracts, types, and utility packages.

### Preserved
- All 11 active role portals and styles in `apps/web/src/**`.
- All 14 Prisma database migrations in `apps/api/prisma/migrations/**`.
- 6 unrouted legacy feature components in `apps/web/src/app/features/` preserved pending product-owner disposition.
- Full automated test suite passes with zero regressions.

---

## [0.1.0-alpha.1] - 2026-10-18 — Phase 0: Repository, Architecture & Security Audit

### Added
- Completed comprehensive read-only audit of `apps/web` (Angular 18 + Ionic 8), `apps/api` (NestJS 10 + Prisma 5), database migrations, infrastructure, scripts, and documentation.
- Generated `SYNCACADEMY_PHASE_0_REPOSITORY_AUDIT.md` detailing codebase health, active vs. mocked screens, database schema discrepancies, and credential exposure.
