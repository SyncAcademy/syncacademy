# SyncAcademy — Architecture Decision Records (ADRs)

This document records the core architectural decisions governing the SyncAcademy MVP.

---

## ADR-001: Retain Angular 18 + Ionic 8 Web-First Frontend

- **Status**: Accepted
- **Context**: Some early placeholder documents (`school.MD`, removed in Phase 1) referenced Next.js/React, while the actual implemented application in `apps/web` is a comprehensive Angular 18 + Ionic 8 SPA with 11 working role portals and 12 automated verification scripts.
- **Decision**: Standardize strictly on **Angular 18 + Ionic 8 + TypeScript** (`apps/web`) and preserve the existing UI design, layouts, and styling intact.
- **Consequences**: Zero rewrite waste; all implemented portals (`super-admin`, `school-setup`, `registrar`, `bursar`, `head-oversight`, `academic-setup`, `teaching-responsibilities`) remain functional and protected.

---

## ADR-002: Server-Side Database Sessions (`UserSession`) with CSRF Protection

- **Status**: Accepted
- **Context**: School management systems require immediate session revocation when a staff member is suspended or logs out on a shared school computer.
- **Decision**: Use opaque session tokens hashed with SHA-256 in the PostgreSQL `UserSession` table, delivered via an `HttpOnly`, `SameSite=Lax` cookie (`syncacademy_session`) paired with a per-session `x-csrf-token` header on mutating requests.
- **Consequences**: Eliminates XSS token theft from `localStorage` and allows instant server-side session invalidation without requiring a separate Redis cluster.

---

## ADR-003: PostgreSQL Transactional Outbox (`Outbox`) Instead of External Message Brokers

- **Status**: Accepted
- **Context**: SyncAcademy must reliably send staff invitations, password resets, and guardian notifications (Email, SMS, WhatsApp) without losing messages when external gateways fail, while keeping monthly infrastructure costs ultra-low for Tanzanian school pilots.
- **Decision**: Store outgoing asynchronous events in the PostgreSQL `Outbox` table inside the same ACID transaction (`prisma.$transaction`) as the triggering domain change, and process them via `apps/api/src/worker.ts` with exponential backoff and delivery tracking in `CommunicationLog`.
- **Consequences**: Guarantees at-least-once delivery without paying for or operating Redis, BullMQ, RabbitMQ, or Kafka during the MVP stage.

---

## ADR-004: Shared-Schema Multi-Tenancy Keyed by `schoolId` with Global `User` Identity

- **Status**: Accepted
- **Context**: Each school requires strict data isolation, yet Super Admins manage multiple schools and parents (`Guardian`) may have children enrolled in multiple SyncAcademy schools (e.g., a primary school and a secondary school).
- **Decision**: Keep `User` (and global `GuardianAccount` identity) cross-tenant while scoping all school operational tables by `schoolId` and authorizing access through `SchoolMembership` (for staff) and `StudentGuardian` (for parents).
- **Consequences**: Supports cross-school family accounts and low-cost single-database operations while requiring strict `schoolId` filtering on every tenant query.

---

## ADR-005: Planned Consolidation of Legacy vs. Normalized Academic Tables (Phase 2)

- **Status**: Proposed (Scheduled for Phase 2)
- **Context**: Migration `20260327000200_core_school_foundation` introduced relational tables (`Examination`, `Mark`, `AttendanceRecord`, `ReportCard`), while migration `20260410153000_normalize_academic_portal_storage` added `AcademicExamItem`, `AcademicScoreRecord`, `AcademicAttendanceSession`, and `AcademicReportCardRecord` used by `AcademicController`.
- **Decision**: Preserve all existing migrations and tables during Phase 1 cleanup, and unify the academic domain around the active `Academic*` relational tables in Phase 2 once full data-migration and foreign-key constraints are verified.
- **Consequences**: Prevents breaking active academic and class-teacher portals during Phase 1 while establishing a clear path to eliminate schema duplication in Phase 2.
