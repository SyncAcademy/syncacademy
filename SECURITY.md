# SyncAcademy — Commercial Security Policy

SyncAcademy is a multi-tenant education management SaaS platform protecting sensitive institution, staff, academic, and student records. We maintain strict security controls and take all vulnerability disclosures seriously.

---

## 1. Supported Versions

Security updates and patches are applied to the active development and release branches:

| Branch / Release | Supported | Notes |
|---|---|---|
| `main` | Yes | Production-ready stable release branch |
| `phase-1-*` / active feature branches | Yes | Active development releases |
| Historical / deprecated tags | No | Upgrade to `main` for security patches |

---

## 2. Reporting a Vulnerability (Responsible Disclosure)

> [!CAUTION]
> **DO NOT report security vulnerabilities via public GitHub issues, discussions, or pull requests.**

If you discover a potential security vulnerability, privilege escalation, cross-tenant data exposure (IDOR), or credential leak in SyncAcademy:

1. **Email Privately**: Send a detailed advisory to the security team:
   - **Primary Security Email**: `security@syncacademy.co.tz`
   - **Secondary Contact**: `support@syncacademy.co.tz`
2. **Include in Your Report**:
   - Description of the vulnerability and its potential impact.
   - Exact affected endpoints, route paths, or components.
   - Step-by-step reproduction instructions or a minimal proof of concept (PoC).
   - Any suggested remediations or mitigations.
3. **Response Timeline**:
   - **Initial Acknowledgement**: Within 24 hours of receipt.
   - **Triage & Assessment**: Within 72 hours.
   - **Remediation & Patch Release**: Coordinated privately prior to any public disclosure.

---

## 3. Core Security Invariants & Policies

All software contributors and automated coding agents operating in this repository must adhere to the core security invariants:

1. **Zero Committed Secrets**:
   - Never commit passwords, API keys, SMTP credentials, session tokens, or private encryption keys to tracked repository files (`.env`, `.runtime/`, and local test credentials must remain strictly untracked).
2. **Tenant Isolation (`schoolId`)**:
   - SyncAcademy is a multi-tenant application. Every non-public endpoint and database query must enforce verified school membership and role authorization (`assertSchoolAccess`) and constrain queries by `schoolId`.
3. **Session & CSRF Governance**:
   - Authentication relies on server-side opaque sessions in PostgreSQL (`UserSession`), delivered via `HttpOnly`, `SameSite=Lax` cookies (`syncacademy_session`).
   - All state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require a valid `x-csrf-token` HTTP header matching the active session's CSRF token hash.
4. **Data Cryptography**:
   - Passwords must be hashed using **Argon2id**.
   - Sensitive database settings at rest (such as third-party provider credentials) must be encrypted using **AES-256-GCM** derived from `DATA_ENCRYPTION_KEY`.
5. **Immutable Audit Trails**:
   - Security-critical events (authentication successes/failures, membership changes, admissions, marks approvals, fee adjustments) must record immutable `AuditLog` events.
