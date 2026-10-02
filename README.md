# SyncAcademy

Angular frontend, NestJS API, and PostgreSQL. Authentication and school onboarding use real database records; the original dashboard layouts are retained, with unfinished workflows marked unavailable until their APIs are implemented. See [UI integration status](docs/ORIGINAL_UI_BACKEND_INTEGRATION.md).

## Run locally

With Docker Desktop running, generate configuration once, then build and start:

```sh
node scripts/setup-local.mjs
docker compose build
docker compose up -d
```

Do not regenerate an existing `.env`. Open http://localhost:8080/auth/login. Local invitation emails appear at http://localhost:8025.

See [authentication setup and admin bootstrap](docs/AUTHENTICATION_IMPLEMENTED.md) for creating the first administrator, Gmail configuration, tests, and remaining work. The [backend handoff](docs/BACKEND_AGENT_HANDOFF.md) describes the wider implementation plan.

Keep `.env` and `.runtime` private. Ordinary container restarts preserve the database; `docker compose down -v` deletes its volume.
