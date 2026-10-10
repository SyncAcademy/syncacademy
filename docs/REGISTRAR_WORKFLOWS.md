# Registrar workflows

Updated 2026-10-05. Entry point: `/register/page`. Student management uses PostgreSQL and school-scoped APIs.

## Available workflows

- Admissions, registration, profile editing, enrollment, class lists, movements, graduation/reactivation, year progression, enrollment reports and CSV export.
- Student profiles include admission date, own phone, guardian name and guardian phone. A guardian contact is part of a student record; guardian accounts, multiple-guardian management, phone verification and messaging remain out of scope. Contact fields are optional for compatibility with existing records and visible only to Registrar/Headmaster or authorized platform administrators.
- `/register/import`: CSV UTF-8 and Excel `.xlsx` imports with worksheet selection, header suggestions, explicit ignored columns, class aliases, a class default, date-format selection, preview, row errors, error CSV downloads, and confirmation. Existing student records are never overwritten.
- `/register/subjects`: read class subject offerings. Academic Masters use `/academic/subjects` and Headmasters use `/head/subjects` to create subjects, save class offerings and assign subject teachers. Student subject choices are available during registration, enrollment, admission acceptance, movements and progression, and through **Subjects** in the student directory. Subject-specific teacher rosters derive from enrollment subjects. Existing whole-class assignments retain whole-class access.
- `/register/roster-issues`: persistent open/resolved teacher requests with resolution notes and reopening. The registrar header badge counts open issues in the selected year. Academic Masters and Headmasters share this inbox. Teachers report from their roster, see responses, and confirm rosters after issues are resolved. Student enrollment/subject movements invalidate roster confirmation.

## Import behavior

1. Download the CSV template or choose an existing CSV/`.xlsx` file. Older `.xls` files must first be saved as `.xlsx` or CSV. Limits: 5 MB, 5,000 student rows, 256 source columns; Excel formulas must be pasted as values.
2. Map each supported field at most once. Student name and admission number are required. Class comes from a mapped column or the class default. Extra columns remain ignored. Subject names/codes are separated with semicolons and must match class offerings.
3. Select ISO, day-first or month-first dates explicitly. Phone and admission-number spreadsheet cells should be text to preserve leading zeros. The importer cannot recover zeros already removed by Excel.
4. Server validation checks required values, dates, phone syntax, school/year classes, offered subjects, existing admission numbers and duplicates within the whole file. Preview creates no student records.
5. Confirm valid rows. The server revalidates each batch of at most 50 records and saves results and cursor atomically. Newly invalid rows receive errors. Resume retrieves the server cursor, so an interrupted response does not duplicate records. Jobs expire after 24 hours; expired jobs are removed on a subsequent preview by the same school/user. Leaving the page loses the local preview; re-uploading remains safe because existing admission numbers fail validation.
6. The academic-year import history lists uploaded files. A Registrar or Headmaster can remove a preview or completed import record after confirmation. This clears the stored import payload and history entry, while all imported student records remain. Partially processed imports must be finished before their record can be removed.

Writes enforce school/role authorization, open academic years, serializable transactions, idempotency and optimistic versions where applicable. Guardian verification failure alerts are excluded because verification and delivery are excluded.

## Validation

```powershell
npm.cmd run prisma:generate --workspace=@syncacademy/api
npm.cmd run build --workspace=@syncacademy/api
npm.cmd run test:integration --workspace=@syncacademy/api
npm.cmd run test:registrar-workflow --workspace=syncacademy-web
npm.cmd run build --workspace=syncacademy-web
```

Integration tests use only `syncacademy_auth_test`. They check preview without student mutation, duplicate/invalid rows, batch resumption and idempotency, subject-scoped teacher access, guardian privacy, issue resolution/stale versions, notification projection and closed years. Frontend checks cover editing, CSV quoting, aliases/ignored columns, date formats, `.xlsx` text values and clearing file data across schools. No browser connection was available for visual desktop/mobile verification.

## Local verification result

All 31 PostgreSQL integration tests and the registrar frontend checks passed. The API and production website images built successfully. Existing Sass/bundle warnings remain; ExcelJS is loaded on demand and produces a CommonJS build warning.

Migration `202610050001_registrar_workflows` was applied to the Docker application database; the existing runtime role received access to the new tables. The API and website were reloaded at `http://localhost:8080`. Website and API readiness returned HTTP 200, anonymous subject/inbox requests returned HTTP 401, and a 40 KB import preview request reached API authorization through nginx. Integration-test schools are absent from the application database. The separate host PostgreSQL instance used by the integration suite is not the Docker application's database. Existing application records, volumes and credentials were preserved.
