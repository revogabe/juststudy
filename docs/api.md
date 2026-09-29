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

### Focus

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/focus/sessions` | Session | Start a timed focus session for a pending randomization. |
| `GET` | `/v1/focus/sessions/active` | Session | Read and reconcile the user's active focus session. |
| `GET` | `/v1/focus/sessions/history` | Session | Read session durations and studied topics. |
| `POST` | `/v1/focus/sessions/:session_id/heartbeat` | Session | Confirm that the study tab is still present. |
| `POST` | `/v1/focus/sessions/:session_id/complete` | Session | Complete a focus session, including before its deadline. |
| `POST` | `/v1/focus/sessions/:session_id/abandon` | Session | Abandon a focus session. |

Start focus with the randomization returned by `POST /v1/randomize/topic`. Duration is expressed in
seconds and accepts values from 60 through 14400:

```json
{
  "randomization_id": "01992442-fb47-7c15-a796-e3906b65d20d",
  "duration_seconds": 3600
}
```

```json
{
  "id": "01992443-1697-788c-9d7f-664ba62e3670",
  "randomization_id": "01992442-fb47-7c15-a796-e3906b65d20d",
  "duration_seconds": 3600,
  "status": "active",
  "started_at": "2026-09-07T12:00:00.000Z",
  "ends_at": "2026-09-07T13:00:00.000Z",
  "last_seen_at": "2026-09-07T12:00:00.000Z",
  "finished_at": null,
  "updated_at": "2026-09-07T12:00:00.000Z"
}
```

Focus history is ordered newest first. `limit` defaults to 20 and accepts up to 100; use the opaque
`next_cursor` to fetch another page. Every item includes the planned `duration_seconds` and the
subject/topic resolved from its randomization:

```json
{
  "sessions": [
    {
      "id": "01992443-1697-788c-9d7f-664ba62e3670",
      "randomization_id": "01992442-fb47-7c15-a796-e3906b65d20d",
      "duration_seconds": 3600,
      "status": "completed",
      "subject": { "slug": "mathematics", "name": "Mathematics" },
      "topic": {
        "slug": "linear-equations",
        "name": "Linear Equations",
        "level": "beginner"
      },
      "started_at": "2026-09-07T12:00:00.000Z",
      "ends_at": "2026-09-07T13:00:00.000Z",
      "last_seen_at": "2026-09-07T12:59:30.000Z",
      "finished_at": "2026-09-07T13:00:00.000Z",
      "updated_at": "2026-09-07T13:00:00.000Z"
    }
  ],
  "next_cursor": null
}
```

The web client should send a heartbeat every 30 seconds. A session is abandoned after 120 seconds
without communication. Reaching `ends_at` completes it; when both deadlines have passed, the one
that occurred first determines the outcome. A worker reconciles persisted deadlines every minute,
and focus endpoints reconcile them immediately before acting. Completion and abandonment also set
the related randomization to `completed` or `abandoned` respectively.

### Feedback

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/v1/feedback/sessions` | Identified + active student | Start the explanation timer after a completed focus session. |
| `GET` | `/v1/feedback/sessions/:session_id` | Identified | Poll the current transcript/evaluation state. |
| `POST` | `/v1/feedback/sessions/:session_id/heartbeat` | Identified | Keep an active recording session alive. |
| `POST` | `/v1/feedback/sessions/:session_id/submit` | Identified + active student | Upload and transcribe one audio explanation. |
| `GET` | `/v1/feedback/history` | Identified | Read cursor-paginated submits with complete transcript and evaluation. |

Start with the completed focus session:

```json
{ "focus_session_id": "01992443-1697-788c-9d7f-664ba62e3670" }
```

The response contains a 15-minute `recording_ends_at` deadline followed by a two-minute
`upload_ends_at` grace period. The client sends a heartbeat every 30 seconds; 120 seconds without a
heartbeat expires the recording. One completed focus session accepts one submitted evaluation. A
session that expires before submission may be started again.

Submit `multipart/form-data` with an `audio` file. Accepted media types are WebM, Ogg, MP4, MPEG,
AAC, and WAV, up to 32 MiB and from 3 through 900 seconds of understandable speech:

```bash
curl --cookie .cookies \
  --form 'audio=@explanation.webm;type=audio/webm' \
  http://127.0.0.1:3000/v1/feedback/sessions/$FEEDBACK_SESSION_ID/submit
```

Transcription completes within the submit request. A successful submit returns `202 Accepted`,
`Retry-After: 2`, `status: "pending"`, and the full transcript with stable segment IDs. Poll the
session endpoint until it becomes `completed` or `failed`. The evaluation includes:

- a 0–4 rubric for factual accuracy, topic coverage, conceptual reasoning, and clarity;
- a backend-computed mastery score and verdict;
- evidence linked to transcript segment IDs;
- a concept-by-concept understanding map;
- analysis of the reasoning the student actually expressed;
- prioritized corrections, strengths, an improvement plan, an answer outline, and follow-up
  questions.

Clarity is useful feedback but does not affect mastery. The backend computes mastery as 50% factual
accuracy, 30% coverage, and 20% conceptual reasoning. Answers without enough topical evidence are
`scorable: false`, receive no mastery, and do not change the subject score.

History defaults to 10 records and accepts at most 50. It deliberately includes the complete
transcript and complete structured evaluation so the student can revisit what was said. Raw audio
is never stored. See [feedback evaluation example](feedback-evaluation.md) for a realistic transcript
and complete response shape.

### Scores

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/scores` | Identified | Map every catalog subject to the user's current 0–1000 score. |

Unassessed subjects are returned with score zero. A score stays `provisional` until five distinct
topics provide evidence:

```json
{
  "subjects": [
    {
      "subject_slug": "biology",
      "subject_name": "Biology",
      "score": 366,
      "certified_level": "intermediate",
      "evaluations_count": 5,
      "distinct_topics_count": 5,
      "provisional": false,
      "algorithm_version": "ordinal_bayes_v1",
      "updated_at": "2026-09-07T15:20:00.000Z"
    }
  ]
}
```

The score is an event-sourced conservative Bayesian projection, not a points total. Repeating the
same topic has weights 1, 0.5, 0.25, then zero; newer evidence gradually outweighs older evidence;
and any single evaluation changes the visible score by at most 100. Beginner-only evidence cannot
exceed 400. Higher ceilings require two distinct strong topics at the relevant level with no
critical misconception. The algorithm version is persisted so a future formula can be replayed in
shadow before activation. See [score benchmark](benchmarks/feedback-score-v1.md).

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
| `FEEDBACK_SUBSCRIPTION_REQUIRED` | `403` | Start or submit requires an active student subscription. |
| `FEEDBACK_FOCUS_UNAVAILABLE` | `409` | The focus session is not owned and completed. |
| `FEEDBACK_CONTEXT_UNAVAILABLE` | `422` | The topic cannot produce an assessment context. |
| `FEEDBACK_SESSION_ACTIVE` | `409` | Another feedback recording is active for the user. |
| `FEEDBACK_SESSION_NOT_FOUND` | `404` | The requested feedback session is not owned by the user. |
| `FEEDBACK_SESSION_STATE_CONFLICT` | `409` | The operation is invalid for the current feedback state. |
| `FEEDBACK_SESSION_EXPIRED` | `409` | The recording or upload deadline passed. |
| `FEEDBACK_AUDIO_INVALID` | `422` | The audio type, size, duration, or speech is invalid. |
| `FEEDBACK_TRANSCRIPTION_UNAVAILABLE` | `503` | The local transcription service could not process the audio. |
| `FOCUS_DURATION_INVALID` | `422` | Focus duration is outside the 60-to-14400-second range. |
| `FOCUS_RANDOMIZATION_NOT_FOUND` | `404` | The randomization does not belong to the current user. |
| `FOCUS_RANDOMIZATION_UNAVAILABLE` | `409` | The randomization cannot start a focus session. |
| `FOCUS_SESSION_ACTIVE` | `409` | The user already has an active focus session. |
| `FOCUS_SESSION_NOT_FOUND` | `404` | The focus session does not belong to the current user. |
| `FOCUS_SESSION_STATE_CONFLICT` | `409` | The session finished with another terminal status. |
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
curl --cookie .cookies -H 'content-type: application/json' -d '{"randomization_id":"<id>","duration_seconds":3600}' http://127.0.0.1:3000/v1/focus/sessions
curl --cookie .cookies http://127.0.0.1:3000/v1/focus/sessions/history
curl --cookie .cookies -X POST http://127.0.0.1:3000/v1/focus/sessions/<session_id>/heartbeat
```

Postman keeps the session cookie automatically. Import both files from `postman/`, select the local
environment, and run `Create anonymous session` before session-protected requests. A webhook request
must use a payload and signature produced by Polar or the test helper; unsigned payloads are rejected.

## Live E2E switch

Use the local-only E2E switch to exercise the real focus, transcription, evaluation, history, and
score pipeline without creating a Polar checkout:

```bash
bun run test:e2e:live
```

The command starts the Compose dependencies, applies migrations, and starts a temporary API on
`http://127.0.0.1:3100` with `E2E_TEST_MODE=true`. In that isolated process, an anonymous fixture is
accepted by identified-user guards, receives an active student entitlement, and does not emit usage
to Polar. Faster Whisper, Qwen, PostgreSQL, the worker, prompts, and Langfuse tracing remain real.
The environment schema refuses this switch when `APP_ENV=production`.

macOS generates a Portuguese WAV fixture automatically. Other systems must provide an accepted
audio file, which is also useful for checking a real recording:

```bash
E2E_AUDIO_FILE=/absolute/path/explanation.webm bun run test:e2e:live
```

Set `E2E_APP_PORT` to change the isolated API port, `E2E_SUBJECT_SLUG` to choose the subject, and
`E2E_FLOW_TIMEOUT_MS` to adjust the evaluation polling deadline. A cold Whisper model load receives
an E2E-only ten-minute timeout, configurable through `E2E_TRANSCRIPTION_TIMEOUT_MS`; the regular API
timeout is unchanged.
