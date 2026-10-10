# Student management implementation

Implemented 2026-10-04 in the original school portals. Extended 2026-10-05 with imports, subject enrollment, roster issues and basic guardian contact fields; see [current registrar workflows](REGISTRAR_WORKFLOWS.md). Guardian accounts, verification and messaging remain out of scope. No application demo records are seeded.

## Available workflows

- Registrar: overview, student search and pagination, profile editing, admission applications and acceptance/rejection, enrollment into an open academic year, class transfers, withdrawal, transfer out, graduation, reactivation, year progression, CSV exports, and enrollment activity reports.
- Headmaster: the same student management screens, reached from the new Student Management navigation group.
- Academic: read-only student directory and active class rosters; student profile addresses and birth dates are excluded by the API.
- Teacher: only active students in their assigned classes. Transfers and departures update access and class counts on refresh.

Academic-year selection follows the current portal. Student numbers are unique within a school. Closed years reject writes, except progressing active source-year students into a later open year. Moving a student preserves the enrollment date and records both class IDs and the reason. Progression creates new target-year enrollments atomically and preserves source-year enrollment records.

## Implementation

`apps/api/src/registry.controller.ts` exposes school-scoped `/api/v1/schools/:schoolId/registry` routes. Every mutation requires Headmaster/Registrar authority or an authorized platform-admin session. Writes use serializable transactions and idempotency keys. Student profiles and enrollment movements use version checks. Reads are paginated, with stable ordering and optional search/class/status filters. CSV export follows all matching result pages.

Migration `202610040001_student_management` adds student/enrollment versions, enrollment status, admission applications, and registry history. It does not delete or replace existing students, accounts, or credentials. Existing enrollments become active. Historical records predating the migration retain their enrollment dates but do not receive invented activity events.

The workspace projection counts only active class enrollments, filters teacher-visible enrollment details, and no longer silently cuts student rosters off at 100 records. The separate registry directories use server pagination; workspace projections still load school records for existing dashboards and may need narrower projections for very large deployments. Staff/assignment previews remain capped at 100 and disclose that limit.

Old mock datasets were removed. The former demo-named adapters are now `HeadStore`, `TeacherStore`, and `ReportStore`. Report generation, assessment submission, attendance, and other unfinished modules remain unavailable; report delivery and payment simulations are not presented as saved actions. Fake public preview student details and dashboard figures were replaced with informational empty states. Existing contact-form work was preserved.

## Validation

- PostgreSQL authentication/workflow integration suite: 27 tests passed, including student management, role/school isolation, closed years, concurrent enrollment, stale edits, idempotency, privacy, transfers, admissions, progression and search beyond 100 records. Fixtures exist only in the isolated `syncacademy_auth_test` database.
- `npm.cmd run test:registrar-workflow --workspace=syncacademy-web`: passed. Tests workspace refresh during editing, API submission, stale responses after switching schools, and Academic read-only access. These are logic tests, not browser layout tests.
- API TypeScript build and frontend production compilation pass. Existing Sass and bundle-size warnings remain.
- Browser visual verification was unavailable because no browser connection was exposed in the session. Responsive styles, table scrolling, bounded dialogs and keyboard focus handling are implemented, but desktop/mobile screenshots still need review.

The older frontend module check scripts describe pre-backend workflows; only the Registrar workflow check was replaced in this increment. The PostgreSQL suite is the authoritative check for persisted operations.

## Local runtime verification

The API and website Docker images were rebuilt and the existing `api`/`web` services reloaded at http://localhost:8080. The migration service completed successfully. API readiness and the website returned HTTP 200; the new registry routes returned HTTP 401 for anonymous requests. The restricted runtime database account can read the new tables and fields. Registry integration-test schools are absent from the application database. Existing database volumes and credentials were preserved.
