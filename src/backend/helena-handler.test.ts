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
    expect(deps.rateLimiter.consume).toHaveBeenCalledWith("anonymous:test-client");
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
