import { Elysia } from "elysia";
import { type AuthenticationService, createAuthenticationMacro } from "@/modules/authentication";
import { FEEDBACK_HISTORY_DEFAULT_LIMIT } from "./feedback.constant";
import type { FeedbackSession } from "./feedback.contract";
import {
  feedbackHistoryQuerySchema,
  feedbackHistorySchema,
  feedbackSessionParamsSchema,
  feedbackSessionSchema,
  feedbackSessionStartSchema,
  feedbackSubmitSchema,
} from "./feedback.schema";
import type { FeedbackService } from "./feedback.service";

export function createFeedbackRoutes(service: FeedbackService, authentication: AuthenticationService) {
  return new Elysia({ name: "feedback.routes", prefix: "/v1/feedback" })
    .use(createAuthenticationMacro(authentication))
    .post(
      "/sessions",
      {
        auth: "identified",
        body: feedbackSessionStartSchema,
        response: feedbackSessionSchema,
        detail: { tags: ["Feedback"], summary: "Start a feedback session" },
      },
      async ({ body, user }) =>
        toFeedbackResponse(
          await service.session.create({
            focus_session_id: body.focus_session_id,
            user_id: user.id,
          }),
        ),
    )
    .get(
      "/sessions/:session_id",
      {
        auth: "identified",
        params: feedbackSessionParamsSchema,
        response: feedbackSessionSchema,
        detail: { tags: ["Feedback"], summary: "Get a feedback session" },
      },
      async ({ params, user }) => toFeedbackResponse(await service.session.get({ session_id: params.session_id, user_id: user.id })),
    )
    .post(
      "/sessions/:session_id/heartbeat",
      {
        auth: "identified",
        params: feedbackSessionParamsSchema,
        response: feedbackSessionSchema,
        detail: { tags: ["Feedback"], summary: "Refresh a feedback heartbeat" },
      },
      async ({ params, user }) => toFeedbackResponse(await service.session.heartbeat({ session_id: params.session_id, user_id: user.id })),
    )
    .post(
      "/sessions/:session_id/submit",
      {
        auth: "identified",
        params: feedbackSessionParamsSchema,
        body: feedbackSubmitSchema,
        response: { 202: feedbackSessionSchema },
        detail: { tags: ["Feedback"], summary: "Submit an audio explanation" },
      },
      async ({ body, params, set, user }) => {
        const bytes = new Uint8Array(await body.audio.arrayBuffer());
        const session = await service.session.submit({
          session_id: params.session_id,
          user_id: user.id,
          bytes,
          filename: body.audio.name || "explanation",
          media_type: mediaTypeFor(body.audio),
        });

        set.status = 202;
        set.headers["retry-after"] = "2";

        return toFeedbackResponse(session);
      },
    )
    .get(
      "/history",
      {
        auth: "identified",
        query: feedbackHistoryQuerySchema,
        response: feedbackHistorySchema,
        detail: { tags: ["Feedback"], summary: "Get feedback history" },
      },
      async ({ query, user }) => {
        const history = await service.history.search({
          user_id: user.id,
          limit: query.limit ?? FEEDBACK_HISTORY_DEFAULT_LIMIT,
          cursor: query.cursor ?? null,
        });

        return {
          feedback: history.feedback.map(toFeedbackResponse),
          next_cursor: history.next_cursor,
        };
      },
    );
}

function mediaTypeFor(file: File): string {
  const declared = file.type.split(";", 1)[0]?.trim();

  if (declared?.startsWith("audio/")) return declared;

  const extension = file.name.toLowerCase().split(".").at(-1);

  if (extension === "webm") return "audio/webm";
  if (["ogg", "oga", "opus"].includes(extension ?? "")) return "audio/ogg";
  if (["mp4", "m4a"].includes(extension ?? "")) return "audio/mp4";
  if (["mp3", "mpeg", "mpga"].includes(extension ?? "")) return "audio/mpeg";
  if (extension === "aac") return "audio/aac";
  if (extension === "wav") return "audio/wav";

  return "application/octet-stream";
}

function toFeedbackResponse(session: FeedbackSession) {
  return {
    id: session.id,
    focus_session_id: session.focus_session_id,
    randomization_id: session.randomization_id,
    status: session.status,
    subject: { slug: session.subject_slug, name: session.subject_name },
    topic: { slug: session.topic_slug, name: session.topic_name, level: session.topic_level },
    started_at: session.started_at.toISOString(),
    recording_ends_at: session.recording_ends_at.toISOString(),
    upload_ends_at: session.upload_ends_at.toISOString(),
    last_seen_at: session.last_seen_at.toISOString(),
    submitted_at: session.submitted_at?.toISOString() ?? null,
    completed_at: session.completed_at?.toISOString() ?? null,
    transcript: session.transcript,
    evaluation: session.evaluation,
    score_change:
      session.score_before !== null && session.score_after !== null && session.score_algorithm_version
        ? {
            subject_slug: session.subject_slug,
            before: session.score_before,
            after: session.score_after,
            delta: session.score_after - session.score_before,
            algorithm_version: session.score_algorithm_version,
          }
        : null,
    error_code: session.error_code,
    updated_at: session.updated_at.toISOString(),
  };
}
