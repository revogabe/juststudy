import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { Webhook } from "standardwebhooks";
import { createApplication } from "@/app/app";
import { createEnvironment } from "@/app/env";
import { createDatabase } from "@/infrastructure/database";
import type { Ai } from "@/integrations/ai";
import { createEmail, createMemoryAdapter } from "@/integrations/email";
import { createBetterAuthAdapter } from "@/integrations/identity";
import { createPolarAdapter } from "@/integrations/payments";
import type { Prompts } from "@/integrations/prompts";
import { authenticationSchema } from "@/modules/authentication";
import { accounts, sessions, users, verifications } from "@/modules/authentication/authentication.model";
import { payment_events, subscriptions } from "@/modules/billing/billing.model";
import { feedback_sessions, feedback_shadow_reviews } from "@/modules/feedback/feedback.model";
import { feedbackEvaluationRule } from "@/modules/feedback/feedback.rule";
import { createFeedbackStore } from "@/modules/feedback/feedback.store";
import { focus_sessions } from "@/modules/focus/focus.model";
import type {
  KnowledgeCatalogUpdate,
  KnowledgeLevel,
  KnowledgeSubjectSummary,
  KnowledgeTopicInput,
} from "@/modules/knowledge/knowledge.contract";
import { knowledge_subjects, knowledge_topic_assessments, knowledge_topics } from "@/modules/knowledge/knowledge.model";
import { createKnowledgeStore } from "@/modules/knowledge/store/knowledge.store";
import { topic_randomizations } from "@/modules/randomize/randomize.model";
import { score_events } from "@/modules/score/score.model";
import { createScoreStore } from "@/modules/score/score.store";

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === "true";

function databaseSuite() {
  if (runDatabaseTests) return describe;

  return describe.skip;
}

const databaseDescribe = databaseSuite();
const CREATED_AT = "2026-09-01T00:00:00.000Z";
const PRODUCT_ID = "product-student";
const WEBHOOK_SECRET = "juststudy-test-webhook-secret";
const KNOWLEDGE_CATALOG_TOKEN = "test-knowledge-catalog-token-32-characters";

const environment = createEnvironment({
  APP_ENV: "test",
  APP_BASE_URL: "http://localhost:3000",
  APP_WEB_URL: "http://localhost:3001",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://juststudy:juststudy@127.0.0.1:5432/juststudy_test",
  KNOWLEDGE_CATALOG_TOKEN,
  AUTH_SECRET: "test-secret-with-at-least-32-characters",
  EMAIL_PROVIDER: "memory",
  POLAR_WEBHOOK_SECRET: WEBHOOK_SECRET,
  POLAR_PRODUCT_ID: PRODUCT_ID,
});
const database = createDatabase(environment.DATABASE_URL);
const email = createEmail(createMemoryAdapter());
const identity = createBetterAuthAdapter({
  base_url: environment.APP_BASE_URL,
  secret: environment.AUTH_SECRET,
  trusted_origins: [environment.APP_WEB_URL],
  google_client_id: "test-google-client",
  google_client_secret: "test-google-secret",
  database: database.client,
  schema: authenticationSchema,
  email,
});
const payments = createPolarAdapter({
  access_token: "",
  server: "sandbox",
  webhook_secret: WEBHOOK_SECRET,
  product_id: PRODUCT_ID,
  success_url: "http://localhost:3001/billing/success",
  return_url: "http://localhost:3001/settings/billing",
});
const transcription = {
  transcript: {
    async create() {
      return {
        text: "A força resultante produz aceleração proporcional e depende da massa.",
        language: "pt",
        language_probability: 0.99,
        duration_seconds: 8,
        model: "test-whisper",
        segments: [
          {
            id: "seg_1",
            start_ms: 0,
            end_ms: 8_000,
            text: "A força resultante produz aceleração proporcional e depende da massa.",
          },
        ],
      };
    },
  },
};
const ai: Ai = {
  structured: {
    async create() {
      throw new Error("AI is not configured in this suite.");
    },
  },
};
const prompts: Prompts = {
  text: {
    async get() {
      return { text: "Test prompt", version: "test-v1" };
    },
  },
};
const observability = { async shutdown() {} };
const application = createApplication({
  environment,
  dependencies: {
    database,
    email,
    identity,
    payments,
    transcription,
    ai,
    shadow_ai: ai,
    decisions: null,
    prompts,
    observability,
  },
});

function request(path: string, init?: RequestInit): Promise<Response> {
  return application.handle(new Request(`http://localhost:3000${path}`, init));
}

function sessionCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";")[0];

  if (!cookie) throw new Error("Authentication response did not set a session cookie.");

  return cookie;
}

function customerState(userId: string) {
  return {
    type: "customer.state_changed",
    timestamp: CREATED_AT,
    data: {
      id: `customer-${userId}`,
      created_at: CREATED_AT,
      modified_at: null,
      metadata: {},
      external_id: userId,
      email: "learner@juststudy.test",
      email_verified: true,
      type: "individual",
      name: "Learner",
      billing_address: null,
      tax_id: null,
      organization_id: "organization-1",
      deleted_at: null,
      avatar_url: "https://example.test/avatar.png",
      active_subscriptions: [
        {
          id: `subscription-${userId}`,
          created_at: CREATED_AT,
          modified_at: null,
          metadata: {},
          status: "active",
          amount: 1990,
          currency: "usd",
          recurring_interval: "month",
          current_period_start: CREATED_AT,
          current_period_end: "2026-10-01T00:00:00.000Z",
          cancel_at_period_end: false,
          canceled_at: null,
          started_at: CREATED_AT,
          ends_at: null,
          product_id: PRODUCT_ID,
          discount_id: null,
          trial_start: null,
          trial_end: null,
          meters: [],
        },
      ],
      granted_benefits: [],
      active_meters: [
        {
          id: `meter-${userId}`,
          created_at: CREATED_AT,
          modified_at: null,
          meter_id: "meter-ai-credits",
          consumed_units: 125,
          credited_units: 1000,
          balance: 875,
        },
      ],
    },
  };
}

function signedWebhook(payload: unknown): RequestInit {
  const body = JSON.stringify(payload);
  const messageId = Bun.randomUUIDv7();
  const timestamp = new Date();
  const webhook = new Webhook(Buffer.from(WEBHOOK_SECRET, "utf-8").toString("base64"));

  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": messageId,
      "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
      "webhook-signature": webhook.sign(messageId, timestamp, body),
    },
    body,
  };
}

function knowledgeTopics(prefix: string, distribution: Record<KnowledgeLevel, number>): KnowledgeTopicInput[] {
  const topics: KnowledgeTopicInput[] = [];

  for (const [level, count] of Object.entries(distribution)) {
    for (let index = 1; index <= count; index += 1) {
      topics.push({
        slug: `${prefix}-${level}-${index}`,
        name: `${prefix} ${level} ${index}`,
        level: level as KnowledgeLevel,
      });
    }
  }

  return topics;
}

function updateKnowledgeCatalog(body: KnowledgeCatalogUpdate, token = KNOWLEDGE_CATALOG_TOKEN) {
  return request("/v1/knowledge/catalog", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function randomizeTopic(cookie: string, body: { subject_slug?: string } = {}) {
  return request("/v1/randomize/topic", {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function startFocusSession(cookie: string, body: { randomization_id: string; duration_seconds: number }) {
  return request("/v1/focus/sessions", {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function cleanKnowledgeTestData(): Promise<void> {
  await database.client.delete(knowledge_topics).where(eq(knowledge_topics.subject_slug, "testing-science"));
  await database.client.delete(knowledge_subjects).where(eq(knowledge_subjects.slug, "testing-science"));
}

async function cleanDatabase(): Promise<void> {
  await database.client.delete(knowledge_topic_assessments);
  await database.client.delete(focus_sessions);
  await database.client.delete(topic_randomizations);
  await cleanKnowledgeTestData();
  await database.client.delete(payment_events);
  await database.client.delete(subscriptions);
  await database.client.delete(sessions);
  await database.client.delete(accounts);
  await database.client.delete(verifications);
  await database.client.delete(users);
}

databaseDescribe("JustStudy HTTP API", () => {
  beforeAll(cleanDatabase);

  afterAll(async () => {
    await cleanDatabase();
    await database.connection.close();
  });

  it("serves health and OpenAPI", async () => {
    const health = await request("/health");
    const specification = await request("/openapi.json");

    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    expect(specification.status).toBe(200);
  });

  it("exposes only public knowledge subjects", async () => {
    const response = await request("/v1/knowledge/subjects");
    const specificationResponse = await request("/openapi.json");
    const body = (await response.json()) as { subjects: KnowledgeSubjectSummary[] };
    const specification = (await specificationResponse.json()) as {
      paths: Record<string, unknown>;
    };
    const mathematics = body.subjects.find((subject) => subject.slug === "mathematics");

    expect(response.status).toBe(200);
    expect(body.subjects).toHaveLength(30);
    expect(body.subjects.reduce((total, subject) => total + subject.topic_count, 0)).toBe(3000);
    expect(mathematics).toEqual({
      slug: "mathematics",
      name: "Mathematics",
      topic_count: 100,
      level_counts: { beginner: 15, intermediate: 35, advanced: 30, specialist: 20 },
    });
    expect(Object.keys(specification.paths).some((path) => path.includes("/topics"))).toBe(false);
  });

  it("protects catalog updates with the operational bearer token", async () => {
    const missingToken = await request("/v1/knowledge/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const wrongToken = await updateKnowledgeCatalog({}, "wrong-knowledge-catalog-token-32-characters");

    expect(missingToken.status).toBe(401);
    expect(await missingToken.json()).toMatchObject({ code: "KNOWLEDGE_CATALOG_UNAUTHORIZED" });
    expect(wrongToken.status).toBe(401);
  });

  it("adds balanced catalog groups atomically and replays them idempotently", async () => {
    const subjectTopics = knowledgeTopics("subject", {
      beginner: 15,
      intermediate: 35,
      advanced: 30,
      specialist: 20,
    });
    const subjectCommand: KnowledgeCatalogUpdate = {
      subjects: [
        {
          slug: "testing-science",
          name: "Testing Science",
          topics: subjectTopics,
        },
      ],
    };
    const creation = await updateKnowledgeCatalog(subjectCommand);
    const replay = await updateKnowledgeCatalog(subjectCommand);
    const expansionTopics = knowledgeTopics("expansion", {
      beginner: 3,
      intermediate: 7,
      advanced: 6,
      specialist: 4,
    });
    const expansion = await updateKnowledgeCatalog({
      topic_batches: [{ subject_slug: "testing-science", topics: expansionTopics }],
    });
    const partialOverlap = knowledgeTopics("conflict", {
      beginner: 3,
      intermediate: 7,
      advanced: 6,
      specialist: 4,
    });
    partialOverlap[0] = expansionTopics[0] as KnowledgeTopicInput;
    const conflict = await updateKnowledgeCatalog({
      topic_batches: [{ subject_slug: "testing-science", topics: partialOverlap }],
    });
    const storedTopics = await database.client
      .select({ slug: knowledge_topics.slug })
      .from(knowledge_topics)
      .where(eq(knowledge_topics.subject_slug, "testing-science"));

    expect(await creation.json()).toEqual({
      subjects_created: 1,
      subjects_skipped: 0,
      topics_created: 100,
      topics_skipped: 0,
    });
    expect(await replay.json()).toEqual({
      subjects_created: 0,
      subjects_skipped: 1,
      topics_created: 0,
      topics_skipped: 100,
    });
    expect(await expansion.json()).toMatchObject({ topics_created: 20, topics_skipped: 0 });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ code: "KNOWLEDGE_CATALOG_CONFLICT" });
    expect(storedTopics).toHaveLength(120);
  });

  it("rejects unbalanced updates and unknown subjects", async () => {
    const unbalanced = await updateKnowledgeCatalog({
      topic_batches: [
        {
          subject_slug: "mathematics",
          topics: knowledgeTopics("unbalanced", {
            beginner: 4,
            intermediate: 7,
            advanced: 5,
            specialist: 4,
          }),
        },
      ],
    });
    const unknownSubject = await updateKnowledgeCatalog({
      topic_batches: [
        {
          subject_slug: "unknown-subject",
          topics: knowledgeTopics("unknown", {
            beginner: 3,
            intermediate: 7,
            advanced: 6,
            specialist: 4,
          }),
        },
      ],
    });

    expect(unbalanced.status).toBe(422);
    expect(await unbalanced.json()).toMatchObject({ code: "KNOWLEDGE_CATALOG_UNBALANCED" });
    expect(unknownSubject.status).toBe(422);
  });

  it("creates an anonymous session and protects identified operations", async () => {
    const authentication = await request("/v1/auth/anonymous", {
      method: "POST",
    });
    const cookie = sessionCookie(authentication);
    const session = await request("/v1/auth/session", {
      headers: { cookie },
    });
    const checkout = await request("/v1/billing/checkout", {
      method: "POST",
      headers: { cookie },
    });

    expect(authentication.status).toBe(200);
    expect(await session.json()).toMatchObject({
      user: { is_anonymous: true },
    });
    expect(checkout.status).toBe(403);
  });

  it("randomizes topics for sessions and isolates cursor-paginated history", async () => {
    const unauthenticated = await request("/v1/randomize/topic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const firstAuthentication = await request("/v1/auth/anonymous", { method: "POST" });
    const secondAuthentication = await request("/v1/auth/anonymous", { method: "POST" });
    const firstCookie = sessionCookie(firstAuthentication);
    const secondCookie = sessionCookie(secondAuthentication);
    const globalRandomization = await randomizeTopic(firstCookie);
    const subjectRandomization = await randomizeTopic(firstCookie, {
      subject_slug: "mathematics",
    });
    const globalBody = (await globalRandomization.json()) as {
      id: string;
      subject: { slug: string };
      topic: { slug: string; level: string };
      status: string;
      created_at: string;
      updated_at: string;
    };
    const subjectBody = (await subjectRandomization.json()) as {
      id: string;
      subject: { slug: string };
    };

    await database.client
      .update(topic_randomizations)
      .set({ created_at: new Date("2026-09-07T10:00:00.000Z") })
      .where(eq(topic_randomizations.id, globalBody.id));
    await database.client
      .update(topic_randomizations)
      .set({ created_at: new Date("2026-09-07T10:00:01.000Z") })
      .where(eq(topic_randomizations.id, subjectBody.id));

    const missingSubject = await randomizeTopic(firstCookie, {
      subject_slug: "unknown-subject",
    });
    const firstHistory = await request("/v1/randomize/history?limit=1", {
      headers: { cookie: firstCookie },
    });
    const firstHistoryBody = (await firstHistory.json()) as {
      randomizations: Array<{ id: string }>;
      next_cursor: string | null;
    };
    const secondHistory = await request(`/v1/randomize/history?limit=1&cursor=${firstHistoryBody.next_cursor}`, {
      headers: { cookie: firstCookie },
    });
    const secondUserHistory = await request("/v1/randomize/history", {
      headers: { cookie: secondCookie },
    });
    const secondHistoryBody = (await secondHistory.json()) as {
      randomizations: Array<{ id: string }>;
      next_cursor: string | null;
    };

    expect(unauthenticated.status).toBe(401);
    expect(globalRandomization.status).toBe(200);
    expect(globalBody).toMatchObject({
      status: "pending",
      subject: { slug: expect.any(String) },
      topic: { slug: expect.any(String), level: expect.any(String) },
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
    expect(subjectBody.subject.slug).toBe("mathematics");
    expect(subjectBody.id).not.toBe(globalBody.id);
    expect(missingSubject.status).toBe(404);
    expect(await missingSubject.json()).toMatchObject({ code: "RANDOMIZE_SUBJECT_NOT_FOUND" });
    expect(firstHistoryBody.randomizations).toHaveLength(1);
    expect(firstHistoryBody.next_cursor).not.toBeNull();
    expect(secondHistoryBody.randomizations).toHaveLength(1);
    expect(secondHistoryBody.next_cursor).toBeNull();
    expect(firstHistoryBody.randomizations[0]?.id).toBe(subjectBody.id);
    expect(secondHistoryBody.randomizations[0]?.id).toBe(globalBody.id);
    expect(await secondUserHistory.json()).toEqual({
      randomizations: [],
      next_cursor: null,
    });
  });

  it("makes abandoned topics eligible again and rejects an exhausted subject", async () => {
    const authentication = await request("/v1/auth/anonymous", { method: "POST" });
    const cookie = sessionCookie(authentication);
    const authenticationBody = (await authentication.json()) as { user: { id: string } };
    const firstRandomization = await randomizeTopic(cookie, { subject_slug: "mathematics" });
    const firstBody = (await firstRandomization.json()) as {
      id: string;
      topic: { slug: string };
    };
    const mathematicsTopics = await database.client
      .select({ slug: knowledge_topics.slug })
      .from(knowledge_topics)
      .where(eq(knowledge_topics.subject_slug, "mathematics"));

    await database.client
      .update(topic_randomizations)
      .set({ status: "abandoned", updated_at: new Date() })
      .where(eq(topic_randomizations.id, firstBody.id));
    await database.client.insert(topic_randomizations).values(
      mathematicsTopics
        .filter((topic) => topic.slug !== firstBody.topic.slug)
        .map((topic) => ({
          user_id: authenticationBody.user.id,
          subject_slug: "mathematics",
          topic_slug: topic.slug,
          status: "pending" as const,
        })),
    );

    const retriedRandomization = await randomizeTopic(cookie, { subject_slug: "mathematics" });
    const retriedBody = (await retriedRandomization.json()) as {
      id: string;
      topic: { slug: string };
    };
    const exhausted = await randomizeTopic(cookie, { subject_slug: "mathematics" });

    expect(retriedRandomization.status).toBe(200);
    expect(retriedBody.id).not.toBe(firstBody.id);
    expect(retriedBody.topic.slug).toBe(firstBody.topic.slug);
    expect(exhausted.status).toBe(409);
    expect(await exhausted.json()).toMatchObject({ code: "RANDOMIZE_TOPIC_UNAVAILABLE" });
  });

  it("starts, resumes, heartbeats, and completes an isolated focus session", async () => {
    const authentication = await request("/v1/auth/anonymous", { method: "POST" });
    const otherAuthentication = await request("/v1/auth/anonymous", { method: "POST" });
    const cookie = sessionCookie(authentication);
    const otherCookie = sessionCookie(otherAuthentication);
    const randomization = await randomizeTopic(cookie, { subject_slug: "physics" });
    const randomizationBody = (await randomization.json()) as {
      id: string;
      subject: { slug: string; name: string };
      topic: { slug: string; name: string; level: string };
    };
    const command = {
      randomization_id: randomizationBody.id,
      duration_seconds: 3600,
    };
    const creation = await startFocusSession(cookie, command);
    const creationBody = (await creation.json()) as {
      id: string;
      randomization_id: string;
      duration_seconds: number;
      status: string;
      last_seen_at: string;
      finished_at: string | null;
    };
    const retry = await startFocusSession(cookie, command);
    const active = await request("/v1/focus/sessions/active", { headers: { cookie } });
    const otherUserHeartbeat = await request(`/v1/focus/sessions/${creationBody.id}/heartbeat`, {
      method: "POST",
      headers: { cookie: otherCookie },
    });
    const heartbeat = await request(`/v1/focus/sessions/${creationBody.id}/heartbeat`, {
      method: "POST",
      headers: { cookie },
    });
    const completion = await request(`/v1/focus/sessions/${creationBody.id}/complete`, {
      method: "POST",
      headers: { cookie },
    });
    const completionBody = (await completion.json()) as {
      id: string;
      status: string;
      finished_at: string | null;
    };
    const conflictingAbandonment = await request(`/v1/focus/sessions/${creationBody.id}/abandon`, {
      method: "POST",
      headers: { cookie },
    });
    const noLongerActive = await request("/v1/focus/sessions/active", {
      headers: { cookie },
    });
    const history = await request("/v1/focus/sessions/history?limit=1", {
      headers: { cookie },
    });
    const historyBody = (await history.json()) as {
      sessions: Array<{
        id: string;
        duration_seconds: number;
        subject: { slug: string; name: string };
        topic: { slug: string; name: string; level: string };
      }>;
      next_cursor: string | null;
    };
    const otherUserHistory = await request("/v1/focus/sessions/history", {
      headers: { cookie: otherCookie },
    });
    const [storedRandomization] = await database.client
      .select({ status: topic_randomizations.status })
      .from(topic_randomizations)
      .where(eq(topic_randomizations.id, randomizationBody.id));

    expect(creation.status).toBe(200);
    expect(creationBody).toMatchObject({
      randomization_id: randomizationBody.id,
      duration_seconds: 3600,
      status: "active",
      finished_at: null,
    });
    expect(await retry.json()).toMatchObject({ id: creationBody.id, status: "active" });
    expect(await active.json()).toMatchObject({
      session: { id: creationBody.id, status: "active" },
    });
    expect(otherUserHeartbeat.status).toBe(404);
    expect(heartbeat.status).toBe(200);
    expect(completionBody).toMatchObject({
      id: creationBody.id,
      status: "completed",
      finished_at: expect.any(String),
    });
    expect(storedRandomization?.status).toBe("completed");
    expect(conflictingAbandonment.status).toBe(409);
    expect(await noLongerActive.json()).toEqual({ session: null });
    expect(history.status).toBe(200);
    expect(historyBody).toEqual({
      sessions: [
        expect.objectContaining({
          id: creationBody.id,
          duration_seconds: 3600,
          subject: randomizationBody.subject,
          topic: randomizationBody.topic,
        }),
      ],
      next_cursor: null,
    });
    expect(await otherUserHistory.json()).toEqual({ sessions: [], next_cursor: null });
  });

  it("reconciles focus completion and inactivity through heartbeat", async () => {
    const completionAuthentication = await request("/v1/auth/anonymous", { method: "POST" });
    const abandonmentAuthentication = await request("/v1/auth/anonymous", { method: "POST" });
    const completionCookie = sessionCookie(completionAuthentication);
    const abandonmentCookie = sessionCookie(abandonmentAuthentication);
    const completionRandomization = await randomizeTopic(completionCookie, {
      subject_slug: "chemistry",
    });
    const abandonmentRandomization = await randomizeTopic(abandonmentCookie, {
      subject_slug: "biology",
    });
    const completionRandomizationBody = (await completionRandomization.json()) as { id: string };
    const abandonmentRandomizationBody = (await abandonmentRandomization.json()) as { id: string };
    const completion = await startFocusSession(completionCookie, {
      randomization_id: completionRandomizationBody.id,
      duration_seconds: 60,
    });
    const abandonment = await startFocusSession(abandonmentCookie, {
      randomization_id: abandonmentRandomizationBody.id,
      duration_seconds: 3600,
    });
    const completionBody = (await completion.json()) as { id: string };
    const abandonmentBody = (await abandonment.json()) as { id: string };
    const currentTime = new Date();
    const completionStartedAt = new Date(currentTime.getTime() - 61_000);
    const completionEndsAt = new Date(currentTime.getTime() - 1_000);
    const abandonedLastSeenAt = new Date(currentTime.getTime() - 121_000);

    await database.client
      .update(focus_sessions)
      .set({
        started_at: completionStartedAt,
        ends_at: completionEndsAt,
        last_seen_at: completionStartedAt,
        updated_at: completionStartedAt,
      })
      .where(eq(focus_sessions.id, completionBody.id));
    await database.client
      .update(focus_sessions)
      .set({ last_seen_at: abandonedLastSeenAt, updated_at: abandonedLastSeenAt })
      .where(eq(focus_sessions.id, abandonmentBody.id));

    const completedHeartbeat = await request(`/v1/focus/sessions/${completionBody.id}/heartbeat`, {
      method: "POST",
      headers: { cookie: completionCookie },
    });
    const abandonedHeartbeat = await request(`/v1/focus/sessions/${abandonmentBody.id}/heartbeat`, {
      method: "POST",
      headers: { cookie: abandonmentCookie },
    });

    expect(await completedHeartbeat.json()).toMatchObject({ status: "completed" });
    expect(await abandonedHeartbeat.json()).toMatchObject({ status: "abandoned" });
  });

  it("starts feedback, stores the full transcript, and exposes unassessed scores", async () => {
    const authentication = await request("/v1/auth/anonymous", { method: "POST" });
    const cookie = sessionCookie(authentication);
    const authenticationBody = (await authentication.json()) as { user: { id: string } };

    await database.client.update(users).set({ is_anonymous: false, email_verified: true }).where(eq(users.id, authenticationBody.user.id));
    await request("/v1/billing/webhook", signedWebhook(customerState(authenticationBody.user.id)));

    const randomization = await randomizeTopic(cookie, { subject_slug: "physics" });
    const randomizationBody = (await randomization.json()) as { id: string };
    const focus = await startFocusSession(cookie, {
      randomization_id: randomizationBody.id,
      duration_seconds: 60,
    });
    const focusBody = (await focus.json()) as { id: string };

    await request(`/v1/focus/sessions/${focusBody.id}/complete`, {
      method: "POST",
      headers: { cookie },
    });

    const started = await request("/v1/feedback/sessions", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ focus_session_id: focusBody.id }),
    });
    const startedBody = (await started.json()) as { id: string; status: string };
    const heartbeat = await request(`/v1/feedback/sessions/${startedBody.id}/heartbeat`, {
      method: "POST",
      headers: { cookie },
    });
    const form = new FormData();
    form.set("audio", new File([Uint8Array.from([1, 2, 3])], "explanation.webm", { type: "audio/webm" }));
    const submitted = await request(`/v1/feedback/sessions/${startedBody.id}/submit`, {
      method: "POST",
      headers: { cookie },
      body: form,
    });
    const submittedBody = (await submitted.json()) as {
      status: string;
      transcript: { text: string; segments: Array<{ id: string }> };
    };
    const history = await request("/v1/feedback/history?limit=10", { headers: { cookie } });
    const historyBody = (await history.json()) as {
      feedback: Array<{ id: string; transcript: { text: string } }>;
    };
    const scores = await request("/v1/scores", { headers: { cookie } });
    const scoresBody = (await scores.json()) as {
      subjects: Array<{ score: number; evaluations_count: number }>;
    };

    expect(started.status).toBe(200);
    expect(startedBody.status).toBe("active");
    expect(heartbeat.status).toBe(200);
    expect(submitted.status).toBe(202);
    expect(submitted.headers.get("retry-after")).toBe("2");
    expect(submittedBody.status).toBe("pending");
    expect(submittedBody.transcript.segments[0]?.id).toBe("seg_1");
    expect(historyBody.feedback[0]).toMatchObject({
      id: startedBody.id,
      transcript: { text: submittedBody.transcript.text },
    });
    expect(scores.status).toBe(200);
    expect(scoresBody.subjects.length).toBeGreaterThan(0);
    expect(scoresBody.subjects.every((subject) => subject.evaluations_count === 0)).toBe(true);
  });

  it("applies a score evaluation idempotently", async () => {
    const authentication = await request("/v1/auth/anonymous", { method: "POST" });
    const authenticationBody = (await authentication.json()) as { user: { id: string } };
    const cookie = sessionCookie(authentication);
    const randomization = await randomizeTopic(cookie, { subject_slug: "biology" });
    const randomizationBody = (await randomization.json()) as {
      subject: { slug: string };
      topic: { slug: string; level: KnowledgeLevel };
    };
    const evaluationId = Bun.randomUUIDv7();
    const scoreStore = createScoreStore(database.client);
    const scoreInput = {
      evaluation_id: evaluationId,
      feedback_session_id: Bun.randomUUIDv7(),
      user_id: authenticationBody.user.id,
      subject_slug: randomizationBody.subject.slug,
      topic_slug: randomizationBody.topic.slug,
      topic_level: randomizationBody.topic.level,
      mastery: 90,
      factual_accuracy: 4,
      has_critical_misconception: false,
      occurred_at: new Date(),
    };

    const first = await scoreStore.evaluation.create(scoreInput);
    const retry = await scoreStore.evaluation.create(scoreInput);
    const storedEvents = await database.client
      .select({ id: score_events.id })
      .from(score_events)
      .where(eq(score_events.evaluation_id, evaluationId));

    expect(retry).toMatchObject({
      before: first.before,
      after: first.after,
      delta: first.delta,
      algorithm_version: first.algorithm_version,
    });
    expect(storedEvents).toHaveLength(1);
  });

  it("mirrors a signed payment event idempotently", async () => {
    const authentication = await request("/v1/auth/anonymous", {
      method: "POST",
    });
    const cookie = sessionCookie(authentication);
    const authenticationBody = (await authentication.json()) as {
      user: { id: string };
    };
    const webhook = signedWebhook(customerState(authenticationBody.user.id));
    const firstDelivery = await request("/v1/billing/webhook", webhook);
    const secondDelivery = await request("/v1/billing/webhook", webhook);
    const summary = await request("/v1/billing/summary", {
      headers: { cookie },
    });

    expect(await firstDelivery.json()).toEqual({ status: "processed" });
    expect(await secondDelivery.json()).toEqual({ status: "duplicate" });
    expect(await summary.json()).toMatchObject({
      plan: "student",
      credit_allowance: 1000,
      credits_used: 125,
      credits_remaining: 875,
      is_active: true,
    });
  });

  it("stores one generated assessment per topic and removes it from the generation queue", async () => {
    const knowledgeStore = createKnowledgeStore(database.client);
    const [topic] = await knowledgeStore.topic.searchWithoutAssessment(1);

    if (!topic) throw new Error("The seeded catalog must contain a topic.");

    const reference = { subject_slug: topic.subject.slug, topic_slug: topic.topic.slug };
    const write = {
      ...reference,
      assessment: {
        reference_summary: "Resumo gerado para o tópico.",
        key_concepts: ["Conceito A", "Conceito B", "Conceito C", "Conceito D"],
        common_misconceptions: ["Erro comum A", "Erro comum B"],
        version: "generated-v1",
      },
      provider: "openai",
      model: "gpt-5.6-luna",
      prompt_version: "local-v1",
      created_at: new Date(),
    };

    expect(await knowledgeStore.assessment.create(write)).toBe(true);
    expect(await knowledgeStore.assessment.create(write)).toBe(false);
    expect(await knowledgeStore.assessment.get(reference)).toEqual(write.assessment);

    const [next] = await knowledgeStore.topic.searchWithoutAssessment(1);

    expect(next?.topic.slug === topic.topic.slug && next.subject.slug === topic.subject.slug).toBe(false);
  });

  it("keeps one shadow review per completed feedback session and mode", async () => {
    const authentication = await request("/v1/auth/anonymous", { method: "POST" });
    const authenticationBody = (await authentication.json()) as { user: { id: string } };
    const [topic] = await createKnowledgeStore(database.client).topic.search("biology");

    if (!topic) throw new Error("The seeded catalog must contain a biology topic.");

    const now = new Date();
    const transcript = {
      text: "A fotossíntese transforma luz em energia química.",
      language: "pt",
      language_probability: 0.99,
      duration_seconds: 10,
      model: "test-whisper",
      segments: [{ id: "seg_1", start_ms: 0, end_ms: 10_000, text: "A fotossíntese transforma luz em energia química." }],
    };
    const criterion = { score: 3, feedback: "Bom.", evidence: [{ segment_id: "seg_1", quote: "transforma luz" }] };
    const evaluation = feedbackEvaluationRule.create(
      {
        language: "pt-BR",
        scorable: true,
        insufficient_reason: null,
        headline: "Boa base",
        summary: "A explicação está correta, mas curta.",
        rubric: { factual_accuracy: criterion, coverage: criterion, conceptual_reasoning: criterion, clarity: criterion },
        understanding_map: [],
        reasoning_analysis: { observed_approach: "Definição", what_worked: [], where_it_broke: [] },
        corrections: [],
        strengths: [],
        improvement_plan: [],
        recommended_outline: [],
        follow_up_questions: [],
        uncertainties: [],
      },
      transcript,
    );
    const [session] = await database.client
      .insert(feedback_sessions)
      .values({
        focus_session_id: Bun.randomUUIDv7(),
        randomization_id: Bun.randomUUIDv7(),
        user_id: authenticationBody.user.id,
        subject_slug: topic.subject.slug,
        subject_name: topic.subject.name,
        topic_slug: topic.topic.slug,
        topic_name: topic.topic.name,
        topic_level: topic.topic.level,
        assessment_context: {
          ...topic,
          assessment: { reference_summary: "Resumo", key_concepts: ["A"], common_misconceptions: ["B"], version: "test" },
        },
        status: "completed",
        started_at: new Date(now.getTime() - 120_000),
        recording_ends_at: new Date(now.getTime() - 60_000),
        upload_ends_at: new Date(now.getTime() - 30_000),
        last_seen_at: now,
        submitted_at: now,
        completed_at: now,
        transcript,
        evaluation_id: Bun.randomUUIDv7(),
        evaluation,
        updated_at: now,
      })
      .returning({ id: feedback_sessions.id });

    if (!session) throw new Error("The completed feedback session was not inserted.");

    const feedbackStore = createFeedbackStore(database.client);
    const since = new Date(now.getTime() - 3_600_000);
    const pending = await feedbackStore.shadow.search({ mode: "decision", completed_after: since, limit: 10 });
    const write = {
      feedback_session_id: session.id,
      mode: "decision" as const,
      status: "completed" as const,
      provider: "openrouter",
      model: "typesafe/jev-1.13",
      scorable: true,
      mastery: 80,
      verdict: "mostly_correct" as const,
      correction_segment_ids: [],
      confidence: 0.8,
      primary_mastery: evaluation.mastery,
      primary_verdict: evaluation.verdict,
      decision: null,
      evaluation: null,
      input_tokens: 900,
      output_tokens: 80,
      estimated_cost_usd: 0.00004,
      latency_ms: 300,
      error_code: null,
      created_at: now,
    };

    await feedbackStore.shadow.create(write);
    await feedbackStore.shadow.create(write);

    const stored = await database.client
      .select({ id: feedback_shadow_reviews.id })
      .from(feedback_shadow_reviews)
      .where(eq(feedback_shadow_reviews.feedback_session_id, session.id));
    const decisionPending = await feedbackStore.shadow.search({ mode: "decision", completed_after: since, limit: 10 });
    const llmPending = await feedbackStore.shadow.search({ mode: "llm", completed_after: since, limit: 10 });

    expect(pending.map((item) => item.id)).toContain(session.id);
    expect(stored).toHaveLength(1);
    expect(decisionPending.map((item) => item.id)).not.toContain(session.id);
    expect(llmPending.map((item) => item.id)).toContain(session.id);
  });
});
