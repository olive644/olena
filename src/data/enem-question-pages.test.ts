import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import catalog from "../../public/enem/catalog.json";
import { questionPageEvents, loadQuestionPageIndex } from "./enem-question-pages";

afterEach(() => vi.unstubAllGlobals());

it("localiza a questão 9 com letras fragmentadas e cabeçalhos mistos do PDF", () => {
  expect(questionPageEvents("Q U ES T  Ã  O  09\nO texto").map((event) => event.question)).toEqual([
    9,
  ]);
  expect(questionPageEvents("QUESTãO 109\nEtanol").map((event) => event.question)).toEqual([109]);
  expect(questionPageEvents("Questão 101\nA icterícia").map((event) => event.question)).toEqual([
    101,
  ]);
});

it("preserva idioma e não transforma o artigo O no terceiro dígito da questão", () => {
  expect(questionPageEvents("Questões de 01 a 05 (opção espanhol)\nQUESTÃO 09 O texto")).toEqual([
    expect.objectContaining({ language: "spanish" }),
    expect.objectContaining({ question: 9 }),
  ]);
});

it("cobre cada questão dos dois idiomas e das quatro áreas em todos os 34 cadernos", () => {
  let total = 0;
  for (const paper of catalog.papers) {
    const variant = paper.variants[0]!;
    const index = JSON.parse(readFileSync(`public/enem/page-index/${variant.id}.json`, "utf8")) as {
      paperUrl: string;
      pageCount: number;
      pages: Record<string, number>;
      audit: { missing: string[]; expected: number };
    };
    expect(index.paperUrl).toBe(variant.url);
    expect(index.audit.missing, `${paper.year}/${paper.day}`).toEqual([]);
    const languages = paper.year >= 2017 ? paper.day === 1 : paper.day === 2;
    const first = paper.day === 1 ? 1 : 91;
    for (let n = first; n < first + 90; n++) {
      const keys = languages && n < first + 5 ? [`english:${n}`, `spanish:${n}`] : [`q:${n}`];
      for (const key of keys) {
        const page = index.pages[key];
        expect(page, `${paper.year}/${paper.day}/${key}`).toBeGreaterThan(1);
        expect(page).toBeLessThanOrEqual(index.pageCount);
        total++;
      }
    }
  }
  expect(total).toBe(3145);
});

it("não carrega páginas de outro caderno e aceita a URL local equivalente", async () => {
  const variant = catalog.papers[0]!.variants[0]!;
  const index = JSON.parse(readFileSync(`public/enem/page-index/${variant.id}.json`, "utf8"));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => index }));
  expect(
    await loadQuestionPageIndex(variant.id, `/enem-pdf${new URL(variant.url).pathname}`),
  ).toEqual(index);
  await expect(loadQuestionPageIndex(variant.id, "/enem-pdf/wrong.pdf")).rejects.toThrow();
});
