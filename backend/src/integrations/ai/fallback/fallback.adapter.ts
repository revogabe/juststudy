import { APICallError } from "ai";
import type { Ai, AiStructuredGeneration } from "../ai.contract";

type FallbackAiAdapterInput = {
  primary: Ai;
  primary_provider: string;
  fallback: Ai;
  transient_cooldown_ms: number;
  quota_cooldown_ms: number;
  now?: () => number;
};

type FallbackReason = "connection" | "model_unavailable" | "quota" | "rate_limit" | "timeout" | "unavailable";

type Circuit = {
  reason: FallbackReason;
  until: number;
};

const QUOTA_CODES = new Set([
  "credit_balance_exhausted",
  "organization_spend_limit_exceeded",
  "organization_usage_limit_exceeded",
  "project_spend_limit_exceeded",
]);

export function createFallbackAiAdapter(input: FallbackAiAdapterInput): Ai {
  const now = input.now ?? Date.now;
  let circuit: Circuit | null = null;

  return {
    structured: {
      async create<Output>(generation: AiStructuredGeneration<Output>) {
        const currentTime = now();

        if (circuit && circuit.until > currentTime) {
          return input.fallback.structured.create(withFallbackTelemetry(generation, input.primary_provider, circuit.reason, true));
        }

        circuit = null;

        try {
          return await input.primary.structured.create({
            ...generation,
            telemetry: {
              ...generation.telemetry,
              ai_fallback: false,
            },
          });
        } catch (primaryError) {
          const reason = classifyFallbackReason(primaryError);
          if (!reason) throw primaryError;

          circuit = {
            reason,
            until: now() + (reason === "quota" ? input.quota_cooldown_ms : input.transient_cooldown_ms),
          };

          try {
            return await input.fallback.structured.create(withFallbackTelemetry(generation, input.primary_provider, reason, false));
          } catch (fallbackError) {
            throw new AggregateError([primaryError, fallbackError], "Primary and fallback AI providers failed.");
          }
        }
      },
    },
  };
}

function withFallbackTelemetry<Output>(
  generation: AiStructuredGeneration<Output>,
  primaryProvider: string,
  reason: FallbackReason,
  circuitOpen: boolean,
): AiStructuredGeneration<Output> {
  return {
    ...generation,
    telemetry: {
      ...generation.telemetry,
      ai_fallback: true,
      ai_fallback_circuit_open: circuitOpen,
      ai_fallback_reason: reason,
      ai_primary_provider: primaryProvider,
    },
  };
}

function classifyFallbackReason(error: unknown): FallbackReason | null {
  const apiError = findApiCallError(error);

  if (apiError) {
    const code = readApiErrorCode(apiError);
    if (apiError.statusCode === 402 || (code && QUOTA_CODES.has(code))) return "quota";
    if (code === "model_not_found") return "model_unavailable";
    if (apiError.statusCode === 408) return "timeout";
    if (apiError.statusCode === 429) return "rate_limit";
    if (apiError.statusCode !== undefined && apiError.statusCode >= 500) return "unavailable";
    if (apiError.statusCode === undefined && apiError.isRetryable) return "connection";

    return null;
  }

  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) return "timeout";

  return hasNetworkErrorCode(error) ? "connection" : null;
}

function findApiCallError(error: unknown, depth = 0): APICallError | null {
  if (APICallError.isInstance(error)) return error;
  if (depth >= 4 || !isRecord(error)) return null;

  return findApiCallError(error.cause, depth + 1);
}

function readApiErrorCode(error: APICallError): string | null {
  const dataCode = nestedErrorCode(error.data);
  if (dataCode) return dataCode;
  if (!error.responseBody) return null;

  try {
    return nestedErrorCode(JSON.parse(error.responseBody));
  } catch {
    return null;
  }
}

function nestedErrorCode(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (typeof value.code === "string") return value.code;

  return isRecord(value.error) && typeof value.error.code === "string" ? value.error.code : null;
}

function hasNetworkErrorCode(error: unknown, depth = 0): boolean {
  if (depth >= 4 || !isRecord(error)) return false;

  if (
    typeof error.code === "string" &&
    ["EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ENETUNREACH", "ENOTFOUND", "ETIMEDOUT"].includes(error.code)
  )
    return true;

  return hasNetworkErrorCode(error.cause, depth + 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
