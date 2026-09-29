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
- a curated global knowledge catalog with public subject discovery;
- authenticated topic randomization with a personal cursor-paginated history;
- post-focus audio explanations transcribed locally and evaluated with structured AI feedback;
- conservative, versioned subject scores from 0 through 1000;
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
- [Ollama](https://docs.ollama.com/macos) for the fastest local Qwen runtime on macOS (optional;
  Compose also provides a CPU-oriented runtime)

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
| faster-whisper | `http://127.0.0.1:8001` |
| Ollama (optional AI profile) | `http://127.0.0.1:11434` |
| Drizzle Studio | `https://local.drizzle.studio` |

`bun run infra:up` starts PostgreSQL, Mailpit, and the `infra/transcription` sidecar. `bun run dev`
starts only the API and Drizzle Studio processes. Langfuse uses its hosted dashboard at
`https://cloud.langfuse.com`; it is not a local Compose service in this version.

Anonymous authentication and local email work without external credentials. Google sign-in and
live billing require the corresponding values in `.env`. Feedback grading uses Jev decisions for the
score and `openai/gpt-6-luna` for the student-facing text, both through OpenRouter with one
`OPENROUTER_API_KEY`; see `docs/benchmarks/decision-models-v1.md`. The configured
OpenAI-compatible local runtime is the text fallback. Without `OPENROUTER_API_KEY` outside
production, the local `qwen3.5:9b` model through Ollama grades and writes on its own, so no paid API
key is required. The transcription sidecar uses the `faster-whisper` Python package and downloads
model files on first transcription into the named Docker volume
`juststudy-whisper-cache`, not into the repository.

For the fastest macOS setup, install Ollama natively and pull the model with `ollama pull
qwen3.5:9b`. To run it inside Docker instead, use the isolated AI profile:

```bash
bun run infra:ai:up
bun run infra:ai:pull
```

The model download is about 6.6 GB, so it is intentionally not part of the regular `infra:up`.
Docker Desktop on macOS runs this Linux container without Metal acceleration; native Ollama is the
recommended local option on Apple Silicon. Public deployments can point `AI_BASE_URL` at a
self-hosted vLLM `/v1` endpoint and set `AI_EVALUATION_MODEL` to its served model identifier.

Production requires `OPENROUTER_API_KEY`. The text fallback activates for connection/timeout
failures, provider 5xx/overload responses, rate limits, unavailable models, and exhausted credit
(including OpenRouter's HTTP 402), project spend, or organization usage limits. Invalid credentials, permission errors, malformed requests,
and invalid structured output remain visible instead of being masked. A transient failure opens the
local circuit for 30 seconds; quota failures open it for 15 minutes. Every fallback reason and
circuit decision is included in Langfuse telemetry. Configure both providers in production—the
fallback cannot help if its self-hosted endpoint is offline.

Create a Langfuse Cloud project and copy its project keys into `LANGFUSE_PUBLIC_KEY` and
`LANGFUSE_SECRET_KEY`. Open the dashboard at the `LANGFUSE_BASE_URL`; Langfuse is hosted and is not
started by `bun run dev`. The application works with its versioned `local-v1` prompt from
`backend/src/prompts/feedback` when the remote prompt does not exist. To manage it in Langfuse,
create a text prompt named
`feedback-explanation-evaluator`, label the active version `production`, and preserve the variables
`{{assessment_context}}`, `{{student_transcript}}`, and `{{output_language}}`.

Jev decides scorability, the four rubric scores, and which segments need a correction; the writer
model explains those fixed decisions. Transient Jev failures fall back to a full `gpt-6-luna` review.
Manage the writer prompt in Langfuse as `feedback-explanation-writer`, with the review variables plus
`{{grading_decisions}}`. `DECISION_MODEL` selects the OpenRouter decision model; the self-hosted Kev
comparison lives only in the benchmark runners.

Two optional settings are off by default:

- `KNOWLEDGE_ASSESSMENT_GENERATION=true` asks the main AI provider for a real reference summary, key
  concepts, and misconceptions for every catalog topic that lacks one, five topics per minute.
  Feedback sessions use the stored reference and keep the generic template as a fallback. Manage its
  prompt in Langfuse as `knowledge-topic-assessment`, with variables `{{subject}}`, `{{topic}}`, and
  `{{level}}`. Keep it off until the prompt is calibrated; see the benchmark report.
- `FEEDBACK_SHADOW_MODE=decision|llm|hybrid` reviews each completed feedback a second time after the
  student already has the result, and stores the comparison in `feedback_shadow_reviews`. `llm` uses
  `SHADOW_AI_MODEL` alone through OpenRouter. Compare a run with SQL such as
  `select mode, count(*), avg((verdict = primary_verdict)::int) from feedback_shadow_reviews group by mode`.

Check the transcription sidecar and run a low-volume live evaluator benchmark:

```bash
curl http://127.0.0.1:8001/health
curl --form 'audio=@/absolute/path/explanation.webm;type=audio/webm' \
  http://127.0.0.1:8001/v1/transcriptions
EVALUATION_BENCHMARK_REPETITIONS=1 \
  bun run --cwd backend --env-file=../.env benchmark:evaluation
```

The first audio request can take longer while `turbo` is downloaded. When Langfuse keys are set,
the live evaluator benchmark exports its AI SDK trace before exiting.

To estimate self-hosted inference cost, run the same workload on the target machine and provide its
effective hourly cost (rental, or amortization plus energy):

```bash
EVALUATION_BENCHMARK_REPETITIONS=1 \
EVALUATION_BENCHMARK_INFRA_HOURLY_USD=0.50 \
EVALUATION_BENCHMARK_UTILIZATION=0.70 \
EVALUATION_BENCHMARK_CONCURRENCY=1 \
  bun run --cwd backend --env-file=../.env benchmark:evaluation
```

The report includes measured tokens/second, capacity/hour, and estimated infrastructure cost per
evaluation and per 1,000 evaluations. Use the target vLLM host's measured latency and hourly price;
do not project the Docker/macOS CPU throughput onto a GPU rental.

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
| `bun run test:e2e:live` | Start local dependencies and run the real focus-to-score flow. |
| `bun run database:generate` | Generate a migration after a model change. |
| `bun run database:migrate` | Apply pending migrations. |
| `bun run openapi:generate` | Refresh the committed OpenAPI artifact. |
| `bun run --cwd backend benchmark:score` | Run the deterministic score simulation benchmark. |
| `bun run --cwd backend --env-file=../.env benchmark:evaluation` | Run the live evaluator gold-fixture smoke benchmark. |
| `bun run --cwd backend --env-file=../.env benchmark:decision` | Run the Jev or Kev grading-decision benchmark. |
| `bun run --cwd backend --env-file=../.env benchmark:topic` | Run the topic-review judge benchmark. |

CI also runs database-backed E2E tests. To run them locally, use a disposable database:

```bash
RUN_DATABASE_TESTS=true \
DATABASE_URL=postgres://juststudy:juststudy@127.0.0.1:5432/juststudy_test \
bun run test
```

Run the complete local flow against real Faster Whisper and Qwen with one command:

```bash
bun run test:e2e:live
```

The runner starts an isolated API on port `3100`, enables `E2E_TEST_MODE` only for that child
process, creates a session, bypasses external identity and Polar entitlement, completes focus,
generates and transcribes spoken audio, evaluates it, and verifies feedback history and score. The
switch is rejected when `APP_ENV=production`. On macOS, the runner generates the audio fixture with
the system voice. On other systems, or to test a real recording, pass an accepted audio file:

```bash
E2E_AUDIO_FILE=/absolute/path/explanation.wav bun run test:e2e:live
```

Optional controls are `E2E_APP_PORT`, `E2E_SUBJECT_SLUG`, `E2E_FLOW_TIMEOUT_MS`,
`E2E_TRANSCRIPTION_TIMEOUT_MS`, `E2E_EXPLANATION_TEXT`, and `E2E_VOICE`. The runner allows ten
minutes for a cold Whisper model load without changing the regular API timeout. It keeps PostgreSQL,
Whisper, and Ollama running so their logs and persisted E2E records can be inspected afterward; it
stops only its isolated API.

Read the [architecture](docs/architecture.md) and [code patterns](docs/code-patterns.md) before adding
a module, and the [API guide](docs/api.md) before changing an HTTP contract. AI coding agents can use
the repository's `create-backend-module` skill under `.agents/skills`; Claude receives the same
source of truth through `.claude/skills`.

## License

No open-source license has been selected yet. Until one is added, the source is publicly visible but
all rights remain reserved by the copyright holder.
