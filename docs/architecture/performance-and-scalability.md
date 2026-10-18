# SyncAcademy — Performance, Concurrency & Scalability Architecture

This document consolidates SyncAcademy's query optimization patterns, real-time synchronization architecture, concurrency controls, and storage scalability roadmap.

---

## 1. Real-Time Synchronization & Request Coalescing

- **Server-Sent Events (`/api/realtime/stream`) & Realtime Bus**:
  - Successful domain mutations emit lightweight invalidation notices (`RealtimeBus`) scoped strictly by `schoolId` and verified against the connected user's active session and role membership.
  - Multi-process API deployments can share invalidation notices over PostgreSQL `LISTEN / NOTIFY` (`REALTIME_TRANSPORT=postgres`), while durable side effects (emails, SMS, WhatsApp) always flow through the transactional `Outbox` table.
- **Client-Side Coalescing & Revision Checks**:
  - Angular services (`SchoolService`, `AcademicOperationsService`) coalesce concurrent workspace reads, queue at most one follow-up refresh when invalidations arrive mid-flight, and discard stale responses if the user switches schools, changes academic years, or logs out.
  - Visible academic dashboards poll lightweight revision metadata and apply revision-bound patches on save rather than re-downloading unchanged multi-megabyte workspace payloads.

---

## 2. Optimistic Concurrency & Draft Protection

- **Student Profiles & Registry Writes**:
  - Student profile updates and enrollment movements carry record version counters. Competing concurrent edits from multiple officers result in one winner and one `HTTP 409 Conflict`, preventing silent lost updates.
- **Marks Entry & Attendance Revisions**:
  - Each class/subject examination submission and daily attendance register tracks a monotonic `revision`.
  - Conditional updates (`WHERE revision = :loadedRevision`) and serializable transactions ensure stale browser drafts cannot overwrite newer submitted or reviewed marks.
  - Frontend draft guards (`check-concurrent-drafts.mjs`) preserve unsaved local mark/attendance edits during background refreshes and prompt the teacher to resolve conflicts explicitly.

---

## 3. Database Query & Payload Optimizations

- **Grouped Finance Aggregations**:
  - School and bursar balance summaries compute expected fees, non-void payments, and adjustments using school-scoped grouped queries/CTEs rather than correlated per-student subqueries.
- **Batched Enrollment & Subject Lookups**:
  - Workspace projections batch enrollment-subject lookups by `(schoolId, enrollmentId)` and use indexed composite keys beginning with `schoolId`.
- **Selective View Projections**:
  - Dashboard and summary routes request bounded projections (`view=overview` / `view=summary` / `view=marks`) and server-paginated directories (`page`, `pageSize`, `q`) so overview screens do not transfer full historical student or mark archives unnecessarily.

---

## 4. Academic Storage Normalization Roadmap

- **Transition from Monolithic JSONB to Normalized Relational Tables**:
  - Early iterations stored full-year academic state in a single JSONB row per school/year, which causes PostgreSQL TOAST rewrites and row-lock contention when multiple teachers save marks or attendance simultaneously.
  - Migration `20260410153000_normalize_academic_portal_storage` introduced normalized relational tables (`AcademicGradingScale`, `AcademicClassAssignment`, `AcademicExamItem`, `AcademicScoreRecord`, `AcademicApprovalItem`, `AcademicAttendanceSession`, `AcademicAttendanceEntry`, `AcademicReportCardRecord`) used by `AcademicController`.
  - **Scale Cutover Rules**:
    1. Keep every table keyed and indexed by `schoolId` (composite tenant foreign keys).
    2. Enforce optimistic `revision` checks (`409 Conflict` on stale drafts) at the individual submission and attendance-session level so teachers in different classes never block each other.
    3. Queue bulk report-card PDF generation through the PostgreSQL `Outbox` worker and store generated artifacts in Cloudflare R2 rather than holding open long HTTP transactions.
