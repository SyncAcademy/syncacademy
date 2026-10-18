# SyncAcademy — Security Architecture

## 1. Authentication & Session Management

SyncAcademy uses **stateful, database-backed opaque sessions** (`UserSession`) rather than stateless JWTs in `localStorage`. This allows immediate server-side session revocation on logout, password reset, or account suspension.

- **Session Cookie**: `syncacademy_session` (configurable via `SESSION_COOKIE_NAME`).
  - Flags: `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` (when `COOKIE_SECURE=true` in production).
  - Storage: Only the SHA-256 hash (`sessionTokenHash`) of the high-entropy opaque token is stored in `UserSession`.
- **CSRF Protection**:
  - Each `UserSession` generates a distinct CSRF token whose SHA-256 hash is stored in `UserSession.csrfTokenHash`.
  - The raw CSRF token is returned via `GET /api/auth/session` and must be sent by the Angular SPA in the `x-csrf-token` HTTP header on all mutating (`POST`, `PUT`, `PATCH`, `DELETE`) requests.
- **Password Hashing**:
  - User passwords are hashed using **Argon2id** (`argon2` package in `apps/api/src/security.ts`).
- **Login Rate Limiting**:
  - `PlatformService` enforces sliding-window rate limiting per IP address and email (`LOGIN_RATE_LIMIT_MAX_ATTEMPTS`, `LOGIN_RATE_LIMIT_WINDOW_MS`) to mitigate brute-force attacks.

---

## 2. Encryption & Secrets Management

- **At-Rest Field Encryption**:
  - Sensitive runtime configuration stored in `PlatformSetting` (specifically `smtpPassEncrypted`) is encrypted using **AES-256-GCM** derived from `DATA_ENCRYPTION_KEY` (`apps/api/src/security.ts`).
- **Environment Variable Validation**:
  - `apps/api/src/config.ts` validates all required secrets at process startup using **Zod** (`SESSION_SECRET` >= 32 chars, `DATA_ENCRYPTION_KEY` >= 32 chars, `DATABASE_URL`, `APP_ORIGIN`, `SMTP_HOST`, `MAIL_FROM`).
- **No Committed Credentials**:
  - `.env`, `.env.*` (except `.env.example`), and `.runtime/` are gitignored.
  - Local development setup (`node scripts/setup-local.mjs`) generates cryptographically random 32-byte hex secrets locally in `.env`.

---

## 3. Audit Logging (`AuditLog`)

Security-critical operations write structured records to the `AuditLog` table:
- Authentication events (`auth.login.succeeded`, `auth.login.failed`, `auth.logout`, `auth.password_reset.*`).
- Tenant & role lifecycle (`school.created`, `school.updated`, `invitation.created`, `invitation.accepted`, `invitation.revoked`).
- Academic, registrar, and bursar mutations (`student.created`, `academics.approval.*`, `bursar.*`).

---

## 4. Phase 1 Security Remediation & Git History Procedure

### 4.1 Incident Summary (Phase 0 Finding)
During the Phase 0 audit, a real Google App Password (`SMTP_PASS`) and personal developer email address were discovered in tracked configuration files (`.env.example`, `docker-compose.yml`, `scripts/setup-local.mjs`, `apps/api/src/config.ts`, `apps/api/src/api.controller.ts`) introduced in historical commit `66d6d71`.

### 4.2 Immediate Remediation Applied in Phase 1
1. **Tracked Files Sanitized**: All occurrences of the exposed SMTP password and personal developer email were removed from tracked files in commit `e4adfa8` and replaced with safe placeholders (`replace_with_smtp_password`, `noreply@syncacademy.local`).
2. **Script Hardening**: `scripts/configure-kigoma-teacher-logins.mjs` was updated to write generated test teacher credentials exclusively to `.runtime/kigoma-teacher-logins.credentials.txt` (`mode 0o600`), which is ignored by `.gitignore`.
3. **Mandatory Owner Action**: The repository owner **must immediately revoke/delete** the compromised Google App Password in the Google Account Security Console (`myaccount.google.com/apppasswords`) and issue a new credential exclusively via untracked environment variables.

### 4.3 Git History Scrubbing Procedure (Requires Explicit Owner Approval)
Because rewriting shared Git history alters commit SHAs for all collaborators, history rewriting was **not** executed automatically. Once the credential is revoked and the owner approves history rewriting, run the following procedure using [`git-filter-repo`](https://github.com/newren/git-filter-repo):

```bash
# 1. Create a fresh mirror clone of the repository
git clone --mirror <repository-url> syncacademy-mirror.git
cd syncacademy-mirror.git

# 2. Create a replacements file (DO NOT commit this file)
cat << 'EOF' > ../secrets-to-scrub.txt
<COMPROMISED_16_CHAR_APP_PASSWORD>==>REDACTED_SMTP_PASSWORD
<DEVELOPER_PERSONAL_EMAIL>==>noreply@syncacademy.local
EOF

# 3. Rewrite all historical commits, trees, and blobs
git filter-repo --replace-text ../secrets-to-scrub.txt

# 4. Remove the temporary replacements file
rm -f ../secrets-to-scrub.txt

# 5. Force-push cleaned history to origin (requires branch protection temporarily unlocked)
git push --force --all
git push --force --tags
```

After force-pushing, all collaborators must re-clone or `git fetch origin && git reset --hard origin/main`, and GitHub Support / cache invalidation should be triggered if any PRs cached commit `66d6d71`.
