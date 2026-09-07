# HTTP API

The API exposes JustStudy-owned contracts. Better Auth, Polar, Resend, and other providers remain
implementation details behind integrations.

Local base URL: `http://127.0.0.1:3000`

| Resource | Location |
| --- | --- |
| Interactive OpenAPI | `/docs` |
| OpenAPI document | `/openapi.json` |
| Committed OpenAPI artifact | `backend/generated/openapi.json` |
| Postman collection | `postman/juststudy.postman_collection.json` |
| Postman environment | `postman/juststudy.postman_environment.json` |

## Authentication and access

Sessions use HTTP-only cookies. Clients must preserve the cookie returned by authentication calls.

- `Public`: no session is required.
- `Session`: anonymous and identified sessions are accepted.
- `Identified`: the user must have linked email or Google authentication.
- `Polar signature`: the request must contain a valid Standard Webhooks signature.
- `Knowledge token`: the request must contain the configured catalog bearer token.

The callback surface `/v1/auth/provider/*` is owned by the identity adapter. It supports provider
callbacks, is intentionally hidden from OpenAPI, and is not a stable application contract.

## Routes

### Platform

| Method | Route | Access | Response | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | Public | `{ "status": "ok" }` | Check process health. |

### Authentication

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/auth/anonymous` | Public | Create an anonymous user and session. |
| `POST` | `/v1/auth/magic-link` | Public/session | Send a one-time sign-in link. |
| `POST` | `/v1/auth/google` | Public/session | Create a Google authorization URL. |
| `GET` | `/v1/auth/session` | Session | Read the current user and session. |
| `DELETE` | `/v1/auth/session` | Public | Revoke the current session cookie. |

Create an anonymous session:

```http
POST /v1/auth/anonymous

200 OK
Set-Cookie: better-auth.session_token=...; HttpOnly; ...

{
  "user": {
    "id": "...",
    "name": "Anonymous",
    "email": "...",
    "email_verified": false,
    "image": null,
    "is_anonymous": true
  }
}
```

Send a magic link:

```http
POST /v1/auth/magic-link
Content-Type: application/json

{
  "email": "learner@example.com",
  "callback_url": "http://localhost:3001/auth/callback"
}
```

Start Google sign-in:

```http
POST /v1/auth/google
Content-Type: application/json

{
  "callback_url": "http://localhost:3001/auth/callback"
}

200 OK
{
  "redirect_url": "https://accounts.google.com/..."
}
```

### Billing

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/billing/summary` | Session | Read the local subscription mirror. |
| `POST` | `/v1/billing/checkout` | Identified | Create a Polar checkout. |
| `POST` | `/v1/billing/portal` | Identified | Create a Polar customer portal session. |
| `POST` | `/v1/billing/webhook` | Polar signature | Update the mirror idempotently. |

An anonymous user receives the free summary but cannot create checkout or portal sessions:

```json
{
  "user_id": "...",
  "plan": "free",
  "status": "active",
  "credit_allowance": 3,
  "credits_used": 0,
  "credits_remaining": 3,
  "period_ends_at": null,
  "is_active": true
}
```

Checkout and portal responses contain a URL owned by the payment provider:

```json
{ "checkout_url": "https://polar.sh/checkout/..." }
```

```json
{ "portal_url": "https://polar.sh/customer-portal/..." }
```

Webhook processing returns one of three stable states:

- `processed`: the event and subscription mirror were committed.
- `duplicate`: `event_id` was already stored, so no second update occurred.
- `ignored`: the event was valid and stored but did not contain a supported subscription update.

### Knowledge

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/knowledge/subjects` | Public | List the global knowledge subjects and topic counts. |
| `POST` | `/v1/knowledge/catalog` | Knowledge token | Add balanced subjects or topic batches atomically. |

Subject listing never exposes topic names:

```json
{
  "subjects": [
    {
      "slug": "mathematics",
      "name": "Mathematics",
      "topic_count": 100,
      "level_counts": {
        "beginner": 15,
        "intermediate": 35,
        "advanced": 30,
        "specialist": 20
      }
    }
  ]
}
```

Catalog writes use `Authorization: Bearer <KNOWLEDGE_CATALOG_TOKEN>`. A new subject includes exactly
100 nested topics distributed as 15 beginner, 35 intermediate, 30 advanced, and 20 specialist.
`topic_batches` extend an existing subject in balanced blocks of 20 using a 3/7/6/4 distribution.
Each group must be entirely new or an exact replay; the whole request is transactional.

### Randomize

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/randomize/topic` | Session | Randomize and assign an eligible topic. |
| `GET` | `/v1/randomize/history` | Session | Read the user's cursor-paginated randomization timeline. |

Pass a subject slug to randomize within that subject. An empty object first selects an eligible
subject uniformly and then selects one of its eligible topics:

```json
{ "subject_slug": "mathematics" }
```

```json
{}
```

Every successful randomization creates a `pending` attempt. Topics with a `pending` or `completed`
attempt are excluded for that user; an `abandoned` topic is eligible again. The catalog itself is
never changed. A randomization response includes the selected catalog data and attempt state:

```json
{
  "id": "01992442-fb47-7c15-a796-e3906b65d20d",
  "subject": { "slug": "mathematics", "name": "Mathematics" },
  "topic": { "slug": "linear-equations", "name": "Linear Equations", "level": "beginner" },
  "status": "pending",
  "created_at": "2026-09-07T12:00:00.000Z",
  "updated_at": "2026-09-07T12:00:00.000Z"
}
```

History is ordered newest first. `limit` defaults to 20 and accepts up to 100; pass the returned
opaque `next_cursor` to continue from the next item.

## Error contract

Errors use `application/problem+json` and follow the RFC 9457 shape:

```json
{
  "type": "https://juststudy.app/problems/identified-user-required",
  "title": "Identified user required",
  "status": 403,
  "code": "IDENTIFIED_USER_REQUIRED",
  "detail": "Link an email or Google account before using this operation."
}
```

Known codes currently include:

| Code | Status | Meaning |
| --- | --- | --- |
| `AUTHENTICATION_REQUIRED` | `401` | A valid session is missing. |
| `IDENTIFIED_USER_REQUIRED` | `403` | An anonymous user called an identified-only route. |
| `INVALID_PAYMENT_EVENT` | `400` | Webhook signature or payload validation failed. |
| `UNLINKED_PAYMENT_CUSTOMER` | `422` | The provider customer has no JustStudy user. |
| `PAYMENT_PROVIDER_UNAVAILABLE` | `503` | Checkout or portal creation failed upstream. |
| `KNOWLEDGE_CATALOG_UNAUTHORIZED` | `401` | The operational catalog bearer token is missing or invalid. |
| `KNOWLEDGE_CATALOG_CONFLICT` | `409` | A group partially overlaps or conflicts with stored catalog content. |
| `KNOWLEDGE_CATALOG_UNBALANCED` | `422` | A catalog update violates grouping or level distribution rules. |
| `RANDOMIZE_SUBJECT_NOT_FOUND` | `404` | The requested subject is absent from the knowledge catalog. |
| `RANDOMIZE_TOPIC_UNAVAILABLE` | `409` | The requested scope has no eligible topic for the user. |
| `REQUEST_VALIDATION_FAILED` | `422` | Request data did not satisfy the route schema. |
| `INTERNAL_SERVER_ERROR` | `500` | An unexpected error was hidden from the client. |

## Contract conventions

- Versioned application routes start with `/v1`.
- JSON keys and schema properties use `snake_case`.
- Dates cross HTTP as ISO 8601 strings.
- Routes declare request and response schemas so OpenAPI remains executable documentation.
- Provider payloads do not leak into application contracts.
- Breaking changes require a new API version; additive changes remain in the current version.

After changing a route or schema, run:

```bash
bun run openapi:generate
bun run check
```

Commit the updated `backend/generated/openapi.json` with the code that changed the contract.

## Testing with curl or Postman

```bash
curl --cookie-jar .cookies -X POST http://127.0.0.1:3000/v1/auth/anonymous
curl --cookie .cookies http://127.0.0.1:3000/v1/auth/session
curl --cookie .cookies http://127.0.0.1:3000/v1/billing/summary
curl http://127.0.0.1:3000/v1/knowledge/subjects
curl --cookie .cookies -H 'content-type: application/json' -d '{}' http://127.0.0.1:3000/v1/randomize/topic
curl --cookie .cookies http://127.0.0.1:3000/v1/randomize/history
```

Postman keeps the session cookie automatically. Import both files from `postman/`, select the local
environment, and run `Create anonymous session` before session-protected requests. A webhook request
must use a payload and signature produced by Polar or the test helper; unsigned payloads are rejected.
