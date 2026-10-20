# SyncAcademy Frontend (`apps/web`)

The SyncAcademy web client is an **Angular 18 + Ionic 8** single-page application (`syncacademy-web`).

## Key References
- System Design & Frontend Architecture: [`docs/system-design-and-architecture.md`](../../docs/system-design-and-architecture.md)


## Commands
```bash
# Development server (http://localhost:4200 proxying /api -> http://localhost:3000)
npm run dev:web

# Production build (outputs to apps/web/dist/syncacademy-web/browser)
npm run build --workspace=apps/web

# Run portal workflow checks
npm run test:registrar-workflow --workspace=apps/web
npm run test:academic-workflow --workspace=apps/web
npm run test:academic-years --workspace=apps/web
npm run test:bursar-workflow --workspace=apps/web
npm run test:head-oversight --workspace=apps/web
npm run test:class-teacher --workspace=apps/web
npm run test:school-setup --workspace=apps/web
npm run test:super-admin --workspace=apps/web
```
