import { afterEach, beforeEach, expect, it, vi } from "vitest";

// Estes testes exercitam a conversa, desligada por padrão na produção.
process.env["HELENA_CHAT_ENABLED"] = "true";

const mocks = vi.hoisted(() => ({
  identify: vi.fn(),
  quota: vi.fn(),
  teacher: vi.fn(),
  student: vi.fn(),
  refund: vi.fn(),
  text: vi.fn(),
}));
vi.mock("./firebase-account-identity", () => ({
  createFirebaseAccountIdentity: () => mocks.identify,
}));
vi.mock("./firebase-realtime-store", () => ({ createFirebaseRealtimeStore: () => ({}) }));
vi.mock("./rate-limit", () => ({ checkRateLimit: mocks.quota, refundRateLimit: mocks.refund }));
vi.mock("./helena-teacher", () => ({
  createCloudflareTeacher: () => ({ generate: mocks.teacher }),
  runCloudflareText: mocks.text,
}));
vi.mock("./olena-student", () => ({
  createOlenaStudent: mocks.student,
  createProgressiveProvider: (_teacher: unknown, student: unknown) => student,
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("HELENA_ALLOWED_ORIGINS", "https://olena.test");
  vi.stubEnv("OLENA_STUDENT_EVALUATED", "true");
  vi.stubEnv("OLENA_STUDENT_ENDPOINT", "https://unused.test");
  vi.stubEnv("OLENA_STUDENT_MODEL", "experimental");
  vi.stubEnv("OLENA_STUDENT_CAPABILITIES", "tutor");
  mocks.identify.mockResolvedValue({ uid: "account" });
  mocks.quota.mockResolvedValue(true);
  mocks.refund.mockResolvedValue(undefined);
  mocks.teacher.mockResolvedValue({ answer: "Explicação do professor.", suggestions: [] });
  mocks.student.mockReturnValue({ generate: async () => ({ answer: "999", suggestions: [] }) });
});
afterEach(() => vi.unstubAllEnvs());

async function send(prompt: string, address?: string, capability = "tutor") {
  const { handleHelenaRuntime } = await import("./helena-runtime");
  return handleHelenaRuntime(
    new Request("https://olena.test/api/helena", {
      method: "POST",
      headers: {
        Origin: "https://olena.test",
        "Content-Type": "application/json",
        ...(address ? { "x-vercel-forwarded-for": address } : {}),
      },
      body: JSON.stringify({
        version: 1,
        capability,
        prompt,
        sources:
          capability === "tutor"
            ? []
            : [{ id: "fonte", kind: "material", title: "Aula", content: "Texto da aula." }],
        privacy: { consent: true, retention: "none" },
      }),
    }),
  );
}

it("the production runtime uses the exact calculator for supported arithmetic", async () => {
  const response = await send("Quanto é 1/3 + 1/6?");
  expect(response.status).toBe(200);
  expect((await response.json()).answer).toContain("Resultado conferido: 1/2.");
  expect(mocks.teacher).not.toHaveBeenCalled();
  expect(mocks.student).not.toHaveBeenCalled();
});

it("legacy student promotion settings cannot replace the Cloudflare teacher", async () => {
  const response = await send("Explique frações");
  expect(response.status).toBe(200);
  expect((await response.json()).answer).toBe("Explicação do professor.");
  expect(mocks.teacher).toHaveBeenCalledOnce();
  expect(mocks.student).not.toHaveBeenCalled();
});

it("the production calculator still requires authentication and quota", async () => {
  mocks.identify.mockResolvedValue(undefined);
  expect((await send("Quanto é 1/3 + 1/6?")).status).toBe(401);
  mocks.identify.mockResolvedValue({ uid: "account" });
  mocks.quota.mockResolvedValue(false);
  expect((await send("Quanto é 1/3 + 1/6?")).status).toBe(429);
  expect(mocks.teacher).not.toHaveBeenCalled();
});

it("recusa conta anônima antes de gastar qualquer cota ou chamar o professor", async () => {
  mocks.identify.mockResolvedValue({ uid: "anon", anonymous: true });
  const response = await send("Explique frações.");
  expect(response.status).toBe(401);
  expect(mocks.quota).not.toHaveBeenCalled();
  expect(mocks.teacher).not.toHaveBeenCalled();
});

it("aceita conta real marcada como não anônima", async () => {
  mocks.identify.mockResolvedValue({ uid: "account", anonymous: false });
  const response = await send("Explique frações.");
  expect(response.status).toBe(200);
  expect(mocks.quota).toHaveBeenCalled();
});

it("o teto por endereço entra antes do global, para várias contas no mesmo endereço não esgotarem a cota de todos", async () => {
  const buckets: string[] = [];
  mocks.quota.mockImplementation(async (_store, bucket: string, key: string) => {
    buckets.push(`${bucket}:${key}`);
    return bucket !== "helena-address-day";
  });
  const response = await send("Explique frações.", "203.0.113.9");
  expect(response.status).toBe(429);
  expect(buckets).toEqual([
    "helena-user-minute:account",
    "helena-user-day:account",
    "helena-address-day:203.0.113.9",
  ]);
  expect(mocks.teacher).not.toHaveBeenCalled();
});

it("sem endereço identificável, o teto por endereço é ignorado e o global continua valendo", async () => {
  const buckets: string[] = [];
  mocks.quota.mockImplementation(async (_store, bucket: string) => {
    buckets.push(bucket);
    return true;
  });
  expect((await send("Explique frações.")).status).toBe(200);
  expect(buckets).toEqual(["helena-user-minute", "helena-user-day", "helena-global-day"]);
});

it("cada tipo da Biblioteca tem 2 usos por dia por pessoa e teto global próprio", async () => {
  const blocked = new Set<string>();
  mocks.quota.mockImplementation(
    async (_store: unknown, namespace: string) => !blocked.has(namespace),
  );
  for (const [capability, plural] of [
    ["summarize", "resumos"],
    ["flashcards", "flashcards"],
    ["quiz", "quizzes"],
    ["exam", "simulados"],
  ] as const) {
    blocked.clear();
    blocked.add(`helena-${capability}-day`);
    const global = await send("count=5", undefined, capability);
    expect(global.status).toBe(429);
    expect(((await global.json()) as { error: { message: string } }).error.message).toContain(
      "limite gratuito de hoje",
    );
    expect(global.headers.get("Retry-After")).toMatch(/^\d+$/);

    blocked.clear();
    blocked.add(`helena-${capability}-user-day`);
    const personal = await send("count=5", undefined, capability);
    expect(personal.status).toBe(429);
    expect(((await personal.json()) as { error: { message: string } }).error.message).toContain(
      `2 ${plural} com a Olena hoje`,
    );
  }
});

it("o teto de um tipo não bloqueia os outros", async () => {
  const blocked = new Set(["helena-quiz-user-day"]);
  mocks.quota.mockImplementation(
    async (_store: unknown, namespace: string) => !blocked.has(namespace),
  );
  expect((await send("count=5", undefined, "quiz")).status).toBe(429);
  expect((await send("Resuma a aula", undefined, "summarize")).status).not.toBe(429);
});

it("falha do modelo devolve o uso do dia (a pessoa não perde um dos 2)", async () => {
  mocks.text.mockResolvedValue("isto não é JSON");
  const response = await send("count=5;options=4;difficulty=medium", undefined, "quiz");
  expect(response.status).toBe(503);
  // Duas tentativas, e depois devolve os contadores que o pedido gastou.
  expect(mocks.text).toHaveBeenCalledTimes(2);
  const returned = mocks.refund.mock.calls.map((call) => String(call[1]));
  expect(returned).toEqual(
    expect.arrayContaining(["helena-quiz-user-day", "helena-quiz-day", "helena-global-day"]),
  );
});

it("quiz válido da IA volta pronto, sem devolver o uso", async () => {
  mocks.text.mockResolvedValue(
    JSON.stringify({
      questions: [
        {
          question: "Qual gás as plantas liberam?",
          options: ["Oxigênio", "Hélio", "Metano", "Neônio"],
          answer: 0,
          explanation: "Fotossíntese.",
        },
        {
          question: "Onde ocorre a fotossíntese?",
          options: ["Cloroplasto", "Núcleo", "Ribossomo", "Vacúolo"],
          answer: 0,
          explanation: "Nos cloroplastos.",
        },
      ],
    }),
  );
  const response = await send("count=5;options=4;difficulty=medium", undefined, "quiz");
  expect(response.status).toBe(200);
  const body = (await response.json()) as { answer: string };
  expect(JSON.parse(body.answer).questions).toHaveLength(2);
  expect(mocks.refund).not.toHaveBeenCalled();
});
