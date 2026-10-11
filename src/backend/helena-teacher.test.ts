import { describe, expect, it, vi } from "vitest";
import { createCloudflareTeacher } from "./helena-teacher";
import type { HelenaRequest } from "../ai/helena-contract";

const request: HelenaRequest = {
  version: 1,
  capability: "tutor",
  prompt: "Explique divisão",
  sources: [],
  privacy: { consent: true, retention: "none" },
};
const config = {
  accountId: "a".repeat(32),
  token: "server-secret",
  model: "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
};
describe("professor Cloudflare", () => {
  it("envia política e dados em papéis separados, limita geração e não envia identidade", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, result: { response: "Uma divisão separa em grupos." } }),
        ),
      );
    await expect(createCloudflareTeacher(config, fetcher).generate(request)).resolves.toEqual({
      answer: "Uma divisão separa em grupos.",
      suggestions: [],
    });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${config.model}`,
    );
    expect(init?.headers).toMatchObject({ Authorization: "Bearer server-secret" });
    const body = JSON.parse(String(init?.body));
    expect(body.messages[0].role).toBe("system");
    expect(JSON.parse(body.messages[1].content)).toEqual({
      capability: "tutor",
      sources: [],
      prompt: "Explique divisão",
    });
    expect(body.max_tokens).toBe(700);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
  it("não chama rede sem configuração ou com caminho de modelo inválido", async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const invalid of [
      { ...config, token: "" },
      { ...config, accountId: "bad/id" },
      { ...config, model: "https://evil.test" },
    ])
      await expect(createCloudflareTeacher(invalid, fetcher).generate(request)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([429, 500, 401])(
    "não repete solicitações nem revela detalhes de HTTP %s",
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("secret upstream detail", { status }));
      await expect(createCloudflareTeacher(config, fetcher).generate(request)).rejects.toThrow(
        "Professor indisponível.",
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    { success: false },
    { success: true, result: { response: "" } },
    { success: true, result: { response: 5 } },
    { success: true, result: { response: "x".repeat(12001) } },
  ])("rejeita resposta inválida", async (payload) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)));
    await expect(createCloudflareTeacher(config, fetcher).generate(request)).rejects.toThrow();
  });
});
