---
paths:
  - "backend/src/modules/**/*.ts"
  - "backend/tests/modules/**/*.ts"
---

# Backend module rules

Load `.claude/skills/create-backend-module/SKILL.md` before creating or substantially changing a
product module. Follow `docs/architecture.md`, `docs/code-patterns.md`, and `docs/api.md`; they are the
canonical references.

Create only necessary layers. Keep provider SDKs outside modules, Drizzle inside stores, HTTP inside
routes, product decisions inside services, and public exports behind `index.ts`.

