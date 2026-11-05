# SyncAcademy Frontend & Mobile Applications (`apps/web`)

The SyncAcademy client is an **Angular 18 + Ionic 8** single-page application (`syncacademy-web`) that also serves as the native mobile codebase for **Capacitor 8** dual-product applications.

## Key References
- System Design & Frontend Architecture: [`docs/system-design-and-architecture.md`](../../docs/system-design-and-architecture.md)
- Mobile Architecture & Store Readiness: [`docs/mobile-architecture-and-store-readiness.md`](../../docs/mobile-architecture-and-store-readiness.md)
- Development & Deployment Guide: [`docs/development-and-deployment.md`](../../docs/development-and-deployment.md)

## Applications & Product Flavors
SyncAcademy delivers two purpose-built mobile applications from this codebase:
1. **SyncAcademy Teacher** (`tz.co.syncacademy.teachers`):
   - School-branded portal for teachers and academic staff.
   - Offline attendance and marks staging in encrypted IndexedDB.
   - Real application synchronization loop on network reconnection.
2. **SyncAcademy Parent** (`tz.co.syncacademy.parents`):
   - Globally SyncAcademy branded guardian portal.
   - Multi-school student support with child switching.
   - Cached report cards and push notifications.

## Native Cryptography & Storage Architecture
- **Hardware Master Key (KEK)**: AES-256 key anchored in Android Keystore (TEE/StrongBox) or iOS Keychain via native `SecureKeyVaultPlugin`.
- **Account Data Encryption Key (DEK)**: Non-extractable WebCrypto AES-256-GCM key derived via PBKDF2 (100,000 iterations) scoped to user ID.
- **Offline Storage**: Structured IndexedDB database (`syncacademy_offline_db`) with AES-256-GCM record-level encryption and user-scoped mutation queue (`offline_mutations`).

## Commands
```bash
# Development server (http://localhost:4200 proxying /api -> http://localhost:3000)
npm run dev:web

# Production web build (outputs to apps/web/dist/syncacademy-web/browser)
npm run build --workspace=apps/web

# TypeScript lint
npm run lint --workspace=apps/web

# Capacitor asset synchronization
npm run cap:sync:parent --workspace=apps/web
npm run cap:sync:teacher --workspace=apps/web

# Native cryptographic vault and mobile architecture verification
npm run test:crypto-vault --workspace=apps/web
npm run test:mobile-architecture --workspace=apps/web

# Portal workflow verification checks
npm run test:registrar-workflow --workspace=apps/web
npm run test:academic-workflow --workspace=apps/web
npm run test:academic-years --workspace=apps/web
npm run test:bursar-workflow --workspace=apps/web
npm run test:head-oversight --workspace=apps/web
npm run test:class-teacher --workspace=apps/web
npm run test:school-setup --workspace=apps/web
npm run test:super-admin --workspace=apps/web
npm run test:platform-admin-auth --workspace=apps/web
npm run test:preloader --workspace=apps/web
```
