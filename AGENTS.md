# JustStudy agent guidance

Read the relevant project references before editing backend code:

- Architecture and dependency boundaries: `docs/architecture.md`
- TypeScript and module patterns: `docs/code-patterns.md`
- HTTP contracts and API conventions: `docs/api.md`

When creating or substantially changing a backend product module, follow
`.agents/skills/create-backend-module/SKILL.md`.

Keep the modular monolith small: product behavior belongs in `modules`, provider code in
`integrations`, shared technical mechanisms in `infrastructure`, and concrete wiring in `app`.
Preserve `snake_case` data contracts, resource-action APIs, and concise early-return guards.

Do not commit, push, open a pull request, delete data, or mutate external systems unless the user
explicitly requests that action. Before handing implementation work off, run `bun run check`.

