import { Elysia, ValidationError } from "elysia";

type ProblemErrorInput = {
  status: number;
  code: string;
  title: string;
  detail: string;
};

export class ProblemError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly type: string;

  constructor(input: ProblemErrorInput) {
    super(input.detail);
    this.name = "ProblemError";
    this.status = input.status;
    this.code = input.code;
    this.title = input.title;
    this.type = `https://juststudy.app/problems/${input.code.toLowerCase().replaceAll("_", "-")}`;
  }
}

function problemResponse(input: {
  status: number;
  type: string;
  title: string;
  code: string;
  detail: string;
}): Response {
  return Response.json(input, {
    status: input.status,
    headers: { "content-type": "application/problem+json" },
  });
}

function validationProblem(error: ValidationError): Response {
  return problemResponse({
    type: "https://juststudy.app/problems/request-validation-failed",
    title: "Request validation failed",
    status: 422,
    code: "REQUEST_VALIDATION_FAILED",
    detail: error.message,
  });
}

function knownProblem(error: ProblemError): Response {
  return problemResponse({
    type: error.type,
    title: error.title,
    status: error.status,
    code: error.code,
    detail: error.message,
  });
}

export const problemError = {
  create(input: ProblemErrorInput) {
    return new ProblemError(input);
  },
};

export function createProblemModule() {
  return new Elysia({ name: "infrastructure.http.problem" }).error("global", ({ error }) => {
    if (error instanceof ValidationError) {
      return validationProblem(error);
    }

    if (error instanceof ProblemError) {
      return knownProblem(error);
    }

    console.error(error);

    return problemResponse({
      type: "https://juststudy.app/problems/internal-server-error",
      title: "Internal server error",
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
      detail: "The request could not be completed.",
    });
  });
}
