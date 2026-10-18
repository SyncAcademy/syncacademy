# SyncAcademy — Development Setup & Testing Standards

## 1. Prerequisites

- **Node.js**: `>= 20.x` (Node `22.x` recommended, matches CI)
- **npm**: `>= 10.x` (monorepo uses npm workspaces)
- **PostgreSQL**: `16.x` (via Docker Compose or local PostgreSQL instance)
- **Docker & Docker Compose**: Optional, recommended for local PostgreSQL (`db`) and full-stack container testing.

---

## 2. Local Development Setup

### Step 1: Install Dependencies
```bash
npm ci
```

### Step 2: Generate Local `.env` Configuration
Run the local bootstrap script, which copies `.env.example` to `.env` and generates cryptographically random 32-byte hex values for `SESSION_SECRET` and `DATA_ENCRYPTION_KEY`:
```bash
node scripts/setup-local.mjs
```
*(Never commit `.env` or `.runtime/` to version control.)*

### Step 3: Start PostgreSQL & Apply Migrations
If using Docker Compose for PostgreSQL on port `55432`:
```bash
docker compose up -d db
npm run prisma:generate --workspace=apps/api
npm run prisma:migrate:deploy --workspace=apps/api
npm run prisma:seed --workspace=apps/api
```

### Step 4: Start the API, Outbox Worker, and Angular Web App
In separate terminals:
```bash
# Terminal 1: NestJS API Server (http://localhost:3000)
npm run dev:api

# Terminal 2: Transactional Outbox Worker
npm run dev:worker

# Terminal 3: Angular 18 Web App (http://localhost:4200 proxying /api -> :3000)
npm run dev:web
```

Alternatively, start the entire stack in Docker Compose (`http://localhost:8080`):
```bash
npm run docker:up
```

---

## 3. Local SMTP & Transactional Email Configuration

For local testing of staff invitations, password resets, and contact inquiries, configure SMTP credentials privately in your untracked `.env` file (never in committed files):

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
MAIL_FROM=noreply@syncacademy.local
CONTACT_NOTIFICATION_EMAIL=support@syncacademy.local
```

After updating `.env`, restart the background outbox worker (`npm run dev:worker` or `docker compose up -d --force-recreate worker`).

---

## 4. Testing Standards & Verification Suites

SyncAcademy uses Node's built-in test runner (`node --test`) for backend unit/integration tests, plus deterministic portal workflow verification scripts in `apps/web/scripts/`.

### 4.1 Build Verification (Required Before Every Commit)
```bash
npm run prisma:generate --workspace=apps/api
npm run build --workspace=apps/api
npm run build --workspace=apps/web
```

### 4.2 Backend Unit & Integration Tests (`apps/api/test/`)
- **Unit Tests (No Database Required)**:
  - `node --test apps/api/test/email-templates.test.cjs` — Verifies branded transactional HTML/text email templates and inline logo CID attachments.
  - `node --test apps/api/test/platform-settings.test.cjs` — Verifies platform settings normalization, AES-256-GCM SMTP password encryption, and fallback behavior.
- **Database Integration Tests (Requires PostgreSQL on `DATABASE_URL`)**:
  - `apps/api/test/auth.test.cjs` — End-to-end integration tests covering login, CSRF enforcement, school creation, invitations, registrar workflows, academic portal persistence, and bursar fee workflows.
  - `apps/api/test/worker.test.cjs` — Verifies transactional `Outbox` processing and `CommunicationLog` persistence.
  - Run all API tests together:
    ```bash
    npm test --workspace=apps/api
    ```

### 4.3 Frontend Portal Workflow Verification Scripts (`apps/web/scripts/`)
Run all 8 role-portal workflow checks:
```bash
npm run test:registrar-workflow --workspace=apps/web
npm run test:academic-workflow --workspace=apps/web
npm run test:academic-years --workspace=apps/web
npm run test:bursar-workflow --workspace=apps/web
npm run test:head-oversight --workspace=apps/web
npm run test:class-teacher --workspace=apps/web
npm run test:school-setup --workspace=apps/web
npm run test:super-admin --workspace=apps/web
```
Additional specialized frontend checks:
```bash
node apps/web/scripts/check-concurrent-drafts.mjs
node apps/web/scripts/check-school-sync.mjs
node apps/web/scripts/check-student-result-summary.mjs
node apps/web/scripts/check-teaching-responsibilities.mjs
```
