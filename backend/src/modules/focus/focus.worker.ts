import type { FocusService } from "./focus.service";

export function createFocusWorker(service: FocusService) {
  let job: Bun.CronJob | null = null;
  let activeReconciliation: Promise<void> | null = null;

  async function expireSessions(): Promise<void> {
    try {
      await service.session.expire();
    } catch (error) {
      console.error("Focus session reconciliation failed.", error);
    }
  }

  function reconcile(): Promise<void> {
    if (activeReconciliation) return activeReconciliation;

    activeReconciliation = expireSessions().finally(() => {
      activeReconciliation = null;
    });

    return activeReconciliation;
  }

  return {
    start() {
      if (job) return;

      void reconcile();
      job = Bun.cron("* * * * *", reconcile).unref();
    },
    async stop() {
      job?.stop();
      job = null;
      await activeReconciliation;
    },
  };
}

export type FocusWorker = ReturnType<typeof createFocusWorker>;
