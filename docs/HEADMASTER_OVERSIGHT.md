# Headmaster dashboard

Open `/head/dashboard` and choose an academic year from the header. The selected year changes the Headmaster's view; it does not change another staff member's selected year. Closed years remain readable.

## School management

- **Overview:** active enrollments, staff, approved academic average, submissions awaiting review, current year finance totals, outstanding invitations, reports awaiting review, and recent activity.
- **Academic Years:** create or edit a year's name and dates, close a completed year, and reopen one when a correction is needed. Closure requires every assessment to be closed and every submission approved. Closed years reject academic changes while preserving their history.
- **School Settings and Setup:** edit the registered school name, region, type, address, phone, email and website; review the fixed school code; and set grading bands and pass mark for the selected year. Submitted marks keep their earlier grading snapshot.
- **Staff:** invite a Registrar, Academic Master, teacher or Bursar; track, resend and revoke pending invitations; search the staff directory and activate or deactivate membership. Deactivation revokes existing sessions while retaining records for successors.
- **Students and classes:** review class lists, student records, imports, admissions, enrollment reports, roster issues, subjects and teaching responsibilities through the shared Registrar and Academic Master records.

## Oversight

- **Finance Overview** at `/head/finance`: expected, collected, outstanding and overdue totals, student balances, fee structures, payments and finance activity. The Headmaster can create or apply fee structures using the shared Bursar workflow. The overview links and export use the selected academic year.
- **Academic Results** at `/head/academic-results`: filter assessment marks by class, subject and status. Approved marks are shown by default; provisional statuses are labelled. Class and subject summaries use each submission's captured grading policy.
- **Academic Progress** at `/head/academic-progress`: attendance, assessment deadlines, teacher submission progress, syllabus updates, support plans and exam timetable.
- **Staff Activity** at `/head/activity`: recent school audit events and academic actions for the selected year. School audit events are a recent history, not a complete reconstructed record of every past edit.
- **Student Reports** at `/head/reports`: review, approve and print reports prepared from approved subject results. Sending reports to guardians remains outside the agreed scope.

The backend authorizes all changes for the selected school and role. The academic and finance records persist on the server, so incoming staff can read the earlier records relevant to their assignments.

## Verification

The isolated API integration suite covers Headmaster profile editing, year editing and closure, role restrictions, report approval, academic handover and finance permissions. Browser checks in `apps/web/scripts/check-head-browser.mjs` cover year editing, grading, school profile and invitations at desktop and mobile widths. Run the API and web production builds before updating containers.
