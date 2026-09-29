import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";

const ROOT_DIRECTORY = resolve(import.meta.dir, "../../..");
const COMPOSE_FILE = join(ROOT_DIRECTORY, "infra/compose.yaml");
const API_PORT = Number(process.env.E2E_APP_PORT ?? 3100);
const API_BASE_URL = `http://127.0.0.1:${API_PORT}`;
const TRANSCRIPTION_BASE_URL = "http://127.0.0.1:8001";
const AI_BASE_URL = "http://127.0.0.1:11434/v1";
const AI_MODEL = process.env.AI_EVALUATION_MODEL || "qwen3.5:9b";
const FLOW_TIMEOUT_MS = Number(process.env.E2E_FLOW_TIMEOUT_MS ?? 900_000);
const SUBJECT_SLUG = process.env.E2E_SUBJECT_SLUG || "physics";

type JsonRecord = Record<string, unknown>;

type RandomizationResponse = {
  id: string;
  subject: { slug: string; name: string };
  topic: { slug: string; name: string; level: string };
};

type ResourceResponse = {
  id: string;
  status: string;
};

type FeedbackResponse = ResourceResponse & {
  transcript: null | {
    text: string;
    language: string;
    duration_seconds: number;
    model: string;
  };
  evaluation: null | {
    scorable: boolean;
    mastery: number | null;
    verdict: string;
    headline: string;
  };
  score_change: null | {
    before: number;
    after: number;
    delta: number;
    algorithm_version: string;
  };
  error_code: string | null;
};

type AudioFixture = {
  path: string;
  media_type: string;
  explanation: string | null;
};

const startedAt = Date.now();
let server: Bun.Subprocess | null = null;
let temporaryDirectory: string | null = null;

try {
  validateSafety();
  await assertPortAvailable();
  await prepareInfrastructure();

  server = startApi();
  await waitForHealth(`${API_BASE_URL}/health`, "API", 30_000, server);

  const result = await runFlow();

  console.log("\nE2E LIVE FLOW PASSED\n");
  console.log(
    JSON.stringify(
      {
        success: true,
        elapsed_seconds: Math.round((Date.now() - startedAt) / 100) / 10,
        api_base_url: API_BASE_URL,
        user_id: result.user_id,
        randomization_id: result.randomization.id,
        focus_session_id: result.focus_session_id,
        feedback_session_id: result.feedback.id,
        subject: result.randomization.subject,
        topic: result.randomization.topic,
        spoken_explanation: result.spoken_explanation,
        transcript: result.feedback.transcript,
        evaluation: result.feedback.evaluation,
        score_change: result.feedback.score_change,
        langfuse_environment: "test",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error("\nE2E LIVE FLOW FAILED\n");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (server) {
    server.kill("SIGTERM");
    await server.exited;
  }

  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
}

function validateSafety(): void {
  if (process.env.APP_ENV === "production") throw new Error("The live E2E flow cannot run with APP_ENV=production.");

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) throw new Error("DATABASE_URL is required. Configure the root .env first.");

  const hostname = new URL(databaseUrl).hostname;

  if (!["127.0.0.1", "localhost", "::1"].includes(hostname))
    throw new Error(`Refusing to run the live E2E flow against the non-local database host ${hostname}.`);

  if (!Number.isInteger(API_PORT) || API_PORT < 1 || API_PORT > 65_535) throw new Error("E2E_APP_PORT must be a valid TCP port.");

  if (!Number.isFinite(FLOW_TIMEOUT_MS) || FLOW_TIMEOUT_MS < 30_000) throw new Error("E2E_FLOW_TIMEOUT_MS must be at least 30000.");
}

async function assertPortAvailable(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(1_000) });
  } catch {
    return;
  }

  throw new Error(`Port ${API_PORT} is already serving HTTP. Stop that process or choose E2E_APP_PORT with another port.`);
}

async function prepareInfrastructure(): Promise<void> {
  step("Starting PostgreSQL, Mailpit, and Faster Whisper");
  await runCommand(["docker", "compose", "-f", COMPOSE_FILE, "up", "-d"]);

  step("Starting Ollama");
  await runCommand(["docker", "compose", "-f", COMPOSE_FILE, "--profile", "ai", "up", "-d", "ollama"]);

  await Promise.all([
    waitForHealth(`${TRANSCRIPTION_BASE_URL}/health`, "Faster Whisper", 180_000),
    waitForHealth("http://127.0.0.1:11434/api/tags", "Ollama", 180_000),
  ]);

  const modelAvailable = await commandSucceeds([
    "docker",
    "compose",
    "-f",
    COMPOSE_FILE,
    "exec",
    "-T",
    "ollama",
    "ollama",
    "show",
    AI_MODEL,
  ]);

  if (!modelAvailable) {
    step(`Pulling ${AI_MODEL}; this is required only on the first run`);
    await runCommand(["docker", "compose", "-f", COMPOSE_FILE, "exec", "-T", "ollama", "ollama", "pull", AI_MODEL]);
  }

  step("Applying database migrations");
  await runCommand(["bun", "run", "database:migrate"]);
}

function startApi(): Bun.Subprocess {
  step(`Starting an isolated E2E API on ${API_BASE_URL}`);

  return Bun.spawn(["bun", "run", "--cwd", "backend", "start"], {
    cwd: ROOT_DIRECTORY,
    env: {
      ...process.env,
      APP_ENV: "test",
      APP_HOST: "127.0.0.1",
      APP_PORT: String(API_PORT),
      APP_BASE_URL: API_BASE_URL,
      E2E_TEST_MODE: "true",
      EMAIL_PROVIDER: "memory",
      TRANSCRIPTION_BASE_URL,
      TRANSCRIPTION_TIMEOUT_MS: process.env.E2E_TRANSCRIPTION_TIMEOUT_MS || "600000",
      AI_PROVIDER_NAME: "ollama",
      AI_BASE_URL,
      AI_API_KEY: "ollama",
      AI_EVALUATION_MODEL: AI_MODEL,
    },
    stdout: "inherit",
    stderr: "inherit",
  });
}

async function runFlow() {
  step("Creating an isolated anonymous session");
  const authentication = await api<{ user: { id: string } }>("/v1/auth/anonymous", {
    method: "POST",
  });
  const cookie = authentication.response.headers.get("set-cookie")?.split(";", 1)[0];

  if (!cookie) throw new Error("Authentication did not return a session cookie.");

  await api("/v1/auth/session", { headers: { cookie } });
  const billing = await api<{ plan: string; status: string; is_active: boolean }>("/v1/billing/summary", { headers: { cookie } });

  invariant(
    billing.body.plan === "student" && billing.body.status === "active" && billing.body.is_active,
    "E2E student entitlement was not activated.",
  );

  step(`Randomizing a topic in ${SUBJECT_SLUG}`);
  const randomization = await api<RandomizationResponse>("/v1/randomize/topic", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ subject_slug: SUBJECT_SLUG }),
  });

  step("Starting, heartbeating, and completing focus");
  const focus = await api<ResourceResponse>("/v1/focus/sessions", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      randomization_id: randomization.body.id,
      duration_seconds: 60,
    }),
  });
  await api(`/v1/focus/sessions/${focus.body.id}/heartbeat`, {
    method: "POST",
    headers: { cookie },
  });
  const completedFocus = await api<ResourceResponse>(`/v1/focus/sessions/${focus.body.id}/complete`, {
    method: "POST",
    headers: { cookie },
  });
  invariant(completedFocus.body.status === "completed", "Focus did not complete.");

  step("Starting and heartbeating feedback recording");
  const feedback = await api<ResourceResponse>("/v1/feedback/sessions", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ focus_session_id: focus.body.id }),
  });
  await api(`/v1/feedback/sessions/${feedback.body.id}/heartbeat`, {
    method: "POST",
    headers: { cookie },
  });

  const audio = await prepareAudio(randomization.body);
  const form = new FormData();
  form.set(
    "audio",
    new File([await Bun.file(audio.path).arrayBuffer()], `explanation${extname(audio.path)}`, {
      type: audio.media_type,
    }),
  );

  step("Submitting real audio to Faster Whisper");
  const submitted = await api<FeedbackResponse>(
    `/v1/feedback/sessions/${feedback.body.id}/submit`,
    { method: "POST", headers: { cookie }, body: form },
    [202],
  );
  invariant(submitted.body.status === "pending", "Feedback was not queued for evaluation.");
  invariant(Boolean(submitted.body.transcript?.text), "Faster Whisper returned an empty transcript.");

  step("Polling the Qwen evaluation worker");
  const evaluated = await pollFeedback(cookie, feedback.body.id);
  invariant(Boolean(evaluated.evaluation), "Completed feedback has no evaluation.");
  invariant(evaluated.evaluation?.scorable === true, "The generated explanation was not scorable.");
  invariant(Boolean(evaluated.score_change), "The scorable evaluation did not update the subject score.");

  step("Verifying persisted history and score projection");
  const history = await api<{ feedback: FeedbackResponse[] }>("/v1/feedback/history?limit=10", {
    headers: { cookie },
  });
  const historical = history.body.feedback.find((item) => item.id === feedback.body.id);
  invariant(Boolean(historical?.transcript?.text), "Feedback history did not retain the transcript.");
  invariant(Boolean(historical?.evaluation), "Feedback history did not retain the evaluation.");

  const scores = await api<{
    subjects: Array<{ subject_slug: string; score: number; evaluations_count: number }>;
  }>("/v1/scores", { headers: { cookie } });
  const subjectScore = scores.body.subjects.find((subject) => subject.subject_slug === randomization.body.subject.slug);
  invariant(Boolean(subjectScore), "The score map does not contain the evaluated subject.");
  invariant((subjectScore?.evaluations_count ?? 0) >= 1, "The score projection did not count the evaluation.");

  return {
    user_id: authentication.body.user.id,
    randomization: randomization.body,
    focus_session_id: focus.body.id,
    feedback: evaluated,
    spoken_explanation: audio.explanation,
  };
}

async function prepareAudio(randomization: RandomizationResponse): Promise<AudioFixture> {
  const providedPath = process.env.E2E_AUDIO_FILE;

  if (providedPath) {
    const path = resolve(providedPath);

    if (!(await Bun.file(path).exists())) throw new Error(`E2E_AUDIO_FILE does not exist: ${path}`);

    return { path, media_type: audioMediaType(path), explanation: null };
  }

  if (process.platform !== "darwin")
    throw new Error(
      "Automatic speech generation currently requires macOS. Set E2E_AUDIO_FILE to a WAV, WebM, Ogg, MP3, MP4, or AAC explanation.",
    );

  step(`Generating a grounded explanation for ${randomization.topic.name}`);
  const explanation = process.env.E2E_EXPLANATION_TEXT || (await generateExplanation(randomization));
  temporaryDirectory = await mkdtemp(join(tmpdir(), "juststudy-e2e-"));
  const aiffPath = join(temporaryDirectory, "explanation.aiff");
  const wavPath = join(temporaryDirectory, "explanation.wav");

  await runCommand(["say", "-v", process.env.E2E_VOICE || "Luciana", "-r", "165", "-o", aiffPath, explanation]);
  await runCommand(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", aiffPath, wavPath]);

  return { path: wavPath, media_type: "audio/wav", explanation };
}

async function generateExplanation(randomization: RandomizationResponse): Promise<string> {
  const nativeOllamaUrl = AI_BASE_URL.replace(/\/v1\/?$/, "");
  const response = await fetch(`${nativeOllamaUrl}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: AI_MODEL,
      stream: false,
      think: false,
      prompt: [
        "Escreva em português brasileiro uma explicação oral correta, clara e autocontida.",
        "Use entre 100 e 140 palavras, sem título, listas, markdown ou introduções metalinguísticas.",
        `Assunto: ${randomization.subject.name}.`,
        `Tópico: ${randomization.topic.name}.`,
        `Nível: ${randomization.topic.level}.`,
        "Inclua definição, relação causal, um exemplo e uma ressalva conceitual relevante.",
      ].join("\n"),
      options: { temperature: 0.1, num_predict: 220 },
    }),
    signal: AbortSignal.timeout(300_000),
  });
  const payload = (await response.json()) as { response?: string; error?: string };

  if (!response.ok || !payload.response?.trim())
    throw new Error(`Ollama could not create the audio fixture: ${payload.error ?? response.status}`);

  return payload.response.trim();
}

async function pollFeedback(cookie: string, feedbackId: string): Promise<FeedbackResponse> {
  const deadline = Date.now() + FLOW_TIMEOUT_MS;
  let lastStatus = "";

  while (Date.now() < deadline) {
    const current = await api<FeedbackResponse>(`/v1/feedback/sessions/${feedbackId}`, {
      headers: { cookie },
    });

    if (current.body.status !== lastStatus) {
      console.log(`  feedback status: ${current.body.status}`);
      lastStatus = current.body.status;
    }

    if (current.body.status === "completed") return current.body;
    if (current.body.status === "failed") throw new Error(`Feedback evaluation failed with ${current.body.error_code ?? "unknown error"}.`);

    await Bun.sleep(2_000);
  }

  throw new Error(`Feedback did not finish within ${FLOW_TIMEOUT_MS}ms.`);
}

async function api<Body = JsonRecord>(
  path: string,
  init: RequestInit = {},
  expectedStatuses: number[] = [200],
): Promise<{ response: Response; body: Body }> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!expectedStatuses.includes(response.status))
    throw new Error(
      `${init.method ?? "GET"} ${path} returned ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`,
    );

  return { response, body: body as Body };
}

async function waitForHealth(url: string, name: string, timeoutMs: number, process?: Bun.Subprocess): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (process && process.exitCode !== null) throw new Error(`${name} exited before becoming healthy with code ${process.exitCode}.`);

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });

      if (response.ok) return;
    } catch {
      // The service is still starting.
    }

    await Bun.sleep(1_000);
  }

  throw new Error(`${name} did not become healthy within ${timeoutMs}ms.`);
}

async function runCommand(command: string[]): Promise<void> {
  const process = Bun.spawn(command, {
    cwd: ROOT_DIRECTORY,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await process.exited;

  if (exitCode !== 0) throw new Error(`${command.join(" ")} exited with code ${exitCode}.`);
}

async function commandSucceeds(command: string[]): Promise<boolean> {
  const process = Bun.spawn(command, {
    cwd: ROOT_DIRECTORY,
    stdout: "ignore",
    stderr: "ignore",
  });

  return (await process.exited) === 0;
}

function audioMediaType(path: string): string {
  const extension = extname(path).toLowerCase();
  const mediaTypes: Record<string, string> = {
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".opus": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".mpeg": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
  };
  const mediaType = mediaTypes[extension];

  if (!mediaType) throw new Error(`Unsupported E2E_AUDIO_FILE extension: ${extension || "none"}.`);

  return mediaType;
}

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function step(message: string): void {
  console.log(`\n→ ${message}`);
}
