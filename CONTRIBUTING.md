# Contributing to SyncAcademy

Thank you for contributing to SyncAcademy. All contributors and automated coding agents must follow the governance rules in [`AGENTS.md`](./AGENTS.md).

## 1. Branch & Commit Hygiene
- Create a dedicated feature or fix branch from `main`.
- Keep commits small, focused, and reviewable using conventional prefixes (`feat:`, `fix:`, `security:`, `docs:`, `chore:`, `test:`).
- Never commit `.env`, `.runtime/`, generated build outputs (`dist/`, `.angular/`), or real credentials.

## 2. UI Protection Policy
- Do **not** redesign screens, change layouts, modify colors/typography, or replace components in `apps/web` without explicit approval from the repository owner.

## 3. Multi-Tenancy & Security Checklist
- Every tenant-scoped backend endpoint must verify school membership and role (`SchoolMembership`) and filter all Prisma queries by `schoolId`.
- All mutating endpoints must validate inputs with Zod and write an `AuditLog` record.

## 4. Required Verification Before Submitting a Pull Request
```bash
npm run prisma:generate --workspace=apps/api
npm run build --workspace=apps/api
npm run build --workspace=apps/web
node --test apps/api/test/email-templates.test.cjs
```
See [`docs/development/setup-and-testing.md`](./docs/development/setup-and-testing.md) for the complete verification suite.
