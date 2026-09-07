import { describe, expect, it } from "bun:test";
import type {
  FocusSessionCreate,
  FocusSessionRecord,
  FocusTerminalStatus,
} from "@/modules/focus/focus.contract";
import { createFocusService } from "@/modules/focus/focus.service";
import type { FocusStore } from "@/modules/focus/focus.store";
import type {
  RandomizationAttemptUpdate,
  TopicRandomizationRecord,
} from "@/modules/randomize/randomize.contract";

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const RANDOMIZATION_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_RANDOMIZATION_ID = "00000000-0000-4000-8000-000000000002";
const STARTED_AT = new Date("2026-09-07T10:00:00.000Z");

function randomizationRecord(
  id: string,
  status: TopicRandomizationRecord["status"] = "pending",
  userId = USER_ID,
): TopicRandomizationRecord {
  return {
    id,
    user_id: userId,
    subject_slug: "mathematics",
    topic_slug: `topic-${id.at(-1)}`,
    status,
    created_at: STARTED_AT,
    updated_at: STARTED_AT,
  };
}

function createFixture(input?: {
  randomizations?: TopicRandomizationRecord[];
  sessions?: FocusSessionRecord[];
}) {
  let currentTime = STARTED_AT;
  let nextSessionId = 16;
  const sessions = input?.sessions ?? [];
  const randomizations = new Map(
    (input?.randomizations ?? [randomizationRecord(RANDOMIZATION_ID)]).map((randomization) => [
      randomization.id,
      randomization,
    ]),
  );

  const store: FocusStore = {
    session: {
      async create(command: FocusSessionCreate) {
        const existing = sessions.find(
          (session) =>
            session.randomization_id === command.randomization_id &&
            session.user_id === command.user_id,
        );

        if (existing?.status === "active" && existing.duration_seconds === command.duration_seconds)
          return { result: "existing", session: existing } as const;
        if (
          sessions.some(
            (session) => session.user_id === command.user_id && session.status === "active",
          )
        )
          return { result: "active_conflict" } as const;

        const session: FocusSessionRecord = {
          id: `00000000-0000-4000-8000-${nextSessionId.toString().padStart(12, "0")}`,
          randomization_id: command.randomization_id,
          user_id: command.user_id,
          duration_seconds: command.duration_seconds,
          status: "active",
          started_at: command.started_at,
          ends_at: command.ends_at,
          last_seen_at: command.started_at,
          finished_at: null,
          randomization_synced_at: null,
          updated_at: command.started_at,
        };
        nextSessionId += 1;
        sessions.push(session);

        return { result: "created", session } as const;
      },
      async get(userId, sessionId) {
        return (
          sessions.find((session) => session.user_id === userId && session.id === sessionId) ?? null
        );
      },
      async getActive(userId) {
        return (
          sessions.find((session) => session.user_id === userId && session.status === "active") ??
          null
        );
      },
      async heartbeat(userId, sessionId, seenAt) {
        const session = sessions.find(
          (candidate) => candidate.user_id === userId && candidate.id === sessionId,
        );

        if (session?.status !== "active") return session ?? null;
        if (session.last_seen_at > seenAt) return session;

        session.last_seen_at = seenAt;
        session.updated_at = seenAt;

        return session;
      },
      async finish(command) {
        const session = sessions.find(
          (candidate) =>
            candidate.user_id === command.user_id && candidate.id === command.session_id,
        );

        if (session?.status !== "active") return session ?? null;
        if (
          command.expected_updated_at &&
          session.updated_at.getTime() !== command.expected_updated_at.getTime()
        )
          return session;

        session.status = command.status;
        session.finished_at = command.finished_at;
        session.randomization_synced_at = null;
        session.updated_at = command.finished_at;

        return session;
      },
      async markSynced(userId, sessionId, status: FocusTerminalStatus, syncedAt) {
        const session = sessions.find(
          (candidate) => candidate.user_id === userId && candidate.id === sessionId,
        );

        if (!session || session.status !== status) return session ?? null;

        session.randomization_synced_at = syncedAt;

        return session;
      },
    },
    history: {
      async search(query) {
        const ordered = sessions
          .filter((session) => session.user_id === query.user_id)
          .sort((left, right) => {
            const dateOrder = right.started_at.getTime() - left.started_at.getTime();

            return dateOrder || right.id.localeCompare(left.id);
          });
        const cursorIndex = query.cursor
          ? ordered.findIndex((session) => session.id === query.cursor)
          : -1;

        if (query.cursor && cursorIndex === -1) return { sessions: [], next_cursor: null };

        const available = ordered.slice(cursorIndex + 1);
        const page = available.slice(0, query.limit);

        return {
          sessions: page,
          next_cursor: available.length > query.limit ? (page.at(-1)?.id ?? null) : null,
        };
      },
    },
    dueSession: {
      async search(now) {
        const inactiveBefore = now.getTime() - 120_000;

        return sessions.filter(
          (session) =>
            session.status === "active" &&
            (session.ends_at <= now || session.last_seen_at.getTime() <= inactiveBefore),
        );
      },
    },
    unsyncedSession: {
      async search() {
        return sessions.filter(
          (session) => session.status !== "active" && !session.randomization_synced_at,
        );
      },
    },
  };

  const randomize = {
    attempt: {
      async get(query: { id: string; user_id: string }) {
        const randomization = randomizations.get(query.id);

        return randomization?.user_id === query.user_id ? randomization : null;
      },
      async search(query: { ids: string[]; user_id: string }) {
        return query.ids.flatMap((id) => {
          const randomization = randomizations.get(id);

          if (!randomization || randomization.user_id !== query.user_id) return [];

          return [
            {
              id: randomization.id,
              subject: {
                slug: randomization.subject_slug,
                name: `${randomization.subject_slug} name`,
              },
              topic: {
                slug: randomization.topic_slug,
                name: `${randomization.topic_slug} name`,
                level: "beginner" as const,
              },
              status: randomization.status,
              created_at: randomization.created_at,
              updated_at: randomization.updated_at,
            },
          ];
        });
      },
      async update(command: RandomizationAttemptUpdate) {
        const randomization = randomizations.get(command.id);

        if (!randomization || randomization.user_id !== command.user_id) return null;

        if (randomization.status === "pending") {
          randomization.status = command.status;
          randomization.updated_at = command.updated_at;
        }

        return randomization;
      },
    },
  };
  const service = createFocusService({ store, randomize, now: () => currentTime });

  return {
    service,
    sessions,
    randomizations,
    setNow(value: string) {
      currentTime = new Date(value);
    },
  };
}

describe("focus service", () => {
  it("starts a focus session and makes an identical retry idempotent", async () => {
    const fixture = createFixture();
    const command = {
      user_id: USER_ID,
      randomization_id: RANDOMIZATION_ID,
      duration_seconds: 3600,
    };
    const created = await fixture.service.session.create(command);
    const retried = await fixture.service.session.create(command);

    expect(created).toMatchObject({
      randomization_id: RANDOMIZATION_ID,
      duration_seconds: 3600,
      status: "active",
      started_at: STARTED_AT,
      ends_at: new Date("2026-09-07T11:00:00.000Z"),
    });
    expect(retried.id).toBe(created.id);
    expect(fixture.sessions).toHaveLength(1);
  });

  it("rejects invalid durations, unavailable randomizations, and concurrent sessions", async () => {
    const fixture = createFixture({
      randomizations: [
        randomizationRecord(RANDOMIZATION_ID),
        randomizationRecord(SECOND_RANDOMIZATION_ID, "completed"),
      ],
    });

    await expect(
      fixture.service.session.create({
        user_id: USER_ID,
        randomization_id: RANDOMIZATION_ID,
        duration_seconds: 59,
      }),
    ).rejects.toMatchObject({ code: "FOCUS_DURATION_INVALID", status: 422 });
    await expect(
      fixture.service.session.create({
        user_id: USER_ID,
        randomization_id: RANDOMIZATION_ID,
        duration_seconds: 14_401,
      }),
    ).rejects.toMatchObject({ code: "FOCUS_DURATION_INVALID", status: 422 });
    await expect(
      fixture.service.session.create({
        user_id: USER_ID,
        randomization_id: "00000000-0000-4000-8000-000000000099",
        duration_seconds: 3600,
      }),
    ).rejects.toMatchObject({ code: "FOCUS_RANDOMIZATION_NOT_FOUND", status: 404 });
    await expect(
      fixture.service.session.create({
        user_id: USER_ID,
        randomization_id: SECOND_RANDOMIZATION_ID,
        duration_seconds: 3600,
      }),
    ).rejects.toMatchObject({ code: "FOCUS_RANDOMIZATION_UNAVAILABLE", status: 409 });

    await fixture.service.session.create({
      user_id: USER_ID,
      randomization_id: RANDOMIZATION_ID,
      duration_seconds: 3600,
    });
    await expect(
      fixture.service.session.create({
        user_id: USER_ID,
        randomization_id: SECOND_RANDOMIZATION_ID,
        duration_seconds: 3600,
      }),
    ).rejects.toMatchObject({ code: "FOCUS_SESSION_ACTIVE", status: 409 });
  });

  it("allows early completion and mirrors it idempotently to randomize", async () => {
    const fixture = createFixture();
    const session = await fixture.service.session.create({
      user_id: USER_ID,
      randomization_id: RANDOMIZATION_ID,
      duration_seconds: 3600,
    });
    fixture.setNow("2026-09-07T10:00:30.000Z");

    const completed = await fixture.service.session.complete({
      user_id: USER_ID,
      session_id: session.id,
    });
    const repeated = await fixture.service.session.complete({
      user_id: USER_ID,
      session_id: session.id,
    });

    expect(completed.status).toBe("completed");
    expect(completed.finished_at).toEqual(new Date("2026-09-07T10:00:30.000Z"));
    expect(repeated.status).toBe("completed");
    expect(fixture.randomizations.get(RANDOMIZATION_ID)?.status).toBe("completed");
    await expect(
      fixture.service.session.abandon({ user_id: USER_ID, session_id: session.id }),
    ).rejects.toMatchObject({
      code: "FOCUS_SESSION_STATE_CONFLICT",
      status: 409,
    });
  });

  it("refreshes presence and abandons after two minutes without a heartbeat", async () => {
    const fixture = createFixture();
    const session = await fixture.service.session.create({
      user_id: USER_ID,
      randomization_id: RANDOMIZATION_ID,
      duration_seconds: 3600,
    });
    fixture.setNow("2026-09-07T10:00:30.000Z");

    const heartbeat = await fixture.service.session.heartbeat({
      user_id: USER_ID,
      session_id: session.id,
    });

    expect(heartbeat.last_seen_at).toEqual(new Date("2026-09-07T10:00:30.000Z"));

    fixture.setNow("2026-09-07T10:02:31.000Z");

    const abandoned = await fixture.service.session.heartbeat({
      user_id: USER_ID,
      session_id: session.id,
    });

    expect(abandoned.status).toBe("abandoned");
    expect(fixture.randomizations.get(RANDOMIZATION_ID)?.status).toBe("abandoned");
  });

  it("uses the first deadline and expires due sessions", async () => {
    const completionFixture = createFixture();
    const shortSession = await completionFixture.service.session.create({
      user_id: USER_ID,
      randomization_id: RANDOMIZATION_ID,
      duration_seconds: 60,
    });
    completionFixture.setNow("2026-09-07T10:02:01.000Z");

    expect(await completionFixture.service.session.expire()).toBe(1);
    expect(
      completionFixture.sessions.find((session) => session.id === shortSession.id)?.status,
    ).toBe("completed");

    const abandonmentFixture = createFixture();
    await abandonmentFixture.service.session.create({
      user_id: USER_ID,
      randomization_id: RANDOMIZATION_ID,
      duration_seconds: 3600,
    });
    abandonmentFixture.setNow("2026-09-07T10:02:01.000Z");

    expect(await abandonmentFixture.service.session.expire()).toBe(1);
    expect(abandonmentFixture.sessions[0]?.status).toBe("abandoned");
  });

  it("does not expose another user's session", async () => {
    const fixture = createFixture();
    const session = await fixture.service.session.create({
      user_id: USER_ID,
      randomization_id: RANDOMIZATION_ID,
      duration_seconds: 3600,
    });

    await expect(
      fixture.service.session.heartbeat({
        user_id: OTHER_USER_ID,
        session_id: session.id,
      }),
    ).rejects.toMatchObject({ code: "FOCUS_SESSION_NOT_FOUND", status: 404 });
  });

  it("returns cursor-paginated session history with durations and studied topics", async () => {
    const fixture = createFixture({
      randomizations: [
        randomizationRecord(RANDOMIZATION_ID),
        randomizationRecord(SECOND_RANDOMIZATION_ID),
      ],
    });
    const first = await fixture.service.session.create({
      user_id: USER_ID,
      randomization_id: RANDOMIZATION_ID,
      duration_seconds: 1800,
    });
    fixture.setNow("2026-09-07T10:00:30.000Z");
    await fixture.service.session.complete({ user_id: USER_ID, session_id: first.id });
    fixture.setNow("2026-09-07T10:01:00.000Z");
    const second = await fixture.service.session.create({
      user_id: USER_ID,
      randomization_id: SECOND_RANDOMIZATION_ID,
      duration_seconds: 3600,
    });

    const firstPage = await fixture.service.history.search({
      user_id: USER_ID,
      limit: 1,
      cursor: null,
    });
    const secondPage = await fixture.service.history.search({
      user_id: USER_ID,
      limit: 1,
      cursor: firstPage.next_cursor,
    });
    const otherUserHistory = await fixture.service.history.search({
      user_id: OTHER_USER_ID,
      limit: 20,
      cursor: null,
    });

    expect(firstPage.sessions).toEqual([
      expect.objectContaining({
        id: second.id,
        duration_seconds: 3600,
        subject: { slug: "mathematics", name: "mathematics name" },
        topic: { slug: "topic-2", name: "topic-2 name", level: "beginner" },
      }),
    ]);
    expect(firstPage.next_cursor).toBe(second.id);
    expect(secondPage.sessions).toEqual([
      expect.objectContaining({
        id: first.id,
        duration_seconds: 1800,
        status: "completed",
        topic: expect.objectContaining({ slug: "topic-1" }),
      }),
    ]);
    expect(secondPage.next_cursor).toBeNull();
    expect(otherUserHistory).toEqual({ sessions: [], next_cursor: null });
  });

  it("repairs a terminal session that was not synchronized with randomize", async () => {
    const terminalSession: FocusSessionRecord = {
      id: "00000000-0000-4000-8000-000000000020",
      randomization_id: RANDOMIZATION_ID,
      user_id: USER_ID,
      duration_seconds: 3600,
      status: "completed",
      started_at: STARTED_AT,
      ends_at: new Date("2026-09-07T11:00:00.000Z"),
      last_seen_at: STARTED_AT,
      finished_at: new Date("2026-09-07T10:30:00.000Z"),
      randomization_synced_at: null,
      updated_at: new Date("2026-09-07T10:30:00.000Z"),
    };
    const fixture = createFixture({ sessions: [terminalSession] });
    fixture.setNow("2026-09-07T10:30:01.000Z");

    expect(await fixture.service.session.expire()).toBe(0);
    expect(fixture.randomizations.get(RANDOMIZATION_ID)?.status).toBe("completed");
    expect(terminalSession.randomization_synced_at).toEqual(new Date("2026-09-07T10:30:01.000Z"));
  });
});
