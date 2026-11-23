import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import fixtures from "./fixtures/enem-tri-reference.json";
import { calculateEnemTri, validateTriBundle, type EnemLanguage } from "./enem-tri";
import { answerRows } from "./enem-answer-rows";
import { enemSections } from "./enem-sections";

it("reproduz 398 casos Python/NumPy, incluindo 200 notas oficiais de 2022", () => {
  let official = 0;
  for (const fixture of fixtures) {
    const raw: unknown = JSON.parse(readFileSync(`public/enem/tri/${fixture.file}`, "utf8"));
    const bundle = validateTriBundle(raw, fixture.file.split("-")[0]!, fixture.section);
    const result = calculateEnemTri(
      bundle,
      fixture.section,
      fixture.answers,
      fixture.language as EnemLanguage,
    );
    expect(result.score, `${fixture.file} ${fixture.case} ${fixture.language}`).toBeCloseTo(
      fixture.expected,
      1,
    );
    if ("officialScore" in fixture && typeof fixture.officialScore === "number") {
      official++;
      expect(Math.abs(result.score - fixture.officialScore)).toBeLessThanOrEqual(0.1);
    }
  }
  expect(fixtures).toHaveLength(398);
  expect(official).toBe(200);
});
it("rejeita caderno, área, parâmetros e idioma incompatíveis", () => {
  const fixture = fixtures[0]!;
  const raw = JSON.parse(readFileSync(`public/enem/tri/${fixture.file}`, "utf8"));
  expect(() => validateTriBundle(raw, "outro-caderno", fixture.section)).toThrow();
  expect(() => validateTriBundle(raw, raw.variantId, "inexistente")).toThrow();
  const invalid = structuredClone(raw);
  invalid.items[0].a = -1;
  invalid.items[0].excluded = false;
  expect(() => validateTriBundle(invalid, raw.variantId, fixture.section)).toThrow();
  const bundle = validateTriBundle(raw, raw.variantId, fixture.section);
  expect(calculateEnemTri(bundle, fixture.section, {}, "english").score).toBe(0);
});
it("Linguagens usa somente 45 respostas do idioma escolhido", () => {
  const section = enemSections(2022, 1)[0]!;
  const english = answerRows(section, "english"),
    spanish = answerRows(section, "spanish");
  expect(english).toHaveLength(45);
  expect(spanish).toHaveLength(45);
  expect(english.some((row) => row.key.startsWith("spanish:"))).toBe(false);
  expect(spanish.some((row) => row.key.startsWith("english:"))).toBe(false);
});
it("não publica estimativa para 2026 nem para cadernos sem validação", () => {
  const index = JSON.parse(readFileSync("public/enem/tri/index.json", "utf8"));
  for (const areas of Object.values(index.papers) as Record<string, string>[])
    for (const file of Object.values(areas)) {
      const bundle = JSON.parse(readFileSync(`public/enem/tri/${file}`, "utf8"));
      expect(bundle.year).toBeLessThanOrEqual(2025);
      expect(bundle.items.length).toBe(bundle.area === "LC" ? 50 : 45);
    }
});

it("nenhum caderno servido pelo app tem erro médio acima do limite da calibração", () => {
  // Provas fora da calibração ficam sem pontuação ("Indisponível nesta edição"). Se um caderno
  // com erro alto entrar em public/enem/tri, scripts/build-enem-tri-accuracy.py o lista aqui.
  const accuracy = JSON.parse(readFileSync("public/enem/tri/accuracy.json", "utf8")) as {
    files: Record<string, unknown>;
  };
  expect(Object.keys(accuracy.files)).toEqual([]);
});
