import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  identify: vi.fn(),
  quota: vi.fn(),
  teacher: vi.fn(),
  student: vi.fn(),
}));
vi.mock("./firebase-account-identity", () => ({
  createFirebaseAccountIdentity: () => mocks.identify,
}));
vi.mock("./firebase-realtime-store", () => ({ createFirebaseRealtimeStore: () => ({}) }));
vi.mock("./rate-limit", () => ({ checkRateLimit: mocks.quota }));
vi.mock("./helena-teacher", () => ({
  createCloudflareTeacher: () => ({ generate: mocks.teacher }),
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
  mocks.teacher.mockResolvedValue({ answer: "Explicação do professor.", suggestions: [] });
  mocks.student.mockReturnValue({ generate: async () => ({ answer: "999", suggestions: [] }) });
});
afterEach(() => vi.unstubAllEnvs());

async function send(prompt: string, address?: string) {
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
        capability: "tutor",
        prompt,
        sources: [],
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
