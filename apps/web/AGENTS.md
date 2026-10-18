# SyncAcademy Frontend — Agent Instructions (`apps/web/AGENTS.md`)

This document provides workspace-specific governance rules for `apps/web` (`syncacademy-web`), supplementing the root [`AGENTS.md`](../../AGENTS.md).

---

## 1. Frontend Architecture & Stack

- **Framework**: Angular 18 (`@angular/core ^18.2.0`) using **Standalone Components** (`standalone: true`) and **Angular Signals** (`signal`, `computed`).
- **UI Integration**: Custom design system in `src/styles.scss` + `@ionic/angular ^8.0.0` (`provideIonicAngular({})` in `src/app/app.config.ts`) + `ionicons ^7.0.0`.
- **Routing**: Defined centrally in `src/app/app.routes.ts` with lazy-loaded standalone page components (`loadComponent`) and functional route guards (`authGuard`, `superAdminGuard`, `schoolSetupGuard`, `registrarGuard`, `bursarGuard`, `headTeacherGuard`).
- **API Communication**:
  - `AuthService` (`src/app/core/services/auth.service.ts`) manages session state (`currentUser`), CSRF token headers (`x-csrf-token`), and cookie-authenticated requests (`withCredentials: true`).
  - `SchoolService` (`src/app/core/services/school.service.ts`) manages active tenant school state, registrar directory queries, bursar operations, and realtime SSE subscriptions (`/api/realtime/stream`).
  - `AcademicOperationsService` (`src/app/core/services/academic-operations.service.ts`) handles academic setup, teacher assignments, exams, marks entry, approvals, attendance, and report cards (`/api/schools/:schoolId/academics/*`).
  - `RegistrarOperationsService` (`src/app/core/services/registrar-operations.service.ts`) handles applications, enrollments, promotions, transfers, and certificates (`/api/schools/:schoolId/registrar/*`).

---

## 2. Strict UI Protection Rules

1. **Zero Unapproved Visual Changes**:
   - Do **not** alter HTML structure, CSS classes, SCSS rules, colors, fonts, icons, or responsive breakpoints in any active component under `src/app/features/` or `src/styles.scss` without explicit owner approval.
2. **Active Portal Components (`Must Preserve`)**:
   - `src/app/features/landing/landing.page.ts` (`/`)
   - `src/app/features/auth/auth.page.ts` (`/auth`, `/login`)
   - `src/app/features/auth/accept-invitation.page.ts` (`/accept-invitation`)
   - `src/app/features/auth/reset-password.page.ts` (`/reset-password`)
   - `src/app/features/super-admin/super-admin.page.ts` (`/super-admin`)
   - `src/app/features/school-setup/school-setup.page.ts` (`/school-setup`, `/school-admin`)
   - `src/app/features/registrar/registrar.page.ts` (`/registrar`)
   - `src/app/features/bursar/bursar.page.ts` (`/bursar`)
   - `src/app/features/head-oversight/head-oversight.page.ts` (`/headmaster`, `/head-oversight`)
   - `src/app/features/academic-setup/academic-setup.page.ts` (`/academic`, `/academic-setup`)
   - `src/app/features/teaching-responsibilities/teaching-responsibilities.page.ts` (`/class-teacher`, `/teaching-responsibilities`, `/teacher`)
3. **Unrouted Legacy Feature Files (`Requires Owner Verification Before Removal`)**:
   - The following 6 components are currently not wired into `app.routes.ts` (`academic/academic.page.ts`, `bursar/fee-guide.page.ts`, `parent/parent.page.ts`, `student/student.page.ts`, `teacher/teacher.page.ts`, `teachers/teachers.component.ts`). Do not delete or route them without explicit owner direction.

---

## 3. State Management & API Wiring Standards

1. **Always Include Credentials & CSRF Headers**:
   - Any new HTTP call to `/api/*` must include `withCredentials: true` and attach the `x-csrf-token` header from `AuthService.csrfToken()` on mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
2. **Avoid Hardcoded Tenant IDs**:
   - Always resolve the current `schoolId` from `SchoolService` or the authenticated user's active school membership context.
3. **Avoid Local-Only Persistence for Core Records**:
   - Do not store authoritative school, academic, or financial records solely in `localStorage`. Persist domain state through the backend API so multi-user and multi-device sessions remain consistent.

---

## 4. Frontend Build & Verification Commands

Run these commands from the repository root before committing frontend changes:

```bash
# Production build check
npm run build --workspace=apps/web

# Automated portal workflow verification scripts
npm run test:registrar-workflow --workspace=apps/web
npm run test:academic-workflow --workspace=apps/web
npm run test:academic-years --workspace=apps/web
npm run test:bursar-workflow --workspace=apps/web
npm run test:head-oversight --workspace=apps/web
npm run test:class-teacher --workspace=apps/web
npm run test:school-setup --workspace=apps/web
npm run test:super-admin --workspace=apps/web
```
