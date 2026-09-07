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
- Factory functions use `create<Domain><Role>`: `createKnowledgeService` or `createBillingStore`.
- Rule objects use `<resource>Rule` with a precise action: `knowledgeCatalogRule.validate()`.
- Private store queries use the same resource-action vocabulary when they perform a complete
  persistence operation. Pure rule functions use one shared verb family inside the file, such as
  `validateCatalogUpdate` and `validateTopicGroup`.

Do not rename a precise domain verb merely to fit the vocabulary. A name should describe the product
operation, not the database implementation.

## Public and private functions

The module's external interface is its `index.ts`. A function exported from an internal file remains
an internal seam until `index.ts` deliberately exports it. Keep that interface small:

```ts
// modules/library/index.ts
export { createLibraryModule } from "./library.module";
export type { LibraryService } from "./library.service";
```

In role files, place the exported factory before its private implementation helpers. Keep private
helpers in the file that owns their concern instead of collecting them in `functions.ts`,
`helpers.ts`, `shared.ts`, or `utils.ts`:

```ts
export function createLibraryStore(database: DatabaseClient) {
  return {
    book: {
      get(id: string) {
        return getBook(database, id);
      },
    },
  };
}

async function getBook(database: DatabaseClient, id: string) {
  // Drizzle query owned by the store.
}
```

Extract a helper only when it hides a substantial rule, is reused, or makes the owning factory easier
to scan. A short, one-use expression stays inline.

## Constants and rules

Use `<module>.constant.ts` for domain constants shared by multiple implementation files or for named
product policy. Constants use `UPPER_SNAKE_CASE` and include the domain name when exported from the
file:

```ts
// library.constant.ts
export const LIBRARY_DEFAULT_PAGE_SIZE = 25;
export const LIBRARY_BOOK_FORMATS = ["paper", "digital"] as const;
```

Keep transport values in schemas, environment values in `app/env.ts`, and a constant used by only one
function beside that function.

Use `<module>.rule.ts` when several pure functions implement one meaningful product decision. Export
one small resource-oriented rule object, keep its calculations private, and standardize their names
around the public action:

```ts
function validateBookGroup(books: BookInput[]): void {
  const slugs = new Set<string>();
  const names = new Set<string>();

  for (const book of books) {
    if (slugs.has(book.slug) || names.has(book.name)) throw libraryError.duplicateBook();

    slugs.add(book.slug);
    names.add(book.name);
  }
}

function validateCatalogUpdate(input: CatalogUpdate): CatalogWrite {
  validateBookGroup(input.books);

  return input;
}

export const libraryCatalogRule = {
  validate: validateCatalogUpdate,
};
```

When several validations need the same collection, calculate them in one linear scan. Do not replace
a clear `for` with chained `map`, `filter`, or `some` calls: those calls still traverse the data and
usually allocate intermediate arrays. Small fixed-size passes, such as checking four supported
levels, are preferable to a more complex abstraction.

The service calls the rule and keeps orchestration visible:

```ts
async update(command: CatalogUpdate) {
  const catalog = libraryCatalogRule.validate(command);

  return store.catalog.update(catalog);
}
```

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

Keep the main `<module>.store.ts` focused on its resource API. If one resource owns a substantial
transactional workflow, extract it to `<module>-<resource>.store.ts` and compose that store from the
main factory:

```ts
export function createKnowledgeStore(database: DatabaseClient) {
  return {
    subject: {
      get() {
        // Small subject query stays in the main store.
      },
    },
    catalog: createKnowledgeCatalogStore(database),
  };
}
```

Resource-specific store files are still stores: they may contain Drizzle queries and private
persistence functions, but never validation rules or HTTP behavior. Keep dependent writes
sequential inside one transaction; do not use `Promise.all` on a shared transaction connection.

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
