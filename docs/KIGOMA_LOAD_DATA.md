# Kigoma load-test dataset

The additive generator targets the existing **KIGOMA SECONDARY**, school code **1776**. It never creates a replacement school or changes existing login credentials. The original **2026/2027** year, its three classes, and its 49 enrollments remain available. Those 49 students are also enrolled in the generated 2026 Form 1 classes.

Select **2026**, **2025**, **2024**, **2023**, or **2022** in each role's academic-year selector. The application's default may still be **2026/2027** because it has the latest start date.

## Dataset

- 40 original teachers, including the existing teacher login, plus the academic advisor with teacher access (41 teacher-capable accounts); every teacher has assignments. The advisor teaches Mathematics in Form 1B in all six years.
- 16 classes and 800 enrolled students in each generated year: Forms 1–4, streams A/B/C; Forms 5–6, Science and Arts classes. Each class has 50 students.
- 1,800 distinct students across five years. O-level cohorts progress through four forms; A-level feeder cohorts progress through Forms 5 and 6. Historical enrollments stay active within their historical year, matching the app's progression workflow.
- Four terms per year and three assessments per term. Historical assessments are approved/closed. The 2026 dataset is simulated as of 12 October: later assessments include draft, submitted, returned, and approved work; the last assessment is scheduled as a draft.
- Student-specific marks and reports; attendance with present/late/absent/excused statuses; class teachers; teaching allocations; exam schedules; syllabus topics; support plans; notifications; admissions and registry events.
- Tuition, meals, learning-material charges, payment installments, fully paid and outstanding balances, and scholarships. Currency amounts are synthetic TZS values.
- Synthetic teacher email addresses use `example.invalid`. At the owner's request, all 41 teacher-capable accounts now share one password; their emails, shared password, subjects, and class-teacher assignments are listed as comments in `.env`, starting at `# BEGIN KIGOMA TEACHER TEST LOGINS`. This also updates the existing teacher and academic advisor's password; the advisor's other roles use that same account password. Generated guardian phone numbers are blank. No emails, SMS, or report deliveries are sent.
- Every offered class subject has an active teacher, including the original 2026/2027 year. Each of the 83 class records has exactly one active class teacher. The TEACHER role is common to all teachers; record access is scoped to assigned subjects/classes. Academic privileges remain attached to the advisor's ACADEMIC role.

## Subjects

The [NECTA CSEE subject catalogue](https://necta.go.tz/pages/csee) lists seven core subjects: Civics, History, Geography, Kiswahili, English Language, Biology, and Basic Mathematics. The dataset adds Physics/Chemistry or Bookkeeping/Commerce, and optionally Bible Knowledge or Information and Computer Studies. There are 13 offerings, with 9–10 subjects per O-level student. Each stream includes both tracks and both optional subjects. Existing equivalent subject records are reused.

The [NECTA ACSEE catalogue](https://necta.go.tz/pages/acsee) defines the selected principal combinations. Each science class contains PCM, PGM and PCB; each arts class contains HGL, HGK and HGE. Each student takes the three principal subjects plus compulsory General Studies. Mathematics is counted once at each applicable level. Scores and fees are illustrative school data, not actual NECTA results or official school charges.

## Running and checking

```powershell
node scripts/kigoma-load-data.mjs --docker          # read-only preview
node --test scripts/kigoma-load-data.test.mjs        # generated-data invariants
node scripts/kigoma-load-data.mjs --docker --apply  # insert into existing Docker school
node scripts/verify-kigoma-load.mjs --docker         # verify persisted records
```

Without `--docker`, the configured `DATABASE_URL` is used. Docker mode uses localhost:55432 and the existing runtime credential from `.env`. The separate Windows PostgreSQL instance at localhost:5432 is not this school's database.

Each year is inserted in a transaction. A completed dataset marker makes repeat runs a no-op; previously loaded years are preserved during recovery from a partial run. Existing matching year names not owned by this generator cause it to stop. An existing school with more than 40 active teachers also causes it to stop rather than removing staff.

The pre-load PostgreSQL custom-format backup is `.runtime/kigoma-before-load-20261012.dump`. Generation summaries and verification output are also in the private, Git-ignored `.runtime` directory. Restoring that full backup would replace subsequent changes; do not restore it casually.

## UI stress points to inspect

Academic data is stored as one JSON workspace per year. Full historical workspaces are approximately 48 MiB uncompressed, including 2,160 subject submissions, 9,600 reports, and 128,000 attendance entries. The academic API returns the complete year to the Academic and Headmaster roles; the frontend periodically reloads it. These are useful places to measure loading time, memory, filtering, and render performance. The attendance service also scans sheets to find the newest revision. The generator deliberately leaves those implementation choices unchanged so the dataset can reveal their behavior.

Check the year selector first, then class/subject filtering, mixed enrollment rosters, marks pagination, report lists, attendance, admission queues, and fee balances across roles. Native browser access was not available during generation; database verification is separate from visual UI verification.
