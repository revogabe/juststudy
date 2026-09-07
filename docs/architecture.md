# Backend architecture

JustStudy is a modular monolith. Product behavior stays in modules, provider code stays in
integrations, shared technical mechanisms stay in infrastructure, and `app` composes the process.

```text
HTTP request
    |
    v
route -> service -> store -> PostgreSQL
             |
             +------> integration contract -> provider adapter

app ------------------------------------------------^ composition only
```

The goal is a small dependency graph that is easy to replace and test. A new abstraction is added
only when it protects a real boundary or removes demonstrated duplication.

## Repository layout

```text
backend/src/
├── app/                 # Environment, dependency wiring, application and process entrypoints
├── modules/             # Product capabilities and business language
│   ├── authentication/
│   ├── billing/
│   ├── focus/
│   ├── knowledge/
│   └── randomize/
├── integrations/        # External service contracts and provider adapters
│   ├── email/
│   ├── identity/
│   └── payments/
└── infrastructure/      # Shared technical mechanisms
    ├── database/
    └── http/
```

- `app` is the composition root. It is the only layer that chooses concrete adapters.
- `modules` owns routes, decisions, domain contracts, product errors, schemas, and product tables.
- `integrations` translates provider APIs into small JustStudy-owned contracts.
- `infrastructure` owns provider-neutral process mechanisms such as PostgreSQL and HTTP errors.

Email delivery is an integration because modules should not know Resend or Mailpit. Templates live
under `integrations/email/templates/<domain>` so delivery remains centralized while content remains
discoverable by the product domain that uses it.

## Dependency rules

Allowed dependencies flow inward:

```text
app -> modules -> integration contracts
 |       |
 |       +----> infrastructure contracts
 +------------> concrete adapters and infrastructure
```

- A module never imports a concrete provider adapter.
- An adapter never imports a product service, route, store, or model.
- A route calls its service; it does not query Drizzle or call provider SDKs.
- A service owns decisions and coordinates stores and integration contracts.
- A store owns queries and transactions, but not HTTP or provider behavior.
- Cross-module dependencies use the owning module's public `index.ts`.
- Avoid global `shared`, `utils`, generic repositories, event buses, and dependency containers.

## Module anatomy

A module uses only the files its behavior needs:

```text
modules/example/
├── example.constant.ts  # Shared domain constants and named product policy
├── example.contract.ts  # Domain types shared inside or intentionally exported by the module
├── example.error.ts     # Product errors expressed as RFC 9457 problem details
├── example.model.ts     # Drizzle tables owned by the module
├── example.rule.ts      # Substantial pure product rules behind a small internal interface
├── example.schema.ts    # Elysia request and response schemas
├── example.store.ts      # Database access and transaction boundaries
├── example-item.store.ts # Optional substantial persistence workflow for one resource
├── example.service.ts    # Business rules and orchestration
├── example.routes.ts    # HTTP transport
├── example.module.ts    # Creates the module's service, store, and Elysia plugin
└── index.ts              # Deliberate public API
```

Do not create empty layers. A read-only module without persistence does not need a store or model;
a module without HTTP does not need routes or schemas.

`<name>.module.ts` is the local composition boundary. It receives concrete dependencies from `app`,
creates the store and service, and returns only what another module or the application needs:

```ts
return {
  service,
  plugin: createExampleRoutes(service),
};
```

## Request lifecycle

1. Elysia validates path, query, body, headers, and response schemas in the route.
2. Authentication macros resolve a session or identified user before the handler runs.
3. The route converts transport-only values, then calls one service operation.
4. The service applies product rules and coordinates its store or integration contract.
5. Stores commit related writes in one transaction; provider adapters translate external shapes.
6. Known errors become `application/problem+json`; unknown errors become a generic `500` response.

The provider callback path `/v1/auth/provider/*` is the sole exception to application-owned routes:
it is hidden from OpenAPI and delegated directly to Better Auth because the provider owns that
protocol.

## Current modules

### Authentication

Authentication depends on the neutral `Identity` contract. Better Auth owns provider field names
and maps them to JustStudy `snake_case` contracts. Anonymous accounts can browse the product and are
upgraded through email or Google. The authentication macro exposes two levels: `session` and
`identified`.

### Billing

Billing depends on the neutral `Payments` contract. Checkout and portal calls use Polar, but reads
use the local subscription mirror. Signed webhooks are converted to a provider-neutral event and
stored with the subscription update in one database transaction. `payment_events.event_id` makes a
redelivery idempotent.

### Randomize

Randomize depends on the public Knowledge service for catalog reads and owns only per-user topic
attempts. It selects subjects and topics, excludes active or completed assignments, and exposes the
user's history without changing the global catalog.

### Focus

Focus owns timed study sessions and browser-presence tracking. It depends on the public Randomize
service to validate an assigned topic and synchronize terminal outcomes without querying or writing
Randomize tables. Unsynchronized outcomes remain persisted for idempotent worker reconciliation.

## Adding a module

Use the repository skill at `.agents/skills/create-backend-module/SKILL.md`. It routes the work
through these boundaries, the [code patterns](code-patterns.md), and the [API conventions](api.md).
Codex and Claude project hooks add this skill reminder when a prompt creates or substantially changes
a module; the skill remains the workflow and the hook only performs narrow discovery.
