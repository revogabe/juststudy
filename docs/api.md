# API

The API exposes only JustStudy contracts. Better Auth and Polar remain implementation details under
`integrations`.

## Authentication

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/auth/anonymous` | Public | Creates an anonymous user and session cookie. |
| `POST` | `/v1/auth/magic-link` | Public/session | Sends a one-time sign-in link. |
| `POST` | `/v1/auth/google` | Public/session | Returns the Google authorization URL. |
| `GET` | `/v1/auth/session` | Session | Returns the current user and session. |
| `DELETE` | `/v1/auth/session` | Public | Revokes the current session. |

`/v1/auth/provider/*` is a hidden callback surface owned by the identity adapter. It exists for
OAuth and magic-link callbacks and is not an application contract.

## Billing

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/billing/summary` | Session | Reads the local subscription mirror. |
| `POST` | `/v1/billing/checkout` | Identified | Creates a Polar checkout. |
| `POST` | `/v1/billing/portal` | Identified | Creates a Polar customer portal session. |
| `POST` | `/v1/billing/webhook` | Polar signature | Updates the local mirror idempotently. |

An anonymous user can inspect the free plan but cannot create checkout or portal sessions. After
the user signs in with email or Google, Better Auth invokes its anonymous-account linking flow.

## Conventions

- JSON keys are `snake_case`.
- Errors use `application/problem+json`.
- Provider callbacks are hidden from the generated OpenAPI document.
- Dates cross the HTTP boundary as ISO 8601 strings.
- Cookies are HTTP-only and are managed by the identity integration.

Interactive documentation is available at `/docs`; the raw specification is available at
`/openapi.json`.
