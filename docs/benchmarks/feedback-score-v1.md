# Feedback and score V1 benchmark

Run date: 2026-09-07  
Algorithm: `ordinal_bayes_v1`  
Command: `SCORE_BENCHMARK_ITERATIONS=10000 bun run --cwd backend benchmark:score`

## Outcome

The deterministic simulation passed the V1 safety gates. It is suitable for collecting shadow and
production evidence, but it is not yet a psychometrically calibrated measure of student ability.

| Scenario | Result | V1 gate | Status |
| --- | ---: | ---: | --- |
| 100 perfect beginner topics | 400 | no more than 400 | pass |
| One low-mastery specialist topic | 0 | no positive hard-label exploit | pass |
| Largest visible single-evaluation change | 100 | no more than 100 | pass |
| P95 score drift from noisy advanced mastery | 58 | no more than 75 | pass |
| Reversed delivery order difference | 0 | exactly 0 | pass |
| Shift every event by 100 calendar days | 0 | exactly 0 | pass |
| Recovery after 30 weak + 30 strong evaluations | 808 | greater than 600 | pass |
| Replay 1,000 evaluations | 94.4 ms | observational | pass |

The noise test used 10,000 seeded trajectories of 20 advanced evaluations, centered on mastery 90
with a 10-point standard deviation. Specialist progression under sustained perfect evidence was:

| Distinct evaluations | Score |
| ---: | ---: |
| 1 | 32 |
| 5 | 366 |
| 10 | 681 |
| 20 | 811 |
| 30 | 844 |

This is the intended shape: a difficult first answer provides evidence without immediately granting
an elite score, while repeated evidence across distinct topics can move a genuinely strong student
quickly enough.

The replay implementation updates posterior evidence incrementally, so its cost is linear in the
number of evaluations rather than quadratic. The 1,000-event timing is machine-dependent and is
reported for regression visibility, not used as a portable pass/fail gate.

## Why this formula ships instead of a direct Elo update

A direct Elo update made low mastery on a high-difficulty label capable of increasing score and gave
the four manually assigned levels too much leverage. `ordinal_bayes_v1` instead:

- treats the 0–100 mastery as interpolated evidence across five ordinal response bands;
- calculates a posterior over abilities 0–1000 and exposes its conservative fifth percentile;
- gives newer evidence more weight without depending on wall-clock boundaries;
- reduces repeat-topic weights to 1, 0.5, 0.25, then zero;
- replays events by `occurred_at` and ID for deterministic late delivery;
- caps each projected transition at ±100;
- requires two distinct strong topics to certify a higher score ceiling.

This design follows the useful parts of ordinal IRT and conservative Bayesian ratings while avoiding
a claim that the current content difficulty labels are already calibrated item parameters. Every
evidence event and algorithm version is retained, so later calibration can be replayed without
rewriting history.

## Model selection snapshot

Development and test default to the open-weight `Qwen/Qwen3.5-9B`. Production uses
`gpt-5.6-luna` as primary and the same open-weight runtime as an operational fallback. Ollama serves
the local `qwen3.5:9b` quantization for development, while vLLM is the intended self-hosted runtime
for deployment. Both expose an OpenAI-compatible API, and all providers stay behind the neutral AI
contract. Local token prices are zero; infrastructure cost must be measured separately for the
production hardware. Qwen3.5-9B is Apache-2.0, has a 262k native context window, and reports strong
multilingual benchmarks in its
[Hugging Face model card](https://huggingface.co/Qwen/Qwen3.5-9B).

LMArena is useful as a broad preference signal, not as proof that a model grades explanations well.
The live leaderboard includes larger DeepSeek/Qwen variants, but it does not provide a directly
comparable educational-judge score for Qwen3.5-9B. Therefore model promotion is gated on the
JustStudy gold set rather than Arena rank. Hosted Together and DeepSeek endpoints remain optional
benchmark challengers. OpenAI is the production primary, while Qwen remains the automatic
operational fallback. See the
[LMArena text leaderboard](https://lmarena.ai/leaderboard/text/industry-software-and-it-services).

## Benchmark limitations and next gates

The deterministic score simulation does not require a model. The live evaluator smoke benchmark
requires the configured local or remote model to be running, and its numbers are only developer
fixtures—not a claim of educational accuracy. No reviewed PT-BR audio gold set exists in the
repository, so fabricated judge-accuracy numbers would be misleading.

### Local Qwen baseline — 2026-09-07

The calibrated V1 prompt and schema were exercised against Ollama 0.33.3 with the quantized
`qwen3.5:9b` model inside Docker Desktop on an arm64 Mac. The container used CPU inference, one
request at a time, and reached 6.98 GiB of its 7.75 GiB Docker memory allocation (90%). A sampled
generation used about 14 CPU cores. The final three-case, three-repetition run produced:

| Case | Successful runs | Result/mastery | Successful-run latency |
| --- | ---: | --- | --- |
| two explicit misconceptions | 2/3 | `incorrect`, 25 | 129.3–157.2 s |
| complete correct explanation | 3/3 | `correct`, 88–100 | 102.4–167.5 s |
| off-topic evidence | 2/3 | `insufficient`, unscored | 75.4–128.1 s |

All seven generated evaluations passed their pedagogical gates, but two of nine attempts failed at
the Ollama runner layer: one resource-limit stop and one unexpected EOF. The measured pass rate was
therefore 77.8%, which is not production-ready. P50 latency was 128.1 seconds, P95 was 167.5 seconds,
and measured generation throughput was 13.44 output tokens/second. The nominal median capacity at
70% utilization is 19.67 evaluations/hour for one CPU worker, before applying a reliability margin.

API token cost is zero. If the effective machine cost is `H` per hour, the nominal baseline costs
approximately `H / 19.67` per evaluation, or `50.84 × H` per 1,000 evaluations. For example, an
effective machine cost of US$0.50/hour would imply about US$25.42/1,000 nominal evaluations. Failed
attempts and retries make the real cost higher, so this example is arithmetic—not a quoted cloud
price or a launch capacity promise.

During calibration, the original unbounded output contract caused truncation at 1,600 and 2,400
tokens, and an under-specified rubric assigned zero credit to partially correct work. The final
schema bounds item lengths/counts, requires evidence for every rubric dimension, disables hidden
reasoning for structured generation, and explicitly anchors each 0–4 score. An earlier continuous
run exposed one false-critical correction on an otherwise correct answer; the prompt now allows
corrections only for directly contradicted claims and routes omissions to the improvement plan. All
successful generations in the final nine-attempt run passed after that change.

These measurements are a local baseline, not a production capacity promise. Before launch, run the
same command on the intended vLLM GPU host with `EVALUATION_BENCHMARK_INFRA_HOURLY_USD` set to the
real hourly cost and increase repetitions. A concurrency/soak sweep is still required before choosing
replica count or an SLA.

A three-case, three-repetition live smoke harness is included as
`bun run --cwd backend --env-file=../.env benchmark:evaluation`. It checks structured-output
success, mastery ranges, verdicts, required correction anchors, accidental fallback, latency, tokens,
and estimated cost. Its fixtures protect basic behavior but are developer-authored and are not a
replacement for the human-reviewed gold set below. `EVALUATION_BENCHMARK_DATASET=evaluation-v2`
selects the 36-case set used by the decision-model comparison in
[decision-models-v1.md](decision-models-v1.md).

Before the score is used for ranking, unlocks, or high-stakes decisions, collect and freeze a human
reviewed set with diverse subjects, levels, audio quality, durations, and accents. Compare every
`model + prompt_version + schema_version` on:

- mastery MAE and bias against two independent human reviewers;
- weighted agreement for the four rubric dimensions;
- recall of critical misconceptions and false-pass rate;
- run-to-run stability and paraphrase/verbosity invariance;
- prompt-injection resistance;
- latency, successful structured-output rate, and cost per completed evaluation;
- score replay impact, especially P95 changes and subject/slice disparities.

Prompt or model changes should run in shadow first. A new version becomes score-producing only after
it passes the frozen gold set and a replay confirms bounded score migration.
