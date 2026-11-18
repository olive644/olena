import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { isExam, parseExam, studyableQuestions } from "./exam";
import { examQuizQuestions } from "./exam-study";
import { flashcardsFromPdf, summarizePdf } from "./index";
import { readPdf } from "./pdf-source";
import type { Fixture, FixtureBlock } from "./fixtures.test-data";
import { fixturePdf } from "./pdf-fixture.test-data";

// A prova passa pelo leitor de PDF de verdade (pdf.js e a montagem de parágrafos), em uma e em duas
// colunas, com cabeçalho e número de página, para conferir que as questões sobrevivem à leitura.

const p = (text: string): FixtureBlock => ({ kind: "paragraph", text });
const question = (n: number, stem: string, options: string[]): FixtureBlock[] => [
  p(`QUESTÃO ${n}`),
  p(stem),
  ...options.map((option, index) => p(`${"ABCDE"[index]}) ${option}`)),
];

const base = [
  ...question(1, "Qual é o processo pelo qual as plantas produzem glicose usando luz?", [
    "Respiração celular",
    "Fotossíntese",
    "Fermentação",
    "Digestão",
  ]),
  ...question(2, "O ENIAC, um dos primeiros computadores eletrônicos, foi concluído em qual ano?", [
    "1939",
    "1945",
    "1957",
    "1969",
  ]),
  ...question(3, "Qual gás as plantas liberam durante a fotossíntese?", [
    "Oxigênio",
    "Nitrogênio",
    "Hélio",
    "Metano",
  ]),
  ...question(
    4,
    "Sobre os estados da matéria, assinale a alternativa que descreve corretamente o comportamento de um líquido.",
    [
      "Possui forma e volume definidos, como um sólido.",
      "Toma a forma do recipiente que o contém e mantém o volume.",
      "Expande-se até ocupar todo o espaço disponível no ambiente.",
      "Não flui e não muda de forma com a temperatura nem com a pressão.",
    ],
  ),
  ...question(5, "Qual é a passagem direta do estado sólido para o gasoso?", [
    "Fusão",
    "Sublimação",
    "Condensação",
    "Solidificação",
  ]),
  p("GABARITO"),
  p("1-B 2-B 3-A 4-B 5-B"),
];

const PROVA: Fixture = {
  name: "prova",
  title: "Prova de Ciências",
  blocks: base,
  gold: [],
  forbidden: [],
};

const layouts = [
  { name: "uma coluna", options: { header: "Colégio Exemplo 2026", footerNumbers: true } },
  { name: "duas colunas", options: { columns: 2 as const, header: "Colégio Exemplo 2026" } },
];

describe("prova em PDF de verdade", () => {
  for (const layout of layouts) {
    it(`lê as 5 questões e o gabarito em ${layout.name}`, async () => {
      const pdf = await getDocument({ data: fixturePdf(PROVA, layout.options), verbosity: 0 })
        .promise;
      const doc = await readPdf(pdf, { title: "prova.pdf" });
      const exam = parseExam(doc);
      expect(isExam(exam)).toBe(true);
      expect(exam.questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5]);
      expect(exam.questions.map((q) => q.answer)).toEqual([1, 1, 0, 1, 1]);
      expect(exam.questions.every((q) => q.options.length === 4)).toBe(true);
      expect(exam.questions[0]!.options[1]).toBe("Fotossíntese");
      expect(exam.questions[3]!.options[1]).toContain("Toma a forma do recipiente");
      // cabeçalho do colégio não entra em nenhuma alternativa
      expect(JSON.stringify(exam.questions)).not.toContain("Colégio Exemplo");
      expect(studyableQuestions(exam)).toHaveLength(5);
      expect(examQuizQuestions(exam)).toHaveLength(5);
    });
  }

  it("flashcards e resumo saem da prova pelo mesmo caminho do app", async () => {
    const pdf = await getDocument({ data: fixturePdf(PROVA), verbosity: 0 }).promise;
    const cards = await flashcardsFromPdf(pdf, { title: "prova.pdf" });
    expect(cards).toHaveLength(10);
    expect(cards.filter((card) => card.back.startsWith("Verdadeiro.")).length).toBe(5);
    const again = await getDocument({ data: fixturePdf(PROVA), verbosity: 0 }).promise;
    const summary = await summarizePdf(again, { title: "prova.pdf" });
    expect(summary.markdown).toContain("5 questões encontradas, 5 com gabarito no arquivo");
  });
});
