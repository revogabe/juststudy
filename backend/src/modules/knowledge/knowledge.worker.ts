import { KNOWLEDGE_ASSESSMENT_BATCH_SIZE, KNOWLEDGE_ASSESSMENT_WORKER_INTERVAL_MS } from "./knowledge.constant";
import type { KnowledgeService } from "./knowledge.service";

export function createKnowledgeWorker(service: KnowledgeService, enabled: boolean) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let activeProcess: Promise<void> | null = null;

  async function run(): Promise<void> {
    try {
      await service.assessment.create(KNOWLEDGE_ASSESSMENT_BATCH_SIZE);
    } catch (error) {
      console.error("Knowledge assessment generation failed.", error);
    }
  }

  function process(): Promise<void> {
    if (activeProcess) return activeProcess;

    activeProcess = run().finally(() => {
      activeProcess = null;
    });

    return activeProcess;
  }

  return {
    start() {
      if (!enabled || timer) return;

      timer = setInterval(() => void process(), KNOWLEDGE_ASSESSMENT_WORKER_INTERVAL_MS);
      timer.unref();
      void process();
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
      await activeProcess;
    },
  };
}
