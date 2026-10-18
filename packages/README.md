# SyncAcademy Monorepo Packages (`packages/`)

This directory contains shared TypeScript packages utilized across the SyncAcademy monorepo workspaces (`apps/web` and `apps/api`).

---

## 1. Package Inventory & Responsibilities

| Package | Workspace Name | Purpose & Contents |
|---|---|---|
| **[`packages/api-contracts`](./api-contracts)** | `@syncacademy/api-contracts` | Reserved for shared API request/response contracts, DTO schemas, and Zod validation definitions shared between the NestJS backend and Angular frontend. |
| **[`packages/shared-types`](./shared-types)** | `@syncacademy/shared-types` | Pure TypeScript domain types, enums (e.g., `Role`, attendance statuses, grading scales, approval stages), and interface definitions without runtime dependencies. |
| **[`packages/shared-utils`](./shared-utils)** | `@syncacademy/shared-utils` | Pure, deterministic utility functions (e.g., Tanzanian E.164 phone normalization `+255...`, date/term formatting, score rounding, currency formatting) safely executable in both browser and Node.js environments. |

---

## 2. Monorepo Integration Rules

1. **No Circular Dependencies**:
   - Packages in `packages/*` must **never** import from `apps/web` or `apps/api`.
   - Packages should have minimal or zero third-party runtime dependencies.
2. **Workspace Resolution**:
   - Managed automatically via npm workspaces (`"workspaces": ["apps/*", "packages/*"]` in the root `package.json`).
   - Applications import packages by their scoped name (e.g., `import { ... } from '@syncacademy/shared-types'`).
3. **Purity & Portability**:
   - All code in `packages/*` must remain platform-agnostic (avoiding direct DOM/browser globals or Node.js-only native bindings unless encapsulated behind clear abstractions).
