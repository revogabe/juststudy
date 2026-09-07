# Backend code patterns

These conventions keep modules visually predictable without introducing framework layers that do
not protect a real boundary.

## Naming

- Files use `kebab-case` and a role suffix: `library.service.ts`, `library.routes.ts`.
- Functions and local variables use `camelCase`.
- Types use `PascalCase`.
- Constants use `UPPER_SNAKE_CASE`.
- JSON, schemas, database columns, and domain data properties use `snake_case`.
- Public operations use `resource.action`: `billing.checkout.create()` or `email.delivery.create()`.
- Prefer the small action vocabulary `create`, `get`, `search`, `update`, and `delete`.

Do not rename a precise domain verb merely to fit the vocabulary. A name should describe the product
operation, not the database implementation.

## Control flow

Prefer guard clauses that keep the main path unindented. A readable, single-statement guard omits
braces:

```ts
if (!session) throw authenticationError.unauthenticated();
if (!subscription) return freeSummary(userId, freeCredits);
if (value) continue;
```

Keep braces for multiple actions or when the statement cannot be scanned comfortably:

```ts
if (paidSubscription) {
  plan = "student";
  activatedAt = new Date();
}
```

Do not add `else` after a branch that already returns or throws. Avoid nested ternaries and do not use
ternaries for side effects.

Biome's `useBlockStatements` rule is disabled intentionally so formatting on save preserves these
guards. `bun run check` still enforces the rest of the codebase rules.

## Routes

Routes own HTTP concerns only:

- path, method, access macro, and Elysia schemas;
- reading request values and writing response headers;
- converting transport-only values such as `Date` to ISO strings;
- one call into the module service.

Routes do not use Drizzle, provider SDKs, or implement product decisions.

## Services

Services own rules and orchestration. Dependencies arrive in one typed input and are closed over by
the returned resource-oriented API:

```ts
export function createExampleService(input: ExampleServiceInput) {
  return {
    item: {
      async create(command: ItemCreate) {
        if (!command.name) throw exampleError.invalidName();
        return input.store.item.create(command);
      },
    },
  };
}

export type ExampleService = ReturnType<typeof createExampleService>;
```

Keep mapping functions outside the service factory when they are pure. Catch errors only to translate
a known boundary error; rethrow unexpected errors.

## Stores and transactions

Stores own Drizzle expressions and return module contracts, not HTTP responses. Use a transaction
when a product operation must commit or roll back as a unit. Idempotency is enforced by database
constraints and conflict handling, not an in-memory check.

Name the store API by resource and action, matching the service where practical:

```ts
store.subscription.get(userId);
store.paymentEvent.create(input);
```

## Contracts, schemas, and models

- `.contract.ts` contains provider-neutral or domain types used by TypeScript behavior.
- `.schema.ts` contains HTTP input and output schemas used by Elysia and OpenAPI.
- `.model.ts` contains tables and database constraints owned by the module.

Do not reuse provider SDK types as domain contracts. Avoid `any`, unchecked casts, duplicate DTO
layers, and catch-all metadata objects unless the product explicitly needs an extensible payload.

## Errors

Modules expose product errors through the shared problem-details mechanism:

```ts
export const exampleError = {
  notFound() {
    return problemError.create({
      status: 404,
      code: "EXAMPLE_NOT_FOUND",
      title: "Example not found",
      detail: "The requested example does not exist.",
    });
  },
};
```

Do not return raw provider errors or internal stack traces to clients.

## Modules and exports

The module factory wires its local store, service, and routes. `index.ts` exports only the surface
needed by `app` or another module. Internal files are not a shortcut around that public boundary.

Do not create a file because the conventional name exists. Create it when the module has that role.

## Testing and completion

- Test service decisions with small fakes for stores and integrations.
- Add database-backed E2E coverage for transactions, constraints, authentication, and route wiring.
- Regenerate OpenAPI whenever an HTTP schema changes.
- Generate and inspect a migration whenever a model changes.
- Run `bun run check` before handing work off for review.

