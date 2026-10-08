import { describe, expect, it } from "vitest";
import { PRACTICE_ISLANDS } from "../data/practice-islands";
import { isOlenaIslandId, olenaCatalog, olenaIslands, olenaMethodologies } from "./olena";

describe("catálogo da Olena", () => {
  it("deriva as ilhas da mesma fonte usada em Praticar", () => {
    expect(olenaIslands().map((island) => island.title)).toEqual(
      PRACTICE_ISLANDS.map((island) => island.title),
    );
    expect(new Set(olenaIslands().map((island) => island.id)).size).toBe(6);
  });
  it("valida IDs sem aceitar posição, título ou dados do usuário", () => {
    expect(isOlenaIslandId("biology")).toBe(true);
    for (const value of [1, "Biologia", "", null, {}, "../languages", "LANGUAGES"])
      expect(isOlenaIslandId(value)).toBe(false);
  });
  it("retorna cópias de metadados sem modificar as ilhas", () => {
    const islands = olenaIslands();
    islands.pop();
    islands[0]!.topics.pop();
    expect(olenaIslands()).toHaveLength(6);
    expect(olenaIslands()[0]!.topics).toHaveLength(4);
  });
  it("é uma base de metodologias e texto, não uma tutora ou voz simulada", () => {
    expect(olenaMethodologies()).toEqual([]);
    expect(olenaMethodologies("biology")).toEqual([]);
    expect(olenaCatalog().capabilities.textGeneration).toBe("not_configured");
    expect(olenaCatalog().capabilities.voice).toBe("not_supported");
  });
});
