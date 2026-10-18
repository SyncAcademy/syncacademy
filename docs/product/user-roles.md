# SyncAcademy — User Roles & Permissions Matrix

SyncAcademy enforces Role-Based Access Control (RBAC) using two layers:
1. **Platform-Level Flag**: `User.isSuperAdmin` (`Boolean`) for cross-tenant platform operators.
2. **Tenant-Scoped Membership**: `SchoolMembership` linking a `User` to a `School` (`schoolId`) with a specific `MembershipRole` (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `HEAD_TEACHER`, `REGISTRAR`, `BURSAR`, `CLASS_TEACHER`, `TEACHER`, `PARENT`, `STUDENT`) and `MembershipStatus` (`ACTIVE`, `INVITED`, `SUSPENDED`).

---

## 1. Role Definitions & Primary Portals

| Role Enum | Role Title | Primary Frontend Route | Core Responsibilities |
|---|---|---|---|
| `SUPER_ADMIN` | Platform Super Administrator | `/super-admin` | Onboard and suspend schools, invite initial school admins, manage platform SMTP/notification settings, inspect global audit logs, and handle public contact submissions. |
| `SCHOOL_ADMIN` | School Administrator / Director | `/school-setup`, `/academic` | Configure school profile, academic years, terms, levels, classes, subjects, grading scales, staff invitations, and teacher assignments. |
| `HEAD_TEACHER` | Headmaster / Principal | `/headmaster`, `/academic` | Executive oversight across school academics, admissions, and finance; final approval (`HEADMASTER_APPROVED`) and publication of examination results and report cards; approval of bursar fee adjustments. |
| `REGISTRAR` | Admissions & Records Officer | `/registrar` | Manage student admission applications, register students and guardians, enroll students in classes, process annual promotions, inter-school transfers, and graduation/completion certificates. |
| `BURSAR` | School Bursar / Finance Officer | `/bursar` | Define term fee structures, issue student invoices, record fee payments, track balances, and submit fee adjustment requests for Headmaster approval. |
| `CLASS_TEACHER` | Homeroom / Class Teacher | `/class-teacher` | Record daily class attendance, enter subject marks for assigned subjects, review consolidated class result sheets, write class teacher remarks on report cards, and submit class results for academic approval. |
| `TEACHER` | Subject Teacher | `/class-teacher` (`/teaching-responsibilities`) | Enter and submit examination marks for specifically assigned class-subject pairs (`TeacherSubjectAssignment`) and view assigned teaching schedules. |
| `PARENT` | Guardian / Parent | Expiring Report Link / Future `/parent` | Receive SMS, WhatsApp, and Email notifications; access children's published report cards via secure expiring links; (Phase 4) log into unified cross-school parent portal. |
| `STUDENT` | Enrolled Student | Future `/student` | Represented as a core domain entity (`Student`) for admissions, attendance, marks, and report cards. Direct student login is reserved for post-MVP phases. |

---

## 2. Capability Authorization Matrix

| Capability / Domain Action | `SUPER_ADMIN` | `SCHOOL_ADMIN` | `HEAD_TEACHER` | `REGISTRAR` | `BURSAR` | `CLASS_TEACHER` | `TEACHER` | `PARENT` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Provision / Suspend Schools | Yes | No | No | No | No | No | No | No |
| Configure Platform SMTP Settings | Yes | No | No | No | No | No | No | No |
| Manage School Staff Invitations | Yes | Yes | Yes | No | No | No | No | No |
| Configure Academic Years, Terms, Levels, Classes, Subjects | Yes | Yes | Yes | View | View | View | View | No |
| Assign Teachers to Classes & Subjects | Yes | Yes | Yes | No | No | View | View | No |
| Manage Student Applications, Admissions, Promotions & Transfers | Yes | Yes | View/Approve | Yes | No | View Class | No | No |
| Manage Guardians & Student-Guardian Links | Yes | Yes | View | Yes | View | View Class | No | View Own |
| Enter & Submit Subject Marks | Yes | Yes | View | No | No | Assigned Only | Assigned Only | No |
| Approve Academic Results & Publish Report Cards | Yes | Academic | Final Approval | No | No | Submit Only | Submit Only | View Own Published |
| Record Class Attendance | Yes | Yes | View | View | No | Assigned Class | No | View Own Child |
| Manage Fee Structures, Invoices & Payments | Yes | View | View/Approve Adjustments | No | Yes | No | No | View Own Child |
