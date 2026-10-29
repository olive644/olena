import { expect, it } from "vitest";
import ARCANA_CARDS from "../../public/arcana/catalog.json";
import english from "../../public/arcana/tarot-api.json";
import portuguese from "../../public/arcana/tarot-ptbr.json";

type Entry = { name: string; upright: string; reversed: string; description: string };
const fields = ["name", "upright", "reversed", "description"] as const;
const en = english as Record<string, Entry>;
const pt = portuguese as Record<string, Entry>;
const englishWords = /\b(the|and|which|with|his|her|is|are|of the)\b/gi;

it("traduz integralmente as 78 cartas, com a mesma identidade e o título do catálogo", () => {
  expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
  expect(ARCANA_CARDS).toHaveLength(78);
  for (const card of ARCANA_CARDS) {
    expect(pt[card.apiId]?.name, card.id).toBe(card.title);
    for (const field of fields) expect(pt[card.apiId]?.[field], `${card.id}.${field}`).toBeTruthy();
  }
});

it("não deixa trecho em inglês, nem resumo no lugar do texto de Waite", () => {
  for (const [id, entry] of Object.entries(pt)) {
    for (const field of fields) {
      expect(entry[field], `${id}.${field}`).not.toBe(en[id]?.[field]);
      expect(entry[field].match(englishWords)?.length ?? 0, `${id}.${field}`).toBeLessThan(3);
    }
    expect(entry.description.split("\n"), id).toHaveLength(en[id]!.description.split("\n").length);
    expect(entry.description.length, id).toBeGreaterThan(en[id]!.description.length * 0.7);
    expect(entry.upright.length, id).toBeGreaterThan(en[id]!.upright.length * 0.7);
  }
});

it("não usa travessões no texto", () => {
  expect(JSON.stringify(portuguese)).not.toMatch(/[\u2014\u2013]|--/);
});

it("preserva a lacuna da fonte na Torre e o corte do Cinco de Paus com nota editorial", () => {
  expect(en["ar16"]?.description).toContain("House of We");
  expect(pt["ar16"]?.description).toContain("Casa de “We” [nota editorial:");
  expect(pt["ar16"]?.description).not.toContain("Aflição");
  expect(en["wa05"]?.description.endsWith("hereto correspond the")).toBe(true);
  expect(pt["wa05"]?.description).toContain("a isso correspondem os [Trecho incompleto na fonte");
});
