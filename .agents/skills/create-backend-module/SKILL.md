---
name: create-backend-module
description: Create or substantially extend a JustStudy backend product module while preserving its modular-monolith boundaries, Elysia contracts, naming, and tests.
---

# Create a JustStudy backend module

Use this skill for a new product capability under `backend/src/modules` or a substantial change to
an existing module. Do not use it for an isolated provider-adapter or infrastructure-only change.

## Required references

Before editing, read completely:

- `docs/architecture.md` for ownership and dependency direction;
- `docs/code-patterns.md` for file roles, naming, control flow, and tests;
- `docs/api.md` when the work creates or changes an HTTP contract.

Inspect `authentication` and `billing` only for the roles relevant to the task. They are examples,
not templates that require every file.

## Workflow

1. State the module's product responsibility and what it does not own.
2. Identify its required stores, integration contracts, other module APIs, and HTTP access level.
3. Create only the necessary files from the module anatomy in `docs/architecture.md`.
4. Implement inward: contracts and rules, store or adapters, service, routes, module composition, then
   `app` registration.
5. Export only the public surface through the module's `index.ts`.
6. Add focused service tests. Add database-backed E2E coverage for persistence or route wiring.
7. If routes or schemas changed, regenerate OpenAPI. If models changed, generate and inspect a
   migration.
8. Run `bun run check` and report skipped external or database validations explicitly.

## Boundaries

- Keep provider types and SDKs out of product modules.
- Keep Drizzle out of routes and services.
- Keep HTTP requests and responses out of stores and integration contracts.
- Use resource-action APIs, `snake_case` data, problem-details errors, and concise guard clauses.
- Do not introduce generic repositories, global utilities, event buses, or empty layers preemptively.
- Do not commit, push, or open a pull request without explicit user authorization.

