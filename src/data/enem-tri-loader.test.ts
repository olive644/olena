import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("não solicita parâmetros quando a edição não tem correspondência validada", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ papers: {} }) });
  vi.stubGlobal("fetch", fetchMock);
  const { loadEnemTriBundle } = await import("./enem-tri");
  expect(await loadEnemTriBundle("2026", "humanities")).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("permite tentar novamente após falha de rede, sem usar um caderno diferente", async () => {
  const index = JSON.parse(readFileSync("public/enem/tri/index.json", "utf8"));
  const [id, areas] = Object.entries(index.papers)[0] as [string, Record<string, string>];
  const section = Object.keys(areas)[0]!,
    file = areas[section]!;
  const bundle = JSON.parse(readFileSync(`public/enem/tri/${file}`, "utf8"));
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce({ ok: true, json: async () => index })
    .mockResolvedValueOnce({ ok: true, json: async () => bundle });
  vi.stubGlobal("fetch", fetchMock);
  const { loadEnemTriBundle } = await import("./enem-tri");
  await expect(loadEnemTriBundle(id, section)).rejects.toThrow("offline");
  expect((await loadEnemTriBundle(id, section))?.variantId).toBe(id);
  expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
    "/enem/tri/index.json",
    "/enem/tri/index.json",
    `/enem/tri/${file}`,
  ]);
});
