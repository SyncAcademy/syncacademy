# SyncAcademy Backend (`apps/api`)

The SyncAcademy backend (`@syncacademy/api`) is a **NestJS 10 + Prisma 5 + PostgreSQL 16** REST API and transactional outbox worker.

## Key References
- System Design & Backend Architecture: [`docs/system-design-and-architecture.md`](../../docs/system-design-and-architecture.md)
- Mobile Architecture & Store Readiness: [`docs/mobile-architecture-and-store-readiness.md`](../../docs/mobile-architecture-and-store-readiness.md)
- Development & Deployment Guide: [`docs/development-and-deployment.md`](../../docs/development-and-deployment.md)

## Core Capabilities
- **Multi-Tenant REST API**: Scoped to `School.id` with role-based access control (Super Admin, School Admin, Headmaster, Registrar, Bursar, Teachers, Parents).
- **Mobile API Endpoints**:
  - `/api/v1/parent/auth/*`: Opaque mobile bearer session issuance, child rosters, and self-service account deletion (Apple 5.1.1(v) & Google Play compliance).
  - `/api/v1/parent/push/devices`: Secure FCM/APNs push device registration and unregistration.
  - `/api/v1/academics/schools/:schoolId/attendance`: Teacher attendance recording with optimistic concurrency revision tracking (`revision: 0` initial, revision match on updates, HTTP 409 Conflict on mismatch) and UUID transaction-level idempotency locking.
- **Transactional Outbox Worker**: Asynchronous email, SMS (NextSMS), and notification processing via PostgreSQL `Outbox` table.

## Commands
```bash
# Generate Prisma Client
npm run prisma:generate --workspace=apps/api

# Apply database migrations
npm run prisma:migrate:deploy --workspace=apps/api

# Build TypeScript to dist/
npm run build --workspace=apps/api

# Run integration tests
npm test --workspace=apps/api

# Run mobile security and tenant isolation tests
npm run test:parent-mobile --workspace=apps/api
npm run test:mobile-isolation --workspace=apps/api

# Run security hardening and audit log tests
npm run test:security-hardening --workspace=apps/api
npm run test:audit-log --workspace=apps/api
npm run test:school-branding --workspace=apps/api
```
