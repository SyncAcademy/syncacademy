# SyncAcademy Backend (`apps/api`)

The SyncAcademy backend (`@syncacademy/api`) is a **NestJS 10 + Prisma 5 + PostgreSQL 16** REST API and transactional outbox worker.

## Key References
- System Design & Backend Architecture: [`docs/system-design-and-architecture.md`](../../docs/system-design-and-architecture.md)


## Commands
```bash
# Generate Prisma Client
npm run prisma:generate --workspace=apps/api

# Apply database migrations
npm run prisma:migrate:deploy --workspace=apps/api

# Build TypeScript to dist/
npm run build --workspace=apps/api

# Run unit and integration tests
npm test --workspace=apps/api
```
