# Architecture

The backend is a modular monolith with one-way composition:

```text
app -> modules -> integration contracts
  \       \----> infrastructure contracts
   \-----------> concrete integrations and infrastructure
```

## Directories

- `app` is the composition root. It selects adapters, creates modules, and starts the process.
- `modules` owns product language, routes, rules, schemas, and product tables.
- `integrations` translates external providers into small JustStudy contracts.
- `infrastructure` owns mechanisms shared by the process, currently database and HTTP concerns.

Email templates live in `integrations/email/templates/<domain>` because delivery is centralized,
while their names and content remain organized by the product domain that uses them.

## Module flow

```text
HTTP route -> service -> store -> PostgreSQL
                   \---> integration contract -> provider adapter
```

Routes validate HTTP input and serialize output. Services own decisions. Stores own Drizzle and
transactions. Adapters own provider SDK types and casing. There is no generic repository, event bus,
result tuple, dependency injection container, or global utilities folder.

## Authentication

The Authentication module depends on the neutral `Identity` contract. The Better Auth adapter owns
provider field names and maps users and sessions to `snake_case`. Its callback surface is mounted
under `/v1/auth/provider/*`; application routes remain stable if the provider changes.

## Billing

The Billing module depends on the neutral `Payments` contract. Checkout and portal calls go to
Polar, while reads always use the local subscription mirror. A webhook is verified before entering
the module. The payment event and subscription mirror are written in one database transaction.
`payment_events.event_id` makes redelivery idempotent.

## Naming

- Files: `kebab-case` with a role suffix such as `.service.ts` or `.adapter.ts`.
- Functions and local variables: `camelCase`.
- Types: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE`.
- JSON, schema fields, and database model properties: `snake_case`.
- Public operations: resource then action, for example `billing.checkout.create()` and
  `payments.event.create()`.
