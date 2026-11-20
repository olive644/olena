import { describe, expect, it, vi } from "vitest";
import { HELENA_API_VERSION, type HelenaRequest } from "../ai/helena-contract";
import { HelenaClientError, fetchHelenaUsage, requestHelena, streamHelena } from "./helena-client";

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
      "X-App-Language": "pt-BR",
      "Idempotency-Key": expect.stringMatching(/^[A-Za-z0-9_-]{16,80}$/),
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

  it("mostra o aviso de cota do servidor em vez de 'Serviço indisponível'", async () => {
    const message =
      "A Olena atingiu o limite gratuito de hoje. Ela volta às 21h (horário de Brasília).";
    const body = JSON.stringify({ version: 1, error: { code: "rate_limited", message } });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(body, { status: 429 }));
    await expect(requestHelena(request, { fetcher })).rejects.toMatchObject({
      code: "rate_limited",
      message,
    });
    await expect(streamHelena(request, { fetcher, onText: () => {} })).rejects.toMatchObject({
      code: "rate_limited",
      message,
    });
  });

  it("não exibe texto arbitrário de proxy ou de outros erros", async () => {
    const proxy = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response("<html>Too many requests from proxy</html>", { status: 429 }),
      );
    await expect(requestHelena(request, { fetcher: proxy })).rejects.toMatchObject({
      code: "rate_limited",
      message: "Serviço indisponível. Tente mais tarde.",
    });
    const other = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ error: { code: "provider_unavailable", message: "segredo interno" } }),
            { status: 503 },
          ),
      );
    await expect(streamHelena(request, { fetcher: other, onText: () => {} })).rejects.toMatchObject(
      { message: "Serviço indisponível. Tente mais tarde." },
    );
  });

  it("mostra o aviso de cota que chega no meio do fluxo", async () => {
    const message =
      "A Olena atingiu o limite gratuito de hoje. Ela volta às 21h (horário de Brasília).";
    const stream = `data: ${JSON.stringify({ type: "error", code: "rate_limited", message })}\n\n`;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () =>
          new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
      );
    await expect(streamHelena(request, { fetcher, onText: () => {} })).rejects.toMatchObject({
      code: "rate_limited",
      message,
    });
  });

  it("cada tentativa leva uma chave de idempotência nova", async () => {
    const ok = () =>
      new Response(
        JSON.stringify({
          version: HELENA_API_VERSION,
          requestId: "r",
          answer: "ok",
          suggestions: [],
          generatedAt: "2026-08-30T00:00:00.000Z",
        }),
        { status: 200 },
      );
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => ok());
    await requestHelena(request, { fetcher });
    await requestHelena(request, { fetcher });
    const keys = fetcher.mock.calls.map(
      ([, init]) => (init?.headers as Record<string, string>)["Idempotency-Key"],
    );
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("mostra a mensagem do servidor para limite, texto grande e pedido repetido", async () => {
    const answer = (status: number, code: string, message: string) =>
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ version: HELENA_API_VERSION, error: { code, message } }), {
          status,
        }),
      );
    await expect(
      requestHelena(request, {
        fetcher: answer(413, "invalid_request", "Esse texto é grande demais para um pedido só."),
      }),
    ).rejects.toMatchObject({ message: "Esse texto é grande demais para um pedido só." });
    await expect(
      requestHelena(request, {
        fetcher: answer(409, "invalid_request", "Esse pedido já foi enviado."),
      }),
    ).rejects.toMatchObject({ message: "Esse pedido já foi enviado." });
    await expect(
      requestHelena(request, {
        fetcher: answer(
          429,
          "rate_limited",
          "Você usou seus créditos de hoje na Olena (410 de 450).",
        ),
      }),
    ).rejects.toMatchObject({ code: "rate_limited" });
    // erro de validação interno não aparece para a pessoa
    await expect(
      requestHelena(request, {
        fetcher: answer(400, "invalid_request", "Campo inventado: privacy.extra"),
      }),
    ).rejects.toMatchObject({ message: "Serviço indisponível. Tente mais tarde." });
  });

  it("busca o orçamento do dia só com conta e só aceita números válidos", async () => {
    const usage = {
      usedCredits: 12,
      limitCredits: 480,
      remainingCredits: 468,
      requestMaxCredits: 300,
      resetInSeconds: 3600,
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ version: 1, usage }), { status: 200 }));
    expect(await fetchHelenaUsage({ fetcher })).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
    expect(await fetchHelenaUsage({ fetcher, token: "t" })).toEqual(usage);
    expect(fetcher.mock.calls[0]![0]).toBe("/api/helena?usage=1");
    const bad = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ usage: { ...usage, usedCredits: -1 } }), { status: 200 }),
      );
    expect(await fetchHelenaUsage({ fetcher: bad, token: "t" })).toBeUndefined();
    const down = vi.fn<typeof fetch>().mockRejectedValue(new Error("rede"));
    expect(await fetchHelenaUsage({ fetcher: down, token: "t" })).toBeUndefined();
  });
});
