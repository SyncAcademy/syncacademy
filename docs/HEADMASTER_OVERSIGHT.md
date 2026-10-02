# Headmaster oversight

The headmaster monitors staff-maintained records through the shared stores. No copies of the finance ledger or academic results are entered by the headmaster.

## Pages

- `/head/dashboard`: collected and outstanding fees, overdue balance, approved-result average, submissions awaiting academic review, student enrolment and admission counts, pending staff approvals, prepared reports, and recent staff activity.
- `/head/finance`: year/term/class filters, collection graphs, student balances, fee structures, payment receipts and void reasons, adjustments/scholarships, and CSV balance export. Amounts and overdue calculations use the same functions as the bursar dashboard. Unapplied fee structures do not contribute to expected charges.
- `/head/academic-results`: assessment/class/subject/status filters, class and subject graphs, individual marks and grades, and CSV export. Approved results are the default; other statuses are labelled provisional. Grades and pass rates use each assessment's grading scheme/snapshot.
- `/head/academic-progress`: assessments, deadlines, teacher submission status, syllabus coverage, support plans, and exam timetable.
- `/head/activity`: recorded fee charges, payments/voids, adjustments, academic actions, teacher submissions, and registry events, with source-workflow and search filters. This is not a complete identity audit trail; existing records without action timestamps cannot reconstruct every historical edit.
- `/head/classes-subjects` and `/head/teaching-assignments`: view-only projections of Academic Master setup and Registrar enrolment data. Entry forms remain in the responsible staff portal.

Headmaster academic-year management, staff approval, and report-release controls remain available. Monitoring pages contain no fee/payment/mark entry, void, or academic review actions.

Each monitoring page uses the headmaster's selected year. The read APIs do not select a year on the bursar, teacher, academic, or registrar dashboard. Historical views remain accessible without altering source records.

## Frontend scope

Updates are reactive within the same browser session/application, matching the existing demo architecture. Session storage is not cross-user synchronization. Production needs a shared backend, authenticated role permissions, durable audit identities/timestamps, and server-side authorization. The UI separation is not a security boundary.

## Validation

`npm.cmd run test:head-oversight --workspace=apps/web`

Checks live source-to-head updates for charges, payments, voids, adjustments, academic review, and enrolment changes; verifies shared grades, term filtering, year isolation across roles, historical empty states, and non-mutating reads. Existing bursar and academic regression checks also run.
