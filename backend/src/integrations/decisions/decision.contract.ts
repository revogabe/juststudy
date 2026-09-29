export type DecisionJson = string | number | boolean | null | DecisionJson[] | { [key: string]: DecisionJson };

export type DecisionNoulQuestion = {
  type: "noul";
  instructions: DecisionJson;
  criteria?: { true: DecisionJson; false: DecisionJson };
};

export type DecisionChoiceQuestion = {
  type: "choice";
  instructions: DecisionJson;
  criteria: Record<string, DecisionJson>;
};

export type DecisionScoreQuestion = {
  type: "score";
  instructions: DecisionJson;
  criteria: DecisionJson[];
};

export type DecisionQuestion = DecisionNoulQuestion | DecisionChoiceQuestion | DecisionScoreQuestion;

export type DecisionNoulAnswer = {
  type: "noul";
  probability: number;
};

export type DecisionChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export type DecisionScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  probabilities: number[];
};

export type DecisionAnswer = DecisionNoulAnswer | DecisionChoiceAnswer | DecisionScoreAnswer;

export type DecisionAnswerFor<Question extends DecisionQuestion> = Question extends DecisionNoulQuestion
  ? DecisionNoulAnswer
  : Question extends DecisionChoiceQuestion
    ? DecisionChoiceAnswer
    : DecisionScoreAnswer;

export type DecisionRequest<Questions extends Record<string, DecisionQuestion>> = {
  state: DecisionJson;
  questions: Questions;
  function_id: string;
};

export type DecisionResult<Questions extends Record<string, DecisionQuestion>> = {
  answers: { [Id in keyof Questions]: DecisionAnswerFor<Questions[Id]> };
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
};

export type Decisions = {
  answer: {
    create<Questions extends Record<string, DecisionQuestion>>(input: DecisionRequest<Questions>): Promise<DecisionResult<Questions>>;
  };
};

export class DecisionRequestError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`The decision provider rejected the request with status ${status}: ${detail}`);
    this.name = "DecisionRequestError";
  }
}
