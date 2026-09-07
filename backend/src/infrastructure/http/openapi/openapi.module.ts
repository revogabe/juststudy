import { openapi } from "@elysiajs/openapi";

export function createOpenApiModule() {
  return openapi({
    path: "/docs",
    specPath: "/openapi.json",
    documentation: {
      info: {
        title: "JustStudy API",
        version: "1.0.0",
        description: "Authentication and billing for JustStudy.",
      },
      tags: [
        { name: "Health", description: "Process health." },
        { name: "Authentication", description: "Identity and sessions." },
        { name: "Billing", description: "Plans, checkout, and customer portal." },
        { name: "Webhooks", description: "Signed provider events." },
      ],
    },
  });
}
