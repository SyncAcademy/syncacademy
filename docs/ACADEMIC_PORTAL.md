# Academic Master portal

Open `/academic/dashboard`. `/academic` and `/academic/page` redirect there. The shell follows the existing headmaster/teacher sidebar, compact header, mobile menu, sidebar resizing, and page spacing.

## Pages

- `/academic/marks-review`: inspect marks; approve complete, roster-confirmed submissions; return submissions with correction feedback. Updates the shared teacher store and notifications.
- `/academic/assessments`: create/edit assessments, open them, allocate established class rosters, and close after all submissions are approved. New allocations contain blank marks and retain student identities.
- `/academic/timetable`: schedule exams, reject overlapping class/invigilator/room bookings, remove slots, and export CSV.
- `/academic/teaching-assignments`: search teaching responsibilities and assign an active teacher to a subject offered by the class. Shares the headmaster assignment store.
- `/academic/curriculum`: plan topics and track completion by teaching assignment.
- `/academic/academic-reports`: class and subject averages, pass rates, grade distribution, student results, CSV export, and print layout. Filters use academic year, assessment, class, subject, and approved/provisional scope. Missing or invalid marks are excluded, never treated as zero. Averages are weighted by recorded student-subject entries, not averages of class averages.
- `/academic/student-reports`: compile approved assigned subjects, require matching student numbers across subjects, preview results, and hand off to the headmaster store without duplicate reports. Guardians are not invented: new reports have no recipients and cannot be delivered until recipient verification is implemented.
- `/academic/roster-issues`: record a resolution and notify the reporting teacher. This records the outcome; it does not modify enrolment records.
- `/academic/interventions`: review approved scores below 50%, create support plans, and track completion.
- `/academic/settings`: reference grading bands and the approval workflow. Grading policy is currently fixed, matching the teacher demo scale.

## State and boundaries

This is a frontend demo, consistent with the existing portals. Records persist in session storage. The Academic Master's year selection is independent of the teacher and headmaster. Closed years reject mutations. Demo school-wide English/Kiswahili submissions are seeded once; they are excluded from the current demo teacher's assignment list.

Established submission rosters are used when allocating a new assessment. Creating a staffing assignment does not fabricate a new official enrolment roster. All-subject report readiness means all subjects assigned to that assessment; production integration should also reconcile the official curriculum.

Authentication, server-side role/teacher/school authorization, official enrolment integration, durable database storage, configurable grading, and external notifications/delivery remain backend integration work. These screens do not send email, SMS, or WhatsApp messages.

## Validation

From the repository root:

```powershell
npm.cmd run test:academic-workflow --workspace=apps/web
npm.cmd run test:academic-years --workspace=apps/web
npm.cmd run build --workspace=apps/web -- --configuration development
```

Workflow checks cover teacher ownership, analytics, approve/return decisions, feedback, report handoff and deduplication, scheduling conflicts and date validation, syllabus updates, issue resolution, assessment allocation, year isolation, closed-year guards, and session persistence.

## Academic setup

- `/academic/classes-subjects`: create classes with capacity, subjects, and Draft/Open/Closed enrolment status. Only unused drafts can be deleted. Classes with records retain their names and subject mappings. Copy next-year structures as drafts, then select that year and open them.
- `/academic/teachers`: create teacher profiles in the headmaster approval queue and record manual contact checks. Approved staff become available to teaching assignments.
- `/academic/settings`: edit year-specific grade bands and pass marks. Draft/returned marks use current settings; submission captures a grading snapshot. Historical submitted/approved records retain the default scheme if they predate snapshots. Analytics and reports use each result's scheme.

Registrar registration requires an open class with capacity and creates the profile and enrolment together. Data remains in frontend session storage; production requires server authorization and transactional persistence.

Headmaster views at `/head/academic-results` and `/head/academic-progress` read these same records. Headmaster class and teaching-assignment routes are view-only; Academic Master entry routes remain available. See [headmaster oversight](HEADMASTER_OVERSIGHT.md).
