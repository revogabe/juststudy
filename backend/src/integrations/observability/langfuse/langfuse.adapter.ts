import { LangfuseSpanProcessor } from "@langfuse/otel";
import { setLangfuseTracerProvider } from "@langfuse/tracing";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { registerTelemetry } from "ai";
import type { Observability } from "../observability.contract";

type LangfuseObservabilityInput = {
  public_key: string;
  secret_key: string;
  base_url: string;
  environment: string;
};

export function createLangfuseObservability(input: LangfuseObservabilityInput): Observability {
  if (!input.public_key || !input.secret_key) return { async shutdown() {} };

  const provider = new NodeTracerProvider({
    spanProcessors: [
      new LangfuseSpanProcessor({
        publicKey: input.public_key,
        secretKey: input.secret_key,
        baseUrl: input.base_url,
        environment: input.environment,
        mediaUploadEnabled: false,
      }),
    ],
  });

  provider.register();
  setLangfuseTracerProvider(provider);
  registerTelemetry(new LangfuseVercelAiSdkIntegration());

  return {
    shutdown() {
      return provider.shutdown();
    },
  };
}
