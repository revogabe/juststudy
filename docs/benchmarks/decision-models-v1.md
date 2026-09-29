# Decision models V1 benchmark: Jev and Kev against the current LLMs

Run date: 2026-09-28  
Question versions: `explanation-decision-v1` (decision arms), `local-v1` prompt (LLM arms)  
Datasets: `evaluation-v2` (36 cases), `topic-review-v1` (64 candidates)

## Outcome

Jev and Kev only replace **decisions**. They cannot write the student-facing feedback or propose
topics, so every adoption is a hybrid: the decision model grades, and an LLM still writes the text.

For the Whisper transcript review, a Jev decision step is as accurate as the current GPT-5.6 Luna
grader on this set. It is also deterministic, about 35 times faster, and about 16 times cheaper for
the grading part, and it never flagged a correct segment. Kev-4B running locally is the best local
grader measured, but it depends on a real reference summary: with the generic catalog reference
that production sends today, it graded 14% of explanations containing false claims as `correct` or
`mostly_correct`.

For the weekly topic cron, the LLMs stay slightly better. Jev adds speed that a weekly job does not
need, and it costs the same as the LLM judge.

| Question | Answer from this run |
| --- | --- |
| Can Jev replace GPT-5.6 Luna? | Only its grading decisions. The prose still needs an LLM, so total cost barely changes unless the prose prompt shrinks. |
| Is Jev's grading as good? | Yes on this set: 97.2% gate pass vs 96.3%, and 0 false corrections vs 5 (authored) and 25 (catalog template). |
| How much faster? | p50 308 ms vs 10.9 s to a verdict. The student can see the grade before the text finishes. |
| Can Kev-4B replace local Qwen? | For decisions with real references, yes. Against the same Qwen weights on OpenRouter: 97.2% pass vs 88.0%, and no generation failures vs 6.5%. On this Mac: 8 of 8 passed at 3.1 s, while Docker Qwen passed 4 of 8 at 193 s. With generic references, no. |
| Topic cron? | Keep an LLM judge. GPT-6 Luna scored best (93.8%) at US$0.0012 for all 64 candidates. |

## Transcript review results

Each arm ran 36 cases × 3 repetitions = 108 runs.

| Arm | Reference | Pass | Strict | Generation failures | False pass | Correction recall | False corrections | Stable verdicts | p50 | p95 | US$ / 1,000 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GPT-5.6 Luna | authored | 96.3% | 91.7% | 0.9% | 0.0% | 100.0% | 5 of 438 (1.1%) | 28/36 | 10.9 s | 14.2 s | 2.14 |
| GPT-5.6 Luna | catalog template | 98.1% | 75.9% | 0.0% | 0.0% | 100.0% | 25 of 444 (5.6%) | 30/36 | 12.6 s | 15.4 s | 2.30 |
| GPT-6 Luna | authored | 96.3% | 94.4% | 0.0% | 2.4% | 100.0% | 2 of 444 (0.5%) | 28/36 | 11.6 s | 16.1 s | 0.96 |
| GPT-6 Luna | catalog template | 91.7% | 79.6% | 0.0% | 0.0% | 98.6% | 15 of 444 (3.4%) | 26/36 | 12.9 s | 16.9 s | 1.00 |
| Qwen3.5-9B (OpenRouter) | authored | 88.0% | 82.4% | 6.5% | 0.0% | 94.1% | 8 of 406 (2.0%) | 29/36 | 19.6 s | 128.3 s | 0.46 |
| Qwen3.5-9B (OpenRouter) | catalog template | 75.0% | 66.7% | 10.2% | 0.0% | 92.3% | 19 of 395 (4.8%) | 18/36 | 21.4 s | 122.0 s | 0.49 |
| **Jev 1.13** | authored | **97.2%** | **97.2%** | 0.0% | 0.0% | 100.0% | **0 of 444** | **36/36** | **308 ms** | **460 ms** | **0.13** |
| **Jev 1.13** | catalog template | **97.2%** | **97.2%** | 0.0% | 0.0% | 100.0% | **0 of 444** | **36/36** | **315 ms** | **497 ms** | **0.12** |
| Kev-4B (local M4 Pro) | authored | 97.2% | 86.1% | 0.0% | 0.0% | 100.0% | 12 of 444 (2.7%) | 36/36 | 2.5 s | 3.3 s | 0 tokens |
| Kev-4B (local M4 Pro) | catalog template | 86.1% | 80.6% | 0.0% | **14.3%** | **65.2%** | 12 of 444 (2.7%) | 36/36 | 2.5 s | 3.3 s | 0 tokens |

Pass rate by archetype:

| Arm | Reference | Correct | Insufficient | Many errors | Minor imprecision | True but incomplete | Prompt injection | One critical | Two errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GPT-5.6 Luna | authored | 95.2% | 100% | 100% | 100% | 94.4% | 66.7% | 100% | 100% |
| GPT-5.6 Luna | template | 100% | 100% | 100% | 100% | 88.9% | 100% | 100% | 100% |
| GPT-6 Luna | authored | 100% | 100% | 100% | 100% | 88.9% | 83.3% | 94.4% | 100% |
| GPT-6 Luna | template | 81.0% | 100% | 83.3% | 100% | 83.3% | 83.3% | 100% | 100% |
| Qwen3.5-9B | authored | 85.7% | 100% | 50.0% | 77.8% | 94.4% | 50.0% | 94.4% | 100% |
| Qwen3.5-9B | template | 47.6% | 93.3% | 83.3% | 100% | 72.2% | 50.0% | 100% | 60.0% |
| Jev 1.13 | authored | 100% | 100% | 100% | 100% | 100% | 50.0% | 100% | 100% |
| Jev 1.13 | template | 100% | 100% | 100% | 100% | 83.3% | 100% | 100% | 100% |
| Kev-4B | authored | 100% | 100% | 100% | 100% | 100% | 50.0% | 100% | 100% |
| Kev-4B | template | 85.7% | 100% | 0.0% | 100% | 100% | 100% | 66.7% | 100% |

Mean mastery distance from GPT-5.6 Luna, averaged per case over repetitions:

| Arm | Authored reference | Catalog template |
| --- | --- | --- |
| GPT-6 Luna | 3.3 points (bias −2.6) | 2.9 points (bias +0.1) |
| Jev 1.13 | 4.5 points (bias +2.6) | 6.0 points (bias +5.4) |
| Qwen3.5-9B | 8.0 points (bias −5.2) | 12.8 points (bias −6.0) |
| Kev-4B | 11.2 points (bias −8.1) | 7.7 points (bias +0.3) |

### What the failures were

- **Jev** failed one case in each mode, in all three repetitions. With the authored reference, the
  SN2 prompt-injection case was judged too thin to grade. That is a safe failure, and GPT-5.6 Luna made
  the same call in 2 of 3 repetitions. With the catalog template, Jev graded a true but incomplete
  quadratic-function answer at 86 (`correct`), because the generic key concepts do not say what is
  missing.
- **GPT-5.6 Luna** once referenced a segment that does not exist, which the evaluation rule rejects.
  Its false corrections were omissions or accurate claims marked as errors, for example the
  allosteric release in the lac operon or QUIC in the TCP/UDP answer. The catalog template made this
  five times more frequent.
- **Qwen3.5-9B** failed to produce a valid object in 7 and 11 of 108 runs. Some runs looped until
  the 4,000-token limit, and others returned JSON outside the schema. Its p95 exceeded two minutes on
  OpenRouter.
- **Kev-4B** flagged some correct first segments and the injection segment itself as false claims.
  With the catalog template it missed the critical errors in the free-fall and crase cases, which
  produced a `mostly_correct` verdict, and it declared the two many-error explanations unscorable.
  It gives the same answer on every repetition.

### Confidence routing

The decision arms return a run confidence: the minimum certainty across scorability, rubric scores,
contradictions, and flagged severities.

| Arm | ≥ 0.5 | ≥ 0.7 | ≥ 0.9 |
| --- | --- | --- | --- |
| Jev, authored | 76.9% of runs, 100% pass | 45.4%, 100% | 24.1%, 100% |
| Jev, catalog template | 76.9%, 97.6% | 32.4%, 100% | 16.7%, 100% |
| Kev-4B, either reference | 13.9%, 100% | 13.9%, 100% | 11.1%, 100% |

Jev's confidence is usable for routing: about three quarters of runs clear 0.5, and at 0.7 every
automated run passed. Kev-4B's calibrated probabilities are too soft on this task to route with.

## Local hardware comparison

Same Apple M4 Pro (24 GB), same 8 cases (one per archetype), one repetition each. Qwen ran in the
repository's Docker Ollama, which is CPU-only on macOS, with the container at 7.0 of 7.75 GiB. Kev-4B
ran natively with MLX on the Apple GPU. The Kev server stayed resident but idle during the Qwen run.

| Arm | Passed | Generation failures | False corrections | p50 | p95 | Output tokens per review |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Qwen3.5-9B, Docker Ollama | 4 of 8 | 3 of 8 (two runner crashes, one 10-minute timeout) | 0 | 193.5 s | 292.8 s | 1,714 |
| Kev-4B, MLX | 8 of 8 | 0 | 2 of 29 segments | 3.1 s | 16.4 s (first request) | about 1,100 decision tokens |

Qwen also graded the incomplete Ohm's-law answer `correct` (85). The earlier baseline in
`feedback-score-v1.md` measured the same runtime at a 128 s p50 with 2 of 9 runner failures. This
run is slower and failed more often, so the Docker CPU runtime is not a dependable local fallback on
this machine. Part of the gap is the runtime rather than the model: Qwen3.5-9B on OpenRouter GPUs had
a 19.6 s p50. A native Ollama or MLX build on the same Mac was not measured.

For the grading decisions alone, Kev-4B is about 60 times faster than the current local runtime on
this machine and did not fail. It still cannot write the student-facing text.

## Topic review results

64 candidates, one run. Decision arms send one request per candidate. LLM arms judge each subject's
16 candidates in one structured call.

| Arm | Decision accuracy | Level exact | Level ±1 | Duplicate precision | Duplicate recall | Out-of-scope recall | New topics accepted | p50 request | Wall time | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GPT-5.6 Luna | 92.2% | 90.4% | 100% | 100% | 100% | 100% | 100% | 2.7 s | 2.8 s | US$0.0027 |
| GPT-6 Luna | **93.8%** | **92.3%** | 100% | 100% | 100% | 100% | 100% | 3.4 s | 3.4 s | **US$0.0012** |
| Qwen3.5-9B | 73.4% | 86.5% | 98.1% | 61.3% | 95.0% | 100% | 62.5% | 8.9 s | 11.5 s | US$0.0007 |
| Jev 1.13 | 90.6% | 84.6% | 100% | 100% | 100% | 100% | 96.9% | 297 ms | 2.7 s | US$0.0029 |
| Kev-4B | 89.1% | 75.0% | 100% | 95.2% | 100% | 100% | 96.9% | 1.4 s | 86.9 s | 0 tokens |

Decision accuracy requires the right accept/reject decision, the exact duplicate slug, and the exact
level for accepted topics. Every judge caught all out-of-scope candidates. Qwen3.5-9B rejected 12 of
the 32 genuinely new topics. Seven of those came from returning the string `"null"` instead of JSON
`null` as `duplicate_of`. The other five were near-miss pairs matched to the wrong concept, such as
Meiose to Mitose, the second Mendel law to the first, and syntactic to lexical analysis. Jev costs as much as an LLM here because each per-candidate
request repeats the subject's 20 existing topics as choice options. Batching candidates into one
state would reduce that, but at US$0.003 per weekly run it does not matter.

At confidence ≥ 0.7, Jev automated 75% of candidates with 95.8% accuracy. Kev-4B cleared 0.7 on only
3%.

## What this means for JustStudy

1. **Transcript review, cloud:** a hybrid is worth a shadow test. Jev grades first (≈0.3 s, about
   US$0.13 per 1,000 reviews); its verdict, mastery, and correction anchors become the input for a
   shorter LLM call that writes only the explanation text. Expected gains: an immediate grade,
   identical results on retries, no false corrections on correct segments, and a confidence value
   that can send uncertain reviews to a second opinion. The cost gain depends on the prose call. If
   it keeps today's output size, total cost rises by roughly 6%; it falls only if the prose call is
   smaller.
2. **The prose model:** GPT-6 Luna matched GPT-5.6 Luna on these gates at 45% of the cost. That is a
   separate and simpler saving worth its own shadow run.
3. **Local fallback:** Kev-4B is faster and more reliable than local Qwen for the grading
   decisions, but only with a real reference. Qwen or another LLM is still needed for the prose, and
   on this Mac the two cannot share the 24 GB comfortably. The Kev README asks for 32 GB for Kev-4B
   and Kev-9B.
4. **Catalog references are the largest quality lever.** Every arm got worse with the generic
   `catalog-template-v1` reference, and Kev-4B got the most dangerous kind of worse. Generating a
   real `reference_summary`, key concepts, and misconceptions per topic, for example in the same
   weekly cron that proposes topics, improves every grader.
5. **Topic cron:** use an LLM to propose and judge. GPT-6 Luna was the most accurate and the cheapest
   judge measured. Do not use Qwen3.5-9B for duplicate detection.

## Follow-up: the implemented recommendations

The recommendations above were implemented and measured with the same 36 cases × 3 repetitions.
The hybrid review is now the default (see "Adopted default"); `FEEDBACK_SHADOW_MODE` and
`KNOWLEDGE_ASSESSMENT_GENERATION` stay off by default. `generated` references were written once by GPT-5.6 Luna with the
production `knowledge-topic-assessment` prompt (`local-v1`) and are committed in
`backend/benchmarks/fixtures/evaluation-v2-generated-references.json`.

### Hybrid review: Jev grades, an LLM writes

The hybrid path rounds Jev's rubric scores to integers, grades them with `feedbackEvaluationRule`,
and asks the writer model for the student-facing text only.

| Arm | Reference | Pass | Strict | Generation failures | False corrections | Stable verdicts | p50 | p95 | Writer output tokens | US$ / 1,000 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GPT-5.6 Luna alone (today) | authored | 96.3% | 91.7% | 0.9% | 5 | 28/36 | 10.9 s | 14.2 s | 1,494 | 2.14 |
| GPT-6 Luna alone | authored | 96.3% | 94.4% | 0.0% | 2 | 28/36 | 11.6 s | 16.1 s | 1,580 | 0.96 |
| Jev + GPT-5.6 Luna writer | authored | 95.4% | 95.4% | 1.9% | 0 | 35/36 | 14.6 s | 18.7 s | 1,518 | 2.26 |
| **Jev + GPT-6 Luna writer** | authored | **97.2%** | **97.2%** | **0.0%** | **0** | **36/36** | 12.1 s | 16.1 s | 1,766 | **1.16** |
| Jev + GPT-5.6 Luna writer | generated | 88.9% | 88.9% | 1.9% | 0 | 33/36 | 15.4 s | 20.1 s | 1,591 | 2.38 |
| Jev + GPT-6 Luna writer | generated | 90.7% | 90.7% | 0.9% | 0 | 34/36 | 12.7 s | 16.8 s | 1,902 | 1.25 |

Jev with a GPT-6 Luna writer matched Jev's own grading gates, kept every correction anchored to a
false claim, repeated the same verdict on every case, and cost 46% less than today's GPT-5.6 Luna
review. It is about 1 s slower end to end, because the grade and the text are sequential. The
writer explained every decided correction: no run failed for a missing correction. The only
generation failures were a writer that cited a nonexistent segment and one timeout, both with
GPT-5.6 Luna as writer, plus one nonexistent-segment failure for GPT-6 Luna with generated
references. The same failure class already exists
in the LLM-only path, and the job retries it.

The SN2 prompt-injection case still fails in every hybrid arm, because Jev judges it unscorable.
That is the same safe failure as before.

### Generated references

| Arm | Authored | Catalog template | Generated |
| --- | --- | --- | --- |
| Jev 1.13 pass / strict | 97.2% / 97.2% | 97.2% / 97.2% | 94.4% / 94.4% |
| GPT-5.6 Luna pass / strict | 96.3% / 91.7% | 98.1% / 75.9% | 92.6% / 81.5% |
| GPT-6 Luna pass / strict | 96.3% / 94.4% | 91.7% / 79.6% | 88.0% / 85.2% |
| Kev-4B pass / strict | 97.2% / 86.1% | 86.1% / 80.6% | 88.9% / 75.0% |
| Kev-4B false pass | 0.0% | 14.3% | **0.0%** |
| Kev-4B correction recall | 100% | 65.2% | 78.3% |
| GPT-5.6 Luna false corrections | 5 | 25 | 16 |
| GPT-6 Luna false corrections | 2 | 15 | 11 |
| Qwen3.5-9B pass / strict | 88.0% / 82.4% | 75.0% / 66.7% | 72.2% / 69.4% |
| Qwen3.5-9B generation failures | 6.5% | 10.2% | 9.3% |

Generated references fixed the dangerous part of the catalog-template problem: Kev-4B no longer
graded explanations with false claims as correct, and the GPT models flagged fewer correct segments
than with the template. They did not recover the authored-reference pass rate. The generated
references list 5.8 key concepts on average, compared with 5.4 in the authored fixtures, and several
of them are optional extensions such as ecological importance. The GPT models then scored coverage at
2 for complete but oral answers, which dropped them to mastery 63–68 and `partial`. Jev was less
affected; its only new failure was an incomplete quadratic-function answer graded 78–80.

**Keep `KNOWLEDGE_ASSESSMENT_GENERATION` off** until the prompt is calibrated to three to five
essential concepts for the level and the calibrated references pass this benchmark. The storage,
fallback, worker, and prompt are in place, so that is a prompt change and a rerun of
`benchmarks/reference.generate.ts`.

### Adopted default

Jev decisions with a GPT-6 Luna writer are now the default feedback path, with no feature flag. In
production, Jev runs through OpenRouter and GPT-6 Luna through OpenAI (`gpt-6-luna`, US$0.10 / US$0.50
per million input/output tokens), with the local runtime as the text fallback. Transient Jev failures
fall back to a full GPT-6 Luna review. Reference generation stays off until its prompt is calibrated.
`FEEDBACK_SHADOW_MODE` remains available to compare the default against another reviewer on real
traffic.

## Limitations

- Most arms are near the ceiling on 36 cases. One run is 0.9 percentage points, so differences of
  one or two points in pass rate are noise. The latency, cost, stability, generation-failure, and
  false-correction differences are large enough to matter.
- The fixtures were AI-drafted and are not the human-reviewed gold set described in
  `feedback-score-v1.md`. Two labels are debatable. In the fundamental-theorem case, "área embaixo da
  curva" omits the sign, and both GPT models flagged it. The SN2 injection answer is thin enough that
  `insufficient` is defensible.
- Transcripts are clean text. Real Whisper errors, accents, and long answers above Kev's 384-token
  training states were not tested.
- Qwen3.5-9B through OpenRouter is served by third-party providers, so its latency and failure rate
  reflect them as well as the model.
- Only Kev-4B was tested. Kev-9B and Kev-27B were not, because of this machine's memory.
- The hybrid's prose step was not built or measured. Its latency and cost are inferred from the LLM
  arms.

## Method

### What was compared

Jev and Kev are System One decision models. They answer typed questions (`noul` yes/no, `choice`,
`score`) with probabilities and do not generate text. They cannot replace the LLM that writes the
student-facing feedback or proposes new topics. They can replace the decisions inside those flows:

| Flow | Decision-model questions | Still needs an LLM |
| --- | --- | --- |
| Whisper transcript review | `scorable` noul, four 0–4 rubric scores, one contradiction noul and one severity choice per segment | headline, summary, correction text, improvement plan, outline, follow-up questions |
| Weekly topic cron | level choice, duplicate choice over the existing subject topics, in-scope noul | proposing the candidate names and slugs |

Mastery and verdict are computed by `feedbackEvaluationRule.grade` for both paths, so the LLM and
decision arms share one formula (50% factual accuracy, 30% coverage, 20% reasoning, critical cap).
A segment counts as a correction when its contradiction probability is at least 0.5.

### Arms

| Arm | Runtime | Price used |
| --- | --- | --- |
| `gpt56luna` | `openai/gpt-5.6-luna` through OpenRouter, reasoning `none` (current production primary) | US$0.20 / US$1.20 per million input/output tokens |
| `gpt6luna` | `openai/gpt-6-luna` through OpenRouter, reasoning `none` (newer, cheaper sibling) | US$0.10 / US$0.50 |
| `qwen9b` | `qwen/qwen3.5-9b` through OpenRouter, reasoning `none` (same weights as the local fallback) | US$0.10 / US$0.15 |
| `jev` | `typesafe/jev-1.13` through OpenRouter `/api/v1/systemone` | US$0.042 per million input tokens; output free |
| `kev4b` | `jaredpalmer/kev-4b`, MLX bf16 on an Apple M4 Pro with 24 GB, local `kev.serve` | zero token price |
| `local-qwen9b-docker` | `qwen3.5:9b` in the repository's Docker Ollama (CPU only on macOS), 8-case subset | zero token price |

OpenAI was reached through OpenRouter because `OPENAI_API_KEY` is empty in the local `.env`; the
model and per-token prices are the same as the direct API. The LLM arms used the local prompt
`local-v1`, because the Langfuse prompt `feedback-explanation-evaluator` with label `production` was
not found.

### Datasets

- `backend/benchmarks/fixtures/evaluation-v2.json`: 36 PT-BR spoken explanations across 10 subjects
  and all four levels. The three v1 cases are kept. Archetypes: 7 correct and complete (two with heavy
  disfluency), 6 with one critical misconception, 5 with two misconceptions, 2 with many errors,
  6 true-but-incomplete, 3 with only minor imprecision, 5 insufficient (off-topic or too short), and
  2 prompt injections addressed to the grader. Every segment with an explicit false claim is listed
  in `required_correction_segment_ids`, so the set also measures false corrections.
- `backend/benchmarks/fixtures/topic-review-v1.json`: 4 subjects, each with 20 existing topics in
  the 3/7/6/4 batch distribution and 16 candidates (8 new with 2 per level, 5 paraphrased
  duplicates, 3 out of scope). Near-miss pairs such as Meiose vs Mitose test duplicate precision.

Both datasets were drafted by an AI assistant and reviewed once by the same assistant. They are
developer fixtures, not the human-reviewed gold set required before score-producing use.

### Reference modes

`authored` uses the fixture's real `reference_summary`, key concepts, and misconceptions.
`catalog-template` replaces them with `knowledgeAssessmentRule.create`, which is what production
sends today for catalog topics: a generic template without topic facts. That mode measures how much
each model depends on its own knowledge.

### Metrics

- **pass**: scorable, verdict, mastery range, and every required correction all match.
- **strict**: pass and no correction on a segment without a false claim.
- **false pass**: a case that contains a false claim received `correct` or `mostly_correct`.
- **correction recall / precision / false correction rate**: per segment.
- **brier**: per-segment contradiction probability against the label (LLM arms are 0/1).
- **confidence routing** (decision arms): the run confidence is the minimum of the scorable,
  rubric, contradiction, and flagged-severity certainties; the table shows which share of runs
  clears each threshold and how often those runs pass.
- Latency is wall-clock per evaluation from the benchmark process, including network.

## Reproduce

```sh
# LLM arm (any OpenAI-compatible endpoint)
AI_PROVIDER_NAME=openrouter AI_BASE_URL=https://openrouter.ai/api/v1 AI_API_KEY=<openrouter key> \
AI_EVALUATION_MODEL=openai/gpt-5.6-luna AI_INPUT_PRICE_PER_MILLION=0.2 AI_OUTPUT_PRICE_PER_MILLION=1.2 \
EVALUATION_BENCHMARK_DATASET=evaluation-v2 EVALUATION_BENCHMARK_REPETITIONS=3 EVALUATION_BENCHMARK_PARALLELISM=6 \
bun run --cwd backend --env-file=../.env benchmark:evaluation

# Jev through OpenRouter (reads OPENROUTER_API_KEY)
DECISION_BENCHMARK_REPETITIONS=3 DECISION_BENCHMARK_PARALLELISM=8 \
bun run --cwd backend --env-file=../.env benchmark:decision

# Kev: uv run --extra serve python -m kev.serve --run jaredpalmer/kev-4b --port 8009
DECISION_PROVIDER_NAME=kev DECISION_BASE_URL=http://127.0.0.1:8009/v1 DECISION_MODEL=kev-latest \
DECISION_INPUT_PRICE_PER_MILLION=0 bun run --cwd backend --env-file=../.env benchmark:decision

# Topic review: TOPIC_BENCHMARK_ARM=decision (DECISION_* variables) or llm (AI_* variables)
TOPIC_BENCHMARK_ARM=decision bun run --cwd backend --env-file=../.env benchmark:topic
```

Add `*_BENCHMARK_REFERENCE=catalog-template` to run the production-like reference mode,
`*_BENCHMARK_CASE=<id>,<id>` to select cases, and `*_BENCHMARK_OUTPUT=<path>` to save the report.
