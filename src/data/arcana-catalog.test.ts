import { expect, it, vi } from "vitest";
import { loadArcanaCatalog } from "./arcana-catalog";
import cards from "../../public/arcana/catalog.json";
it("rejects malformed remote metadata and permits an explicit retry", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "bad", asset: "https://bad" }])))
    .mockResolvedValueOnce(new Response(JSON.stringify(cards)));
  vi.stubGlobal("fetch", fetcher);
  await expect(loadArcanaCatalog()).rejects.toThrow("catalog");
  await expect(loadArcanaCatalog()).resolves.toHaveLength(78);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
