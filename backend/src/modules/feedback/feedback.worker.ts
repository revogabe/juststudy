import { FEEDBACK_WORKER_INTERVAL_MS } from "./feedback.constant";
import type { FeedbackService } from "./feedback.service";

export function createFeedbackWorker(service: FeedbackService) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let activeProcess: Promise<void> | null = null;

  async function run(): Promise<void> {
    try {
      await service.job.process();
    } catch (error) {
      console.error("Feedback processing failed.", error);
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
      if (timer) return;

      timer = setInterval(() => void process(), FEEDBACK_WORKER_INTERVAL_MS);
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
