import type { RandomizeService } from "@/modules/randomize";
import type {
  FocusHistoryPage,
  FocusHistoryQuery,
  FocusSession,
  FocusSessionCommand,
  FocusSessionRecord,
  FocusSessionStartCommand,
  FocusTerminalStatus,
} from "./focus.contract";
import { focusError } from "./focus.error";
import { focusDeadlineRule, focusDurationRule } from "./focus.rule";
import type { FocusStore } from "./focus.store";

type FocusRandomize = Pick<RandomizeService, "attempt">;

type FocusServiceInput = {
  store: FocusStore;
  randomize: FocusRandomize;
  now?: () => Date;
};

export function createFocusService(input: FocusServiceInput) {
  const now = input.now ?? (() => new Date());

  async function finish(
    command: FocusSessionCommand,
    status: FocusTerminalStatus,
  ): Promise<FocusSession> {
    const current = await getSession(input.store, command);
    const reconciled = await reconcileSession(input, current, now());

    if (reconciled.status === status)
      return toFocusSession(await synchronizeSession(input, reconciled, now()));
    if (reconciled.status !== "active") {
      await synchronizeSession(input, reconciled, now());
      throw focusError.stateConflict();
    }

    const session = await input.store.session.finish({
      ...command,
      status,
      finished_at: now(),
    });

    if (!session) throw focusError.sessionNotFound();
    if (session.status !== status) {
      if (session.status !== "active") await synchronizeSession(input, session, now());

      throw focusError.stateConflict();
    }

    return toFocusSession(await synchronizeSession(input, session, now()));
  }

  return {
    session: {
      async create(command: FocusSessionStartCommand): Promise<FocusSession> {
        const durationSeconds = focusDurationRule.validate(command.duration_seconds);
        const active = await input.store.session.getActive(command.user_id);

        if (active) {
          const reconciled = await reconcileSession(input, active, now());

          if (reconciled.status === "active") {
            if (
              reconciled.randomization_id === command.randomization_id &&
              reconciled.duration_seconds === durationSeconds
            )
              return toFocusSession(reconciled);

            throw focusError.activeSession();
          }
        }

        const randomization = await input.randomize.attempt.get({
          id: command.randomization_id,
          user_id: command.user_id,
        });

        if (!randomization) throw focusError.randomizationNotFound();
        if (randomization.status !== "pending") throw focusError.randomizationUnavailable();

        const startedAt = now();
        const result = await input.store.session.create({
          ...command,
          duration_seconds: durationSeconds,
          started_at: startedAt,
          ends_at: new Date(startedAt.getTime() + durationSeconds * 1000),
        });

        if (result.result === "randomization_unavailable")
          throw focusError.randomizationUnavailable();
        if (result.result === "active_conflict") throw focusError.activeSession();

        return toFocusSession(result.session);
      },
      async getActive(userId: string): Promise<FocusSession | null> {
        const active = await input.store.session.getActive(userId);

        if (!active) return null;

        const session = await reconcileSession(input, active, now());

        return session.status === "active" ? toFocusSession(session) : null;
      },
      async heartbeat(command: FocusSessionCommand): Promise<FocusSession> {
        const current = await getSession(input.store, command);
        const seenAt = now();
        const reconciled = await reconcileSession(input, current, seenAt);

        if (reconciled.status !== "active") return toFocusSession(reconciled);

        const session = await input.store.session.heartbeat(
          command.user_id,
          command.session_id,
          seenAt,
        );

        if (!session) throw focusError.sessionNotFound();

        if (session.status !== "active")
          return toFocusSession(await synchronizeSession(input, session, now()));

        return toFocusSession(session);
      },
      complete(command: FocusSessionCommand): Promise<FocusSession> {
        return finish(command, "completed");
      },
      abandon(command: FocusSessionCommand): Promise<FocusSession> {
        return finish(command, "abandoned");
      },
      async expire(): Promise<number> {
        const checkedAt = now();
        const dueSessions = await input.store.dueSession.search(checkedAt);
        let finishedCount = 0;

        for (const dueSession of dueSessions) {
          const session = await reconcileSession(input, dueSession, checkedAt);

          if (session.status !== "active") finishedCount += 1;
        }

        const unsyncedSessions = await input.store.unsyncedSession.search();

        for (const unsyncedSession of unsyncedSessions)
          await synchronizeSession(input, unsyncedSession, now());

        return finishedCount;
      },
    },
    history: {
      async search(query: FocusHistoryQuery): Promise<FocusHistoryPage> {
        const active = await input.store.session.getActive(query.user_id);

        if (active) await reconcileSession(input, active, now());

        const history = await input.store.history.search(query);
        const randomizations = await input.randomize.attempt.search({
          user_id: query.user_id,
          ids: history.sessions.map((session) => session.randomization_id),
        });
        const randomizationsById = new Map(
          randomizations.map((randomization) => [randomization.id, randomization]),
        );

        return {
          sessions: history.sessions.map((session) => {
            const randomization = randomizationsById.get(session.randomization_id);

            if (!randomization)
              throw new Error(`Randomization missing for focus session ${session.id}.`);

            return {
              ...toFocusSession(session),
              subject: randomization.subject,
              topic: randomization.topic,
            };
          }),
          next_cursor: history.next_cursor,
        };
      },
    },
  };
}

async function getSession(
  store: FocusStore,
  command: FocusSessionCommand,
): Promise<FocusSessionRecord> {
  const session = await store.session.get(command.user_id, command.session_id);

  if (!session) throw focusError.sessionNotFound();

  return session;
}

async function reconcileSession(
  input: FocusServiceInput,
  session: FocusSessionRecord,
  now: Date,
): Promise<FocusSessionRecord> {
  const status = focusDeadlineRule.resolve(session, now);

  if (!status || session.status !== "active")
    return session.status === "active" ? session : synchronizeSession(input, session, now);

  const reconciled = await input.store.session.finish({
    session_id: session.id,
    user_id: session.user_id,
    status,
    finished_at: now,
    expected_updated_at: session.updated_at,
  });

  if (!reconciled) throw focusError.sessionNotFound();
  if (reconciled.status === "active") return reconciled;

  return synchronizeSession(input, reconciled, now);
}

async function synchronizeSession(
  input: FocusServiceInput,
  session: FocusSessionRecord,
  now: Date,
): Promise<FocusSessionRecord> {
  if (session.status === "active" || session.randomization_synced_at) return session;

  const randomization = await input.randomize.attempt.update({
    id: session.randomization_id,
    user_id: session.user_id,
    status: session.status,
    updated_at: session.finished_at ?? now,
  });

  if (!randomization) throw focusError.randomizationNotFound();
  if (randomization.status !== session.status) throw focusError.stateConflict();

  const synchronized = await input.store.session.markSynced(
    session.user_id,
    session.id,
    session.status,
    now,
  );

  if (!synchronized) throw focusError.sessionNotFound();

  return synchronized;
}

function toFocusSession(session: FocusSessionRecord): FocusSession {
  const { randomization_synced_at: _, user_id: __, ...focusSession } = session;

  return focusSession;
}

export type FocusService = ReturnType<typeof createFocusService>;
