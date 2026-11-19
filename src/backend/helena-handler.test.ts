import { ModelProviderQuotaError } from "../ai/event-stream";
import { describe, expect, it, vi } from "vitest";
import { HELENA_API_VERSION, type HelenaRequest } from "../ai/helena-contract";
import { createHelenaHandler, type HelenaHandlerDependencies } from "./helena-handler";

const origin = "https://helena.example";
const validRequest: HelenaRequest = {
  version: HELENA_API_VERSION,
  capability: "summarize",
  prompt: "Resuma o conteúdo selecionado.",
  sources: [{ id: "material-1", kind: "material", title: "Aula", content: "Conteúdo da aula" }],
  privacy: { consent: true, retention: "none" },
};

function dependencies(
  overrides: Partial<HelenaHandlerDependencies> = {},
): HelenaHandlerDependencies {
  return {
    allowedOrigins: [origin],
    identifyClient: () => "anonymous:test-client",
    rateLimiter: { consume: vi.fn().mockResolvedValue(true) },
    provider: {
      generate: vi
        .fn()
        .mockResolvedValue({ answer: "Resumo seguro.", suggestions: ["Revise amanhã"] }),
    },
    createRequestId: () => "request-1",
    now: () => new Date("2026-08-30T00:00:00.000Z"),
    ...overrides,
  };
}

function post(body: unknown, requestOrigin = origin): Request {
  return new Request(`${origin}/api/helena`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: requestOrigin },
    body: JSON.stringify(body),
  });
}

describe("handler da Helena", () => {
  it("com a conversa desligada, só o resumo passa; o resto recebe 410 sem gastar cota", async () => {
    const deps = dependencies({ chatEnabled: false });
    const handler = createHelenaHandler(deps);
    const chat = await handler(post({ ...validRequest, capability: "tutor" }));
    expect(chat.status).toBe(410);
    expect((await chat.json()).error.message).toContain("desligada");
    expect(deps.rateLimiter.consume).not.toHaveBeenCalled();
    expect(deps.provider.generate).not.toHaveBeenCalled();
    expect((await handler(post(validRequest))).status).toBe(200);
  });
  it("responde os avisos em inglês quando o app manda X-App-Language: en-US", async () => {
    const deps = dependencies({
      chatEnabled: false,
      rateLimiter: {
        consume: vi.fn().mockResolvedValue({ limit: "study-user-day", retryAfterSeconds: 60 }),
      },
    });
    const handler = createHelenaHandler(deps);
    const withLanguage = (body: unknown) =>
      new Request(`${origin}/api/helena`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin, "X-App-Language": "en-US" },
        body: JSON.stringify(body),
      });
    const limited = await handler(withLanguage(validRequest));
    expect(limited.status).toBe(429);
    expect((await limited.json()).error.message).toMatch(/2 summaries with Olena today.*9 pm/);
    const off = await handler(withLanguage({ ...validRequest, capability: "explain" }));
    expect((await off.json()).error.message).toMatch(/turned off/);
  });
  it("não gera para usuário sem autenticação", async () => {
    const deps = dependencies({ identifyClient: () => "" });
    expect((await createHelenaHandler(deps)(post(validRequest))).status).toBe(401);
    expect(deps.provider.generate).not.toHaveBeenCalled();
    expect(deps.rateLimiter.consume).not.toHaveBeenCalled();
  });
  it("valida, limita e encaminha somente o contrato permitido", async () => {
    const deps = dependencies();
    const response = await createHelenaHandler(deps)(post(validRequest));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      version: HELENA_API_VERSION,
      requestId: "request-1",
      answer: "Resumo seguro.",
      suggestions: ["Revise amanhã"],
      generatedAt: "2026-08-30T00:00:00.000Z",
    });
    expect(deps.rateLimiter.consume).toHaveBeenCalledWith(
      "anonymous:test-client",
      expect.any(Request),
      "summarize",
    );
    expect(deps.provider.generate).toHaveBeenCalledWith(validRequest, expect.any(AbortSignal));
  });

  it("bloqueia outra origem antes de chamar o provedor", async () => {
    const deps = dependencies();
    const response = await createHelenaHandler(deps)(
      post(validRequest, "https://attacker.example"),
    );
    expect(response.status).toBe(403);
    expect(deps.provider.generate).not.toHaveBeenCalled();
  });

  it("exige consentimento antes de chamar o provedor", async () => {
    const deps = dependencies();
    const response = await createHelenaHandler(deps)(
      post({ ...validRequest, privacy: { consent: false, retention: "none" } }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "consent_required" } });
    expect(deps.provider.generate).not.toHaveBeenCalled();
  });

  it("explica qual limite acabou e quando volta, com Retry-After", async () => {
    const limited = dependencies({
      rateLimiter: {
        consume: vi.fn().mockResolvedValue({ limit: "study-day", retryAfterSeconds: 3600 }),
      },
    });
    const response = await createHelenaHandler(limited)(post(validRequest));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("rate_limited");
    expect(body.error.message).toContain("limite gratuito de hoje");
    expect(body.error.message).toContain("21h");
    expect(body.error.message).not.toContain("automático");
    expect(limited.provider.generate).not.toHaveBeenCalled();
  });

  it("avisa que a cota do provedor acabou, em vez de erro genérico", async () => {
    const exhausted = dependencies({
      provider: { generate: vi.fn().mockRejectedValue(new ModelProviderQuotaError()) },
    });
    const response = await createHelenaHandler(exhausted)(post(validRequest));
    expect(response.status).toBe(429);
    expect(((await response.json()) as { error: { message: string } }).error.message).toContain(
      "limite gratuito de hoje",
    );
  });

  it("aplica limite de uso e esconde falhas internas do provedor", async () => {
    const limited = dependencies({ rateLimiter: { consume: vi.fn().mockResolvedValue(false) } });
    expect((await createHelenaHandler(limited)(post(validRequest))).status).toBe(429);
    expect(limited.provider.generate).not.toHaveBeenCalled();

    const unavailable = dependencies({
      provider: { generate: vi.fn().mockRejectedValue(new Error("segredo interno")) },
    });
    const response = await createHelenaHandler(unavailable)(post(validRequest));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("segredo interno");
  });
});
