import { expect, it } from "vitest";
import { drawOliverCards, OLIVER_CARDS } from "./oliver-cards";
import ARCANA_CARDS from "../../public/arcana/catalog.json";
import { activeArcanaId } from "./arcana-ids";
import source from "../../public/arcana/tarot-api.json";
it("defines 78 unique arcana with four suits, 22 majors, no combat stats and matched API identities", () => {
  expect(new Set(ARCANA_CARDS.map((c) => c.id)).size).toBe(78);
  expect(ARCANA_CARDS.filter((c) => c.group === "major")).toHaveLength(22);
  for (const c of ARCANA_CARDS) {
    expect(c).not.toHaveProperty("power");
    expect(source).toHaveProperty(c.apiId);
    expect(c.asset).toMatch(/^\/arcana\//);
  }
  expect(activeArcanaId("oliver-star-tarot")).toBe("major-17");
  expect(activeArcanaId("first-star")).toBeUndefined();
});
it("draws all 77 non-Star arcana without rerolling or invalid random values", () => {
  expect(OLIVER_CARDS).toHaveLength(77);
  OLIVER_CARDS.forEach((c, i) => {
    const rolls = [0, (i + 0.5) / 77];
    expect(drawOliverCards(() => rolls.shift()!)).toEqual([c.id]);
  });
  expect(drawOliverCards(() => 0.99999)).toHaveLength(2);
  for (const n of [-1, 1, NaN, Infinity]) expect(() => drawOliverCards(() => n)).toThrow();
});
