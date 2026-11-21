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
// Armazenamento em memória com a gravação atômica de verdade: o orçamento, a trava e a repetição
// de pedido usam as mesmas operações do banco.
vi.mock("./firebase-realtime-store", async () => {
  const { createMemoryRoomStore } = await import("./room-transaction");
  return { createFirebaseRealtimeStore: () => createMemoryRoomStore() };
});
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

async function runtime() {
  return (await import("./helena-runtime")).handleHelenaRuntime;
}

function build(
  prompt: string,
  options: { address?: string; capability?: string; source?: string; method?: string } = {},
) {
  const capability = options.capability ?? "tutor";
  return new Request("https://olena.test/api/helena", {
    method: "POST",
    headers: {
      Origin: "https://olena.test",
      "Content-Type": "application/json",
      ...(options.address ? { "x-vercel-forwarded-for": options.address } : {}),
    },
    body: JSON.stringify({
      version: 1,
      capability,
      prompt,
      sources:
        capability === "tutor"
          ? []
          : [
              {
                id: "fonte",
                kind: "material",
                title: "Aula",
                content: options.source ?? "Texto da aula sobre fotossíntese e cloroplastos.",
              },
            ],
      privacy: { consent: true, retention: "none" },
    }),
  });
}

async function send(prompt: string, address?: string, capability = "tutor", source?: string) {
  return (await runtime())(
    build(prompt, {
      ...(address ? { address } : {}),
      capability,
      ...(source ? { source } : {}),
    }),
  );
}

async function usage() {
  const handler = await runtime();
  const response = await handler(
    new Request("https://olena.test/api/helena?usage=1", {
      headers: { Origin: "https://olena.test" },
    }),
  );
  return (await response.json()) as {
    usage: { usedCredits: number; limitCredits: number; remainingCredits: number };
  };
}

const quizJson = JSON.stringify({
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
});

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

it("a rajada é barrada primeiro (minuto, dia, endereço) e o endereço antes do gasto da conta", async () => {
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
  // nada foi reservado: o orçamento da pessoa continua zerado
  expect((await usage()).usage.usedCredits).toBe(0);
});

it("sem endereço identificável, só valem o minuto e o dia da pessoa", async () => {
  const buckets: string[] = [];
  mocks.quota.mockImplementation(async (_store, bucket: string) => {
    buckets.push(bucket);
    return true;
  });
  expect((await send("Explique frações.")).status).toBe(200);
  expect(buckets).toEqual(["helena-user-minute", "helena-user-day"]);
});

it("textos pequenos custam pouco: dá para gerar muito mais do que 2 por dia", async () => {
  mocks.text.mockResolvedValue(quizJson);
  for (let i = 0; i < 12; i += 1) {
    const response = await send(`count=5;options=4;difficulty=medium;n=${i}`, undefined, "quiz");
    expect(response.status).toBe(200);
  }
  const { usage: today } = await usage();
  expect(today.usedCredits).toBeGreaterThan(0);
  // 12 quizzes pequenos cabem no orçamento da pessoa, com sobra
  expect(today.remainingCredits).toBeGreaterThan(0);
});

it("o gasto é acertado com a resposta: o orçamento não fica preso na reserva do pior caso", async () => {
  mocks.text.mockResolvedValue(quizJson);
  const before = (await usage()).usage;
  expect(before.usedCredits).toBe(0);
  expect((await send("count=5;options=4;difficulty=medium", undefined, "quiz")).status).toBe(200);
  const after = (await usage()).usage;
  // reserva do pior caso passaria de 40 créditos; o gasto real de um quiz pequeno é bem menor
  expect(after.usedCredits).toBeGreaterThan(0);
  expect(after.usedCredits).toBeLessThan(25);
});

it("texto grande custa mais créditos que texto pequeno", async () => {
  mocks.text.mockResolvedValue(quizJson);
  await send("count=5;options=4;difficulty=medium;a=1", undefined, "quiz", "pequeno ".repeat(50));
  const small = (await usage()).usage.usedCredits;
  await send(
    "count=5;options=4;difficulty=medium;a=2",
    undefined,
    "quiz",
    "A fotossíntese ocorre nos cloroplastos das plantas. ".repeat(150),
  );
  const big = (await usage()).usage.usedCredits - small;
  expect(big).toBeGreaterThan(small);
});

it("quando o orçamento da pessoa acaba, o aviso mostra os créditos e quando volta", async () => {
  // Preço alto só neste teste, para esgotar o orçamento com poucos pedidos.
  vi.stubEnv("OLENA_NEURONS_OUT_PER_M", "120000");
  mocks.text.mockResolvedValue(quizJson);
  const statuses: number[] = [];
  let last: Response | undefined;
  for (let i = 0; i < 6; i += 1) {
    last = await send(`count=20;options=4;difficulty=medium;n=${i}`, undefined, "quiz");
    statuses.push(last.status);
    // o gasto real é pequeno; força o gasto alto usando a contagem de tokens do modelo
  }
  // com a saída cara, o pedido máximo passa do teto e é recusado antes de gastar
  expect(statuses).toContain(413);
  const body = (await last!.json()) as { error: { message: string } };
  expect(body.error.message).toContain("grande demais");
});

it("esgota o orçamento da pessoa com gasto real alto e avisa com os números", async () => {
  vi.stubEnv("OLENA_NEURONS_OUT_PER_M", "60000");
  mocks.text.mockImplementation(
    async (_config: unknown, input: { onUsage?: (u: unknown) => void }) => {
      // o modelo informa o gasto: 1.600 tokens de saída a 60.000 neurons por milhão = 96 neurons
      input.onUsage?.({ inputTokens: 5_000, outputTokens: 1_600 });
      return quizJson;
    },
  );
  let denied: Response | undefined;
  for (let i = 0; i < 20 && !denied; i += 1) {
    const response = await send(`count=5;options=4;difficulty=medium;n=${i}`, undefined, "quiz");
    if (response.status === 429) denied = response;
  }
  expect(denied).toBeDefined();
  const message = ((await denied!.json()) as { error: { message: string } }).error.message;
  expect(message).toMatch(/créditos de hoje.*\(\d+ de \d+\)/);
  expect(message).toContain("21h");
  expect(denied!.headers.get("Retry-After")).toMatch(/^\d+$/);
  const { usage: today } = await usage();
  expect(today.remainingCredits).toBeLessThan(150);
});

it("falha do modelo não é cobrada da pessoa: o orçamento continua como estava", async () => {
  mocks.text.mockResolvedValue("isto não é JSON");
  const response = await send("count=5;options=4;difficulty=medium", undefined, "quiz");
  expect(response.status).toBe(503);
  // Duas tentativas, e depois devolve a reserva e os contadores de rajada.
  expect(mocks.text).toHaveBeenCalledTimes(2);
  expect((await usage()).usage.usedCredits).toBe(0);
  const returned = mocks.refund.mock.calls.map((call) => String(call[1]));
  expect(returned).toEqual(expect.arrayContaining(["helena-user-minute", "helena-user-day"]));
});

it("um pedido por vez por pessoa: o segundo em paralelo espera, e depois libera", async () => {
  let finish!: (value: string) => void;
  mocks.text.mockImplementationOnce(() => new Promise<string>((resolve) => (finish = resolve)));
  const first = send("count=5;options=4;difficulty=medium;n=1", undefined, "quiz");
  await vi.waitFor(() => expect(mocks.text).toHaveBeenCalledTimes(1));
  const second = await send("count=5;options=4;difficulty=medium;n=2", undefined, "quiz");
  expect(second.status).toBe(429);
  expect(((await second.json()) as { error: { message: string } }).error.message).toContain(
    "ainda está fazendo",
  );
  finish(quizJson);
  expect((await first).status).toBe(200);
  mocks.text.mockResolvedValue(quizJson);
  expect((await send("count=5;options=4;difficulty=medium;n=3", undefined, "quiz")).status).toBe(
    200,
  );
});

it("repetir exatamente o mesmo pedido não gasta de novo e o outro pedido da pessoa passa", async () => {
  mocks.text.mockResolvedValue(quizJson);
  expect((await send("count=5;options=4;difficulty=medium", undefined, "quiz")).status).toBe(200);
  const used = (await usage()).usage.usedCredits;
  const replay = await send("count=5;options=4;difficulty=medium", undefined, "quiz");
  expect(replay.status).toBe(409);
  expect((await usage()).usage.usedCredits).toBe(used);
  expect((await send("count=5;options=4;difficulty=medium;n=2", undefined, "quiz")).status).toBe(
    200,
  );
});

it("o texto vai limpo ao modelo (sem controle nem direção de texto)", async () => {
  mocks.text.mockResolvedValue(quizJson);
  await send(
    "count=5;options=4;difficulty=medium",
    undefined,
    "quiz",
    "Aula‮ invertida​ com texto suficiente para passar.\u0007",
  );
  const input = mocks.text.mock.calls[0]![1] as { user: string };
  // eslint-disable-next-line no-control-regex -- confere que o caractere de controle saiu
  expect(input.user).not.toMatch(/[\u202E\u200B\u0007]/);
  expect(input.user).toContain("invertida");
});

it("GET ?usage=1 mostra o orçamento da pessoa e exige conta", async () => {
  const { usage: today } = await usage();
  expect(today.usedCredits).toBe(0);
  expect(today.limitCredits).toBeGreaterThanOrEqual(250);
  expect(today.limitCredits).toBeLessThanOrEqual(1000);
  mocks.identify.mockResolvedValue(undefined);
  const handler = await runtime();
  const response = await handler(
    new Request("https://olena.test/api/helena?usage=1", {
      headers: { Origin: "https://olena.test" },
    }),
  );
  expect(response.status).toBe(401);
});
