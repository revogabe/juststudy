# Backend module guidance

Before creating or substantially changing a module, load and follow the repository skill at
`.agents/skills/create-backend-module/SKILL.md`.

The source of truth is:

- `docs/architecture.md` for ownership and dependencies;
- `docs/code-patterns.md` for file roles and implementation style;
- `docs/api.md` for routes and HTTP contracts.

Create only the layers the behavior needs. Keep provider SDKs outside modules, Drizzle inside stores,
HTTP inside routes, product decisions inside services, and exports behind `index.ts`.

