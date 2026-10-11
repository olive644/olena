import { describe, expect, it, vi } from "vitest";
import { HELENA_API_VERSION, type HelenaRequest } from "../ai/helena-contract";
import { HelenaClientError, requestHelena } from "./helena-client";

const request: HelenaRequest = {
  version: HELENA_API_VERSION,
  capability: "tutor",
  prompt: "Faça uma pergunta de cada vez.",
  sources: [],
  privacy: { consent: true, retention: "none" },
};

describe("cliente da Helena", () => {
  it("não envia dados sem consentimento", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      requestHelena(
        { ...request, privacy: { consent: false, retention: "none" } } as unknown as HelenaRequest,
        { fetcher },
      ),
    ).rejects.toMatchObject({ code: "invalid_request" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("usa apenas o endpoint same-origin e não envia credenciais de provedor", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          version: HELENA_API_VERSION,
          requestId: "request-1",
          answer: "What did you study today?",
          suggestions: [],
          generatedAt: "2026-08-30T00:00:00.000Z",
        }),
        { status: 200 },
      ),
    );

    await expect(requestHelena(request, { fetcher })).resolves.toMatchObject({
      requestId: "request-1",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("/api/helena");
    expect(init?.credentials).toBe("same-origin");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
  });

  it("identifica limites sem exibir texto arbitrário do backend", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          version: HELENA_API_VERSION,
          error: { code: "rate_limited", message: "Tente mais tarde." },
        }),
        { status: 429 },
      ),
    );

    const result = requestHelena(request, { fetcher });
    await expect(result).rejects.toBeInstanceOf(HelenaClientError);
    await expect(result).rejects.toMatchObject({ code: "rate_limited" });
  });
});
