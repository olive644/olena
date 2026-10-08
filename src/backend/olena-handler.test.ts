import { afterEach, describe, expect, it, vi } from "vitest";
import { handleOlena } from "./olena-handler";
import olenaApi from "../../api/olena";

const origin = "https://olena.example";
function get(query = "") {
  return new Request(`${origin}/api/olena${query}`);
}
afterEach(() => vi.unstubAllGlobals());

describe("API oficial da Olena", () => {
  it("serve o catálogo pela função real de implantação sem chamar serviços externos", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await olenaApi(get());
    expect(response).toBeInstanceOf(Response);
    if (!response) throw new Error("Resposta ausente");
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Olena-API-Version")).toBe("1");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    await expect(response.json()).resolves.toMatchObject({
      version: 1,
      service: "olena",
      capabilities: {
        catalog: "available",
        methodologies: "foundation",
        textGeneration: "not_configured",
        voice: "not_supported",
      },
      methodologies: [],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("lista seis ilhas com identificadores estáveis, sem foto, progresso ou credenciais", async () => {
    const response = await handleOlena(get("?version=1&action=islands"));
    const payload = await response.json();
    expect(payload.version).toBe(1);
    expect(payload.islands.map((island: { id: string }) => island.id)).toEqual([
      "languages",
      "portuguese",
      "chemistry",
      "biology",
      "mathematics",
      "programming",
    ]);
    expect(payload.islands[0].trail).toBe("available");
    expect(
      payload.islands.slice(1).every((island: { trail: string }) => island.trail === "planned"),
    ).toBe(true);
    expect(payload.islands.at(-1).topics).toEqual(["Python", "JavaScript", "HTML", "CSS"]);
    for (const island of payload.islands)
      expect(Object.keys(island).sort()).toEqual([
        "description",
        "id",
        "subject",
        "title",
        "topics",
        "trail",
      ]);
  });

  it.each(["", "&island=languages", "&island=programming"])(
    "não inventa metodologias na consulta %s",
    async (filter) => {
      const response = await handleOlena(get(`?version=1&action=methodologies${filter}`));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        version: 1,
        status: "foundation",
        methodologies: [],
      });
    },
  );

  it.each([
    "?action=methodologies&island=unknown",
    "?action=methodologies&island=",
    "?action=catalog&island=languages",
    "?action=islands&island=languages",
    "?action=catalog&workspace=private",
    "?action=catalog&action=methodologies",
    "?version=1&version=1",
    "?action=methodologies&island=languages&island=programming",
  ])("rejeita filtros extras ou ambíguos: %s", async (query) => {
    const response = await handleOlena(get(query));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      version: 1,
      error: { code: "invalid_request" },
    });
  });

  it.each(["2", "01", "", "v1"])("rejeita a versão %s", async (version) => {
    const response = await handleOlena(get(`?version=${version}`));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unsupported_version" },
    });
  });

  it.each(["speech", "generate", "admin", ""])(
    "não apresenta %s como capacidade ativa",
    async (action) => {
      const response = await handleOlena(get(`?action=${action}`));
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({ error: { code: "not_found" } });
    },
  );

  it.each(["POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])(
    "não aceita escrita ou execução via %s",
    async (method) => {
      const response = await handleOlena(new Request(`${origin}/api/olena`, { method }));
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("GET");
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "method_not_allowed" },
      });
    },
  );
});
