import { Elysia } from "elysia";
import { type AuthenticationService, createAuthenticationMacro } from "@/modules/authentication";
import type { FocusHistorySession, FocusSession } from "./focus.contract";
import {
  activeFocusSessionSchema,
  focusHistoryQuerySchema,
  focusHistorySchema,
  focusSessionCreateSchema,
  focusSessionParamsSchema,
  focusSessionSchema,
} from "./focus.schema";
import type { FocusService } from "./focus.service";

const HISTORY_DEFAULT_LIMIT = 20;

export function createFocusRoutes(service: FocusService, authentication: AuthenticationService) {
  return new Elysia({ name: "focus.routes", prefix: "/v1/focus" })
    .use(createAuthenticationMacro(authentication))
    .post(
      "/sessions",
      {
        auth: "session",
        body: focusSessionCreateSchema,
        response: focusSessionSchema,
        detail: { tags: ["Focus"], summary: "Start a focus session" },
      },
      async ({ body, user }) =>
        toFocusSessionResponse(
          await service.session.create({
            user_id: user.id,
            randomization_id: body.randomization_id,
            duration_seconds: body.duration_seconds,
          }),
        ),
    )
    .get(
      "/sessions/active",
      {
        auth: "session",
        response: activeFocusSessionSchema,
        detail: { tags: ["Focus"], summary: "Get the active focus session" },
      },
      async ({ user }) => {
        const session = await service.session.getActive(user.id);

        return { session: session ? toFocusSessionResponse(session) : null };
      },
    )
    .get(
      "/sessions/history",
      {
        auth: "session",
        query: focusHistoryQuerySchema,
        response: focusHistorySchema,
        detail: { tags: ["Focus"], summary: "Get the focus session history" },
      },
      async ({ query, user }) => {
        const history = await service.history.search({
          user_id: user.id,
          limit: query.limit ?? HISTORY_DEFAULT_LIMIT,
          cursor: query.cursor ?? null,
        });

        return {
          sessions: history.sessions.map(toFocusHistoryResponse),
          next_cursor: history.next_cursor,
        };
      },
    )
    .post(
      "/sessions/:session_id/heartbeat",
      {
        auth: "session",
        params: focusSessionParamsSchema,
        response: focusSessionSchema,
        detail: { tags: ["Focus"], summary: "Refresh a focus session heartbeat" },
      },
      async ({ params, user }) =>
        toFocusSessionResponse(
          await service.session.heartbeat({
            user_id: user.id,
            session_id: params.session_id,
          }),
        ),
    )
    .post(
      "/sessions/:session_id/complete",
      {
        auth: "session",
        params: focusSessionParamsSchema,
        response: focusSessionSchema,
        detail: { tags: ["Focus"], summary: "Complete a focus session" },
      },
      async ({ params, user }) =>
        toFocusSessionResponse(
          await service.session.complete({
            user_id: user.id,
            session_id: params.session_id,
          }),
        ),
    )
    .post(
      "/sessions/:session_id/abandon",
      {
        auth: "session",
        params: focusSessionParamsSchema,
        response: focusSessionSchema,
        detail: { tags: ["Focus"], summary: "Abandon a focus session" },
      },
      async ({ params, user }) =>
        toFocusSessionResponse(
          await service.session.abandon({
            user_id: user.id,
            session_id: params.session_id,
          }),
        ),
    );
}

function toFocusHistoryResponse(session: FocusHistorySession) {
  return {
    ...toFocusSessionResponse(session),
    subject: session.subject,
    topic: session.topic,
  };
}

function toFocusSessionResponse(session: FocusSession) {
  return {
    ...session,
    started_at: session.started_at.toISOString(),
    ends_at: session.ends_at.toISOString(),
    last_seen_at: session.last_seen_at.toISOString(),
    finished_at: session.finished_at?.toISOString() ?? null,
    updated_at: session.updated_at.toISOString(),
  };
}
