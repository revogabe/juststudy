import { z } from "zod";
import {
  type DecisionAnswer,
  type DecisionQuestion,
  DecisionRequestError,
  type DecisionResult,
  type Decisions,
} from "../decision.contract";

type SystemOneAdapterInput = {
  provider_name: string;
  base_url: string;
  api_key: string;
  model: string;
  input_price_per_million: number;
  timeout_ms: number;
  fetch?: typeof fetch;
};

const probabilitiesSchema = z.record(z.string(), z.number());

const systemOneAnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), noul: z.number() }),
  z.object({ type: z.literal("choice"), choice: z.string(), confidence: z.number(), probabilities: probabilitiesSchema }),
  z.object({ type: z.literal("score"), score: z.number(), confidence: z.number(), probabilities: probabilitiesSchema }),
]);

const systemOneResponseSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), systemOneAnswerSchema),
  usage: z.object({ input_tokens: z.number().int(), output_tokens: z.number().int() }),
});

type SystemOneAnswer = z.infer<typeof systemOneAnswerSchema>;

export function createSystemOneAdapter(input: SystemOneAdapterInput): Decisions {
  const request = input.fetch ?? fetch;

  return {
    answer: {
      async create(decision) {
        const startedAt = performance.now();
        const response = await request(`${input.base_url}/systemone`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${input.api_key}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ model: input.model, state: decision.state, questions: decision.questions }),
          signal: AbortSignal.timeout(input.timeout_ms),
        });

        if (!response.ok) throw new DecisionRequestError(response.status, (await response.text()).slice(0, 300));

        const body = systemOneResponseSchema.parse(await response.json());

        return {
          answers: mapAnswers(decision.questions, body.answers),
          provider: input.provider_name,
          model: body.model,
          input_tokens: body.usage.input_tokens,
          output_tokens: body.usage.output_tokens,
          estimated_cost_usd: (body.usage.input_tokens * input.input_price_per_million) / 1_000_000,
          latency_ms: Math.round(performance.now() - startedAt),
        };
      },
    },
  };
}

function mapAnswers<Questions extends Record<string, DecisionQuestion>>(
  questions: Questions,
  answers: Record<string, SystemOneAnswer>,
): DecisionResult<Questions>["answers"] {
  const mapped: Record<string, DecisionAnswer> = {};

  for (const [id, question] of Object.entries(questions)) {
    const answer = answers[id];
    if (answer?.type !== question.type) throw new Error(`The decision provider returned no ${question.type} answer for ${id}.`);

    mapped[id] = mapAnswer(question, answer);
  }

  return mapped as DecisionResult<Questions>["answers"];
}

function mapAnswer(question: DecisionQuestion, answer: SystemOneAnswer): DecisionAnswer {
  if (answer.type === "noul") return { type: "noul", probability: answer.noul };
  if (answer.type === "choice") return answer;

  const levels = question.type === "score" ? question.criteria.length : Object.keys(answer.probabilities).length;

  return {
    type: "score",
    score: answer.score,
    confidence: answer.confidence,
    probabilities: Array.from({ length: levels }, (_, level) => answer.probabilities[String(level)] ?? 0),
  };
}
