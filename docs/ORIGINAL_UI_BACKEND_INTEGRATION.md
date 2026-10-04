# Original UI and real backend integration

Updated 2026-09-28. The owner explicitly requires the former UI. Preserve its sidebars, page structure, cards, tables, dialogs, responsive styles and navigation. Do not replace it with the generic live workspace. Keep the removed general dashboard removed. No payments or subscriptions are in scope.

## Restored pages

- Login uses the original sign-in layout with real authentication. Invitation acceptance, password recovery and account security use the same original authentication shell. Long security forms allow document scrolling.
- Super Admin retains its original dashboard, school directory/editor/detail, settings, audit and status layouts. Counts, schools, administrators and audit entries come from PostgreSQL. School creation invites its Headmaster; the directory can open the original school portal, staff invitation page and student registration page. School status changes use the API.
- Headmaster retains its original portal. Staff and pending invitations are real. Invitations support resend/revoke, and membership activation changes invalidate sessions. Academic years, classes, teacher assignments and student registration use the API.
- Registrar retains its original directory, forms and navigation. Student registration persists admission number, name, class enrollment and optional gender, date of birth and address. Student login invitations are restricted to authorized school managers. Academic-year selection follows the current portal.
- Academic retains its original portal. Classes and teaching assignments can be created through real APIs; teacher and class lists come from the school workspace.
- Teacher retains its original portal and sees only assigned classes and permitted student rosters. Profile identity comes from the authenticated account.
- Bursar retains the original shell with a non-payment workflow unavailable state. Student and Parent use the existing live account view because there was no corresponding original portal. Parent-child access is not implemented.

## Data and authorization

`SchoolApiService` provides a school-scoped server snapshot to the existing portal stores. Loading, error/retry, school selection and unavailable states are explicit. No mock business records or browser-persisted business database are loaded by these adapters. Legacy store names containing `Demo` remain for compatibility with existing components; they do not imply seeded records.

Backend authorization remains authoritative. Route guards require a valid session, appropriate role and required security setup. Teacher projections omit student addresses and birth dates. Student access is restricted to the student's own linked record. Only school managers receive school audit records. List limits are disclosed; the platform school directory has server pagination. School workspace lists currently cap at 100 records and need server pagination before larger school deployments.

The new student-profile migration adds nullable gender and address columns. It preserves existing accounts and records. Never reset the database, re-bootstrap the owner's account, change their password or seed demo records while restoring UI.

## Unfinished workflows

Marks, assessments, subject configuration, attendance, roster confirmation, report generation, guardian linking, admission approvals, student profile editing, extended school setup, editable platform preferences, creating additional Super Admins and non-payment Bursar workflows still require backend implementation. Their original structure is retained, but actions are disabled or report that the workflow is unavailable. Do not show fake success or save their business data to localStorage. Implement one complete authorized workflow at a time in the original components.

## Verification and continuation

The PostgreSQL integration suite passes 21 tests, including school provisioning, invitations, all-role login, session/MFA controls, tenant isolation, student registration and the restored portal API projections. API compilation and the production frontend build pass. Frontend bundle-size and existing Sass warnings remain. Browser visual verification was unavailable in this session; do not claim a completed visual comparison.

Rebuild with `docker compose build`, then run `docker compose up -d`. The migration service applies schema changes before API startup. Do not run `down -v`. Preserve the private `.env`, encryption keys and existing database volume. SMTP uses the configured provider and requires working SMTP credentials.

For visual review, check desktop and mobile sign-in/security scrolling, Super Admin school creation, school navigation, staff invitation dialogs, class/year creation, student registration and teacher roster visibility. Keep this review within the former UI.

## School Setup navigation correction (2026-09-29)

The Settings link and School Setup checklist are interactive again. Only the unfinished preference/detail editing forms remain inert. Checklist values come from the current school workspace; Headmasters follow routes within their own portal, preserving the school query parameter. Fees are excluded, and grading is explicitly unavailable. The original setup cards and page styling remain.
