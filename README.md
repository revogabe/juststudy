<div align="center">

```text
       _           _   ____  _             _
      | |_   _ ___| |_/ ___|| |_ _   _  __| |_   _
   _  | | | | / __| __\___ \| __| | | |/ _` | | | |
  | |_| | |_| \__ \ |_ ___) | |_| |_| | (_| | |_| |
   \___/ \__,_|___/\__|____/ \__|\__,_|\__,_|\__, |
                                              |___/
```

Open-source infrastructure for building a focused, adaptive learning experience.

[![Bun](https://img.shields.io/badge/Bun-1.4-000000?logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Elysia](https://img.shields.io/badge/Elysia-2-7C3AED)](https://elysiajs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=000000)](https://orm.drizzle.team)
[![Better Auth](https://img.shields.io/badge/Better_Auth-1.7-111111)](https://www.better-auth.com)
[![Polar](https://img.shields.io/badge/Polar-Billing-0062FF)](https://polar.sh)
[![CI](https://github.com/revogabe/juststudy/actions/workflows/ci.yml/badge.svg)](https://github.com/revogabe/juststudy/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-TBD-lightgrey)](#license)

</div>

## What is available

JustStudy currently provides the platform foundation:

- anonymous sessions that can later become identified accounts;
- magic-link and Google authentication;
- Polar checkout, customer portal, and signed webhooks;
- a local subscription mirror with idempotent event processing;
- OpenAPI documentation and a Postman collection;
- a web workspace ready for the product interface.

The repository is intentionally a small modular monolith. Product modules contain the business
language, integrations isolate external providers, and `app` is the only composition root.

## Repository

```text
juststudy/
├── backend/          # Bun + Elysia API
├── frontend/
│   └── web/          # Web application workspace
├── infra/            # Local PostgreSQL and Mailpit
├── docs/             # Architecture and API documentation
└── postman/           # Importable requests and environment
```

## Run locally

### Requirements

- [Bun 1.4+](https://bun.sh/docs/installation)
- [Docker with Compose](https://docs.docker.com/compose/)

### Start the API

```bash
git clone https://github.com/revogabe/juststudy.git
cd juststudy
cp .env.example .env
bun install
bun run infra:up
bun run database:migrate
bun run dev
```

The local services are:

| Service | URL |
| --- | --- |
| API | `http://127.0.0.1:3000` |
| OpenAPI UI | `http://127.0.0.1:3000/docs` |
| OpenAPI JSON | `http://127.0.0.1:3000/openapi.json` |
| Mailpit | `http://127.0.0.1:8025` |

Anonymous authentication and local email work without external credentials. Google sign-in and
live billing require the corresponding values in `.env`.

To stop local infrastructure:

```bash
bun run infra:down
```

## Try the API

Create an anonymous session and keep its cookie:

```bash
curl --cookie-jar .cookies -X POST http://127.0.0.1:3000/v1/auth/anonymous
curl --cookie .cookies http://127.0.0.1:3000/v1/auth/session
curl --cookie .cookies http://127.0.0.1:3000/v1/billing/summary
```

Alternatively, import both files from [`postman/`](postman):

- `juststudy.postman_collection.json`
- `juststudy.postman_environment.json`

## Contributing

Create a branch from `main`, keep changes inside the owning module, and run the complete local
verification before opening a pull request:

```bash
bun run check
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the API with file watching. |
| `bun run check` | Run formatting checks, lint, typecheck, and tests. |
| `bun run check:fix` | Apply safe Biome fixes. |
| `bun run test` | Run the fast test suite. |
| `bun run database:generate` | Generate a migration after a model change. |
| `bun run database:migrate` | Apply pending migrations. |
| `bun run openapi:generate` | Refresh the committed OpenAPI artifact. |

CI also runs database-backed E2E tests. To run them locally, use a disposable database:

```bash
RUN_DATABASE_TESTS=true \
DATABASE_URL=postgres://juststudy:juststudy@127.0.0.1:5432/juststudy_test \
bun run test
```

Read the [architecture](docs/architecture.md) before adding a module and the [API guide](docs/api.md)
before changing an HTTP contract. Public JSON and database model properties use `snake_case`;
TypeScript functions and variables use `camelCase`.

## License

No open-source license has been selected yet. Until one is added, the source is publicly visible but
all rights remain reserved by the copyright holder.
