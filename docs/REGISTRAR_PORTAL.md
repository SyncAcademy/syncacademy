# Registrar portal

Entry point: `/register/page`. `/register` and `/register/dashboard` redirect to it. The portal uses the existing compact header, academic-year selector, sidebar, mobile menu, and shared portal styling.

## Pages and workflows

- **Admissions** (`/register/admissions`): record applications, accept and enrol into a selected class, or reject with a reason. Acceptance creates a permanent student number and an unverified guardian link in the same state update.
- **Student Directory** (`/register/students`): view student profiles, search/filter, paginate, export CSV, and inspect enrolment history and archived roster marks. Student numbers cannot be changed or duplicated.
- **Enrolment** (`/register/enrolment`): view placement and navigate to Class Lists to add students. One enrolment per student/year; class changes use the movement workflow.
- **Class Lists** (`/register/class-lists`): select an open class, register students directly into it, add existing profiles, edit profiles, or move/remove students with a reason. Capacity and status are checked before changes. Inspect rosters and publish them into draft/returned teacher assessment rosters. Existing marks for retained students are preserved. Removed draft entries are archived and visible in the student profile. Submitted and approved assessment snapshots are left unchanged.
- **Parents & Guardians** (`/register/guardians`): add/edit contacts, link existing guardians to more students, record manual verification with a note, and update unreleased report recipients. Changes to a guardian's name, email, or phone reset verification. No OTP or external message is sent. Released report recipients are not rewritten.
- **Transfers & Withdrawals** (`/register/transfers`): record class changes, departures, withdrawal, or graduation with reasons and an audit history.
- **Year Progression** (`/register/progression`): choose students and a later non-closed target year/class, review, and create target enrolments. Duplicate target enrolments reject the entire batch. Source-year records are never changed; a closed source year can therefore be used for progression into an editable target. The Academic Master prepares target classes as drafts and opens them before progression.
- **Enrolment Reports** (`/register/reports`): class counts, registration completeness, student movements, gender summary, audit trail, and CSV summary.

## Demo integration and limits

The registry uses session storage, matching the existing frontend portals. Fixture student identities are aligned with existing teacher assessment records where available. Seed guardian contacts are examples and start unverified.

Registrar year selection is independent of other roles. Closed years block direct edits. Class counts are synchronized to the shared headmaster store after enrolment changes. Student changes automatically update editable teacher rosters; manual publication remains available. Prepared academic reports can receive guardian contacts through **Update report recipients**; delivery still requires headmaster release approval and verified contacts.

Server-side authorization, database transactions, actual identity/contact verification, multi-user synchronization, official imports, and external messaging remain backend integration work. No real admissions decisions or messages are sent to an external school system.

## Validation

```powershell
npm.cmd run test:registrar-workflow --workspace=apps/web
npm.cmd run test:academic-workflow --workspace=apps/web
npm.cmd run test:academic-years --workspace=apps/web
npm.cmd run build --workspace=apps/web -- --configuration development
```

Registrar checks cover admission transitions, duplicate prevention, enrolment and class counts, locked assessment protection, draft mark preservation/archiving, guardian verification reset, report recipients, atomic progression, closed-year boundaries, independent year selections, and persistence.
