# SyncAcademy — Frontend Architecture (`apps/web`)

## 1. Framework & Build Configuration

- **Framework**: Angular `^18.2.0` (`@angular/core`, `@angular/router`, `@angular/forms`, `@angular/common/http`).
- **Component Model**: 100% **Standalone Components** (`standalone: true`) loaded lazily via `loadComponent` in `apps/web/src/app/app.routes.ts`.
- **UI Toolkit**: Custom SCSS design system (`apps/web/src/styles.scss`) combined with `@ionic/angular ^8.0.0` and `ionicons ^7.0.0` registered in `apps/web/src/app/app.config.ts`.
- **Reactivity**: Angular Signals (`signal()`, `computed()`) combined with RxJS `Observable` streams (`firstValueFrom`) for HTTP requests and Server-Sent Events.
- **Dev Proxy**: `apps/web/proxy.conf.json` proxies `/api` requests to `http://localhost:3000` during local development (`npm run dev:web`).

---

## 2. Active Route Map & Role Portals

Defined in `apps/web/src/app/app.routes.ts`:

| Path | Component | Route Guards | Target User Role(s) |
|---|---|---|---|
| `/` | `LandingPageComponent` (`features/landing/landing.page.ts`) | Public | Prospective schools, visitors |
| `/auth`, `/login` | `AuthPageComponent` (`features/auth/auth.page.ts`) | Public | All staff authenticating |
| `/accept-invitation` | `AcceptInvitationPageComponent` (`features/auth/accept-invitation.page.ts`) | Public (Token) | Invited school admins & staff |
| `/reset-password` | `ResetPasswordPageComponent` (`features/auth/reset-password.page.ts`) | Public (Token) | Staff resetting passwords |
| `/super-admin` | `SuperAdminPageComponent` (`features/super-admin/super-admin.page.ts`) | `authGuard`, `superAdminGuard` | `SUPER_ADMIN` |
| `/school-setup`, `/school-admin` | `SchoolSetupPageComponent` (`features/school-setup/school-setup.page.ts`) | `authGuard`, `schoolSetupGuard` | `SCHOOL_ADMIN`, `HEAD_TEACHER`, `SUPER_ADMIN` |
| `/registrar` | `RegistrarPageComponent` (`features/registrar/registrar.page.ts`) | `authGuard`, `registrarGuard` | `REGISTRAR`, `SCHOOL_ADMIN`, `HEAD_TEACHER`, `SUPER_ADMIN` |
| `/bursar` | `BursarPageComponent` (`features/bursar/bursar.page.ts`) | `authGuard`, `bursarGuard` | `BURSAR`, `HEAD_TEACHER`, `SUPER_ADMIN` |
| `/headmaster`, `/head-oversight` | `HeadOversightPageComponent` (`features/head-oversight/head-oversight.page.ts`) | `authGuard`, `headTeacherGuard` | `HEAD_TEACHER`, `SUPER_ADMIN` |
| `/academic`, `/academic-setup` | `AcademicSetupPageComponent` (`features/academic-setup/academic-setup.page.ts`) | `authGuard` | `SCHOOL_ADMIN`, `HEAD_TEACHER`, `CLASS_TEACHER`, `TEACHER` |
| `/class-teacher`, `/teaching-responsibilities`, `/teacher` | `TeachingResponsibilitiesPageComponent` (`features/teaching-responsibilities/teaching-responsibilities.page.ts`) | `authGuard` | `CLASS_TEACHER`, `TEACHER`, `SCHOOL_ADMIN`, `HEAD_TEACHER` |

---

## 3. Core Services (`apps/web/src/app/core/services/`)

1. **`AuthService` (`auth.service.ts`)**:
   - Bootstraps viewer session via `GET /api/auth/session`.
   - Manages login (`POST /api/auth/login`), logout (`POST /api/auth/logout`), invitation inspection/acceptance, password reset, and Super Admin platform actions (`/api/platform-settings`, `/api/schools`, `/api/invitations`).
   - Attaches `withCredentials: true` and `x-csrf-token` headers to authenticated requests.
2. **`SchoolService` (`school.service.ts`)**:
   - Synchronizes school directory entities (academic years, terms, levels, classes, subjects, teacher assignments, students, guardians) and bursar finance data (`/api/schools/:schoolId/bursar/*`).
   - Opens an `EventSource` connection to `/api/realtime/stream` for live cross-portal updates.
3. **`AcademicOperationsService` (`academic-operations.service.ts`)**:
   - Communicates with `/api/schools/:schoolId/academics/*` to load and mutate grading scales, examination items, student marks, academic approvals, attendance sessions, and report cards.
4. **`RegistrarOperationsService` (`registrar-operations.service.ts`)**:
   - Communicates with `/api/schools/:schoolId/registrar/*` to manage admission applications, student enrollments, promotions, transfers, and completion certificates.

---

## 4. Unrouted Legacy Components (Preserved Pending Owner Review)

Six feature components exist in `apps/web/src/app/features/` that are not currently wired into `app.routes.ts`:
- `features/academic/academic.page.ts` (superseded by `academic-setup/academic-setup.page.ts`)
- `features/bursar/fee-guide.page.ts`
- `features/parent/parent.page.ts` (early prototype for future Parent Portal)
- `features/student/student.page.ts` (early prototype for future Student Portal)
- `features/teacher/teacher.page.ts` (superseded by `teaching-responsibilities/teaching-responsibilities.page.ts`)
- `features/teachers/teachers.component.ts`

Per the Phase 1 Cleanup Manifest, these files are preserved intact until the product owner decides whether to repurpose or retire them in a future phase.
