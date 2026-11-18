import { describe, expect, it } from "vitest";
import { isExam, parseExam } from "./exam";
import { pickKeySection, readKeyLines } from "./exam-key";
import { splitExams } from "./index";
import { isGarbled, readPdf, type PdfDocumentLike } from "./pdf-source";
import type { StructuredDocument } from "./types";

// Formatos que apareceram em provas e gabaritos reais de concurso (textos escritos aqui, só com a
// mesma estrutura): texto-base compartilhado por várias questões, "(E))" com parêntese a mais,
// enunciado que abre com reticências, separador de questões e gabarito em tabela.

const doc = (lines: string[]): StructuredDocument => ({
  title: "x",
  language: "pt",
  pages: 1,
  blocks: [],
  characters: 0,
  lines: lines.map((text) => ({ text, page: 1 })),
});

const PROVA = [
  "PREFEITURA EXEMPLO Concurso Público Prova Cargo SG3, Tipo 1",
  "INSTRUÇÕES",
  "- Marque as respostas primeiro a lápis e depois cubra com caneta.",
  "- Você terá 3 horas para responder a todas as questões.",
  "CONHECIMENTOS GERAIS",
  "Atenção: As questões de números 1 a 3 baseiam-se no texto",
  "apresentado abaixo.",
  "A exploração sustentável de uma floresta significa retirar",
  "menos do que ela pode repor, para que ela dure muitos anos.",
  "(Adaptado de Revista Exemplo, 2001)",
  "1. A resposta à primeira pergunta do texto é SIM, somente se",
  "(A) for feita por quem sobrevive da natureza.",
  "(B) os caçadores obtiverem lucros imediatos.",
  "(C) a caça for um esporte legalmente permitido.",
  "(D) for impedida a entrada de pessoas de fora.",
  "(E)) houver exploração sustentável da mata.",
  "_________________________________________________",
  "2. O texto informa que a exploração sustentável tem como objetivo",
  "(A) valorizar um esporte pouco conhecido.",
  "(B) agradar quem se preocupa com a conservação.",
  "(C)) controlar o número de animais de uma região.",
  "(D) obter lucros com taxas e impostos.",
  "(E) auxiliar a natureza a repor as perdas.",
  "_________________________________________________",
  "3. ... ou seja, um corte selecionado e controlado.",
  "Considerado o contexto, a frase acima contém uma noção de",
  "(A) causa.",
  "(B) condição.",
  "(C) conclusão.",
  "(D)) explicação.",
  "(E) finalidade.",
  "Atenção: As questões de números 4 e 5 baseiam-se no texto",
  "O costume de numerar as casas começou nas cidades europeias",
  "e hoje segue princípios diferentes em cada lugar do mundo.",
  "4. De acordo com o texto, o costume de numerar as casas",
  "(A) segue sempre o mesmo princípio.",
  "(B) começou na Europa e hoje varia.",
  "(C) partiu da necessidade de identificar prédios.",
  "(D) surgiu há pouco tempo.",
  "(E) cria dificuldades em cidades antigas.",
  "5. Segundo o texto,",
  "(A) a contagem começa pela primeira casa.",
  "(B) todas as ruas correm lado a lado.",
  "(C) é indiferente numerar pares ou ímpares.",
  "(D) existe um ponto de partida em cada cidade.",
  "(E) as ruas partem sempre do centro.",
];

describe("prova real de concurso", () => {
  const exam = parseExam(doc(PROVA));

  it("lê as 5 questões, inclusive a que abre com reticências e a com (E))", () => {
    expect(isExam(exam)).toBe(true);
    expect(exam.questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5]);
    expect(exam.questions.every((q) => q.options.length === 5)).toBe(true);
    expect(exam.questions[0]!.options[4]).toBe("houver exploração sustentável da mata.");
    expect(exam.questions[2]!.stem).toContain("ou seja, um corte selecionado");
    expect(exam.questions[2]!.options[3]).toBe("explicação.");
  });

  it("não deixa o separador de questões entrar na alternativa", () => {
    expect(JSON.stringify(exam.questions)).not.toContain("____");
  });

  it("o texto-base vale para todas as questões que ele cobre", () => {
    const [q1, q2, q3, q4, q5] = exam.questions;
    for (const question of [q1!, q2!, q3!]) {
      expect(question.context).toContain("A exploração sustentável de uma floresta");
      expect(question.context).not.toContain("Atenção");
      expect(question.context).not.toContain("Marque as respostas");
    }
    for (const question of [q4!, q5!]) {
      expect(question.context).toContain("O costume de numerar as casas");
      expect(question.context).not.toContain("floresta");
    }
  });

  it("instruções da capa não viram texto de apoio da primeira questão", () => {
    const semBase = parseExam(
      doc([
        "INSTRUÇÕES",
        "- Marque as respostas primeiro a lápis.",
        "- Você terá 3 horas para responder.",
        "1. Qual é a capital da França, país europeu conhecido pela torre?",
        "(A) Lisboa",
        "(B) Paris",
        "(C) Roma",
        "2. Quanto é dois mais dois, na aritmética básica dos números inteiros?",
        "(A) 3",
        "(B) 4",
        "(C) 5",
        "3. Qual a cor do céu limpo durante o dia ensolarado?",
        "(A) Azul",
        "(B) Verde",
        "(C) Preto",
        "4. Qual é a capital da Itália, conhecida pelo Coliseu romano?",
        "(A) Roma",
        "(B) Madri",
        "(C) Paris",
      ]),
    );
    expect(semBase.questions.map((q) => q.context)).toEqual(["", "", "", ""]);
  });
});

describe("gabarito de concurso", () => {
  it('lê o gabarito só de pares, sem a palavra gabarito ("001 - E 010 - E")', () => {
    const lines = ["SG3 - tipo 1"];
    for (let n = 1; n <= 9; n += 1)
      lines.push(
        `${String(n).padStart(3, "0")} - ${"ABCDE"[n % 5]} ${String(n + 9).padStart(3, "0")} - ${"ABCDE"[(n + 2) % 5]}`,
      );
    const { sections } = readKeyLines(lines.map((text) => ({ text })));
    expect(sections).toHaveLength(1);
    expect(sections[0]!.title).toBe("SG3 - tipo 1");
    expect(Object.keys(sections[0]!.key)).toHaveLength(18);
    expect(sections[0]!.key[1]).toBe(1);
    expect(sections[0]!.key[10]).toBe(3);
  });

  it("lê gabarito em tabela de duas colunas com rótulo de faixa", () => {
    const lines = [
      "IBFC_01 – ANALISTA DE SAÚDE – MÉDICO – CLÍNICA – VERSÃO A",
      "QUESTÃO ALTERNATIVA QUESTÃO ALTERNATIVA",
      "1 a 5 – CONHECIMENTOS GERAIS 6 A",
      "1 C 7 E",
      "2 E 8 D",
      "3 A 9 B",
      "4 D 10 D",
      "5 C 11 C",
    ];
    const { sections } = readKeyLines(lines.map((text) => ({ text })));
    expect(sections).toHaveLength(1);
    expect(sections[0]!.key).toMatchObject({ 1: 2, 2: 4, 3: 0, 4: 3, 5: 2, 6: 0, 7: 4, 8: 3 });
  });

  it("não confunde texto comum com gabarito", () => {
    const { sections } = readKeyLines(
      ["1 A resposta é simples.", "2 B", "Questão 3 de 10", "A B C D E"].map((text) => ({ text })),
    );
    expect(sections).toEqual([]);
  });

  const section = (title: string, base: number) => ({
    title,
    key: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, (i + base) % 5])),
  });
  const sections = [
    section("ANALISTA DE SAÚDE – MÉDICO – NEONATOLOGIA – VERSÃO A", 0),
    section("ANALISTA DE SAÚDE – MÉDICO – NEONATOLOGIA – VERSÃO B", 1),
    section("ANALISTA DE SAÚDE – MÉDICO – PEDIATRIA – VERSÃO A", 2),
  ];
  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);

  it("escolhe o gabarito pelo cargo e pela versão, e não escolhe no empate", () => {
    const a = pickKeySection("Analista de Saúde Médico Neonatologia Versão A", sections, numbers);
    expect(a?.title).toContain("NEONATOLOGIA – VERSÃO A");
    const b = pickKeySection("Analista de Saúde Médico Neonatologia VERSÃO B", sections, numbers);
    expect(b?.title).toContain("NEONATOLOGIA – VERSÃO B");
    expect(
      pickKeySection("Prova de Língua Portuguesa Fundamental", sections, numbers),
    ).toBeUndefined();
    expect(pickKeySection("Analista de Saúde Médico", sections, numbers)).toBeUndefined();
  });

  it("não usa gabarito que cobre só parte das questões da prova", () => {
    const partial = {
      title: "ANALISTA DE SAÚDE – MÉDICO – NEONATOLOGIA – VERSÃO A",
      key: { 1: 0, 2: 1, 3: 2 },
    };
    expect(
      pickKeySection(
        "Analista de Saúde Médico Neonatologia Versão A",
        [partial, ...sections.slice(1)],
        numbers,
      ),
    ).toBeUndefined();
  });

  it("prova e gabarito em arquivos separados: usa o gabarito do tipo certo", () => {
    const prova = doc(PROVA);
    const gabarito = (type: number, shift: number) =>
      doc([
        `SG3 - tipo ${type}`,
        ...[1, 2, 3, 4, 5].map(
          (n) => `${String(n).padStart(3, "0")} - ${"ABCDE"[(n + shift) % 5]}`,
        ),
      ]);
    const { exams, others, keyFiles } = splitExams([
      { name: "prova", doc: prova },
      { name: "tipo 2", doc: gabarito(2, 3) },
      { name: "tipo 1", doc: gabarito(1, 0) },
    ]);
    expect(others).toEqual([]);
    expect(keyFiles.map((file) => file.name)).toEqual(["tipo 2", "tipo 1"]);
    expect(exams[0]!.exam.answered).toBe(5);
    expect(exams[0]!.exam.questions.map((q) => q.answer)).toEqual([1, 2, 3, 4, 0]);
    expect(exams[0]!.exam.keyAmbiguous).toBeUndefined();
  });

  it("com vários gabaritos e nenhum certo, avisa em vez de escolher um", () => {
    const outro = (title: string) =>
      doc([title, ...[1, 2, 3, 4, 5].map((n) => `${n} - ${"ABCDE"[n % 5]}`)]);
    const { exams } = splitExams([
      { doc: doc(PROVA) },
      { doc: outro("Prova de Matemática Tipo 7") },
      { doc: outro("Prova de Inglês Tipo 8") },
    ]);
    expect(exams[0]!.exam.answered).toBe(0);
    expect(exams[0]!.exam.keyAmbiguous).toBe(true);
  });
});

describe("PDF com fonte sem mapa de caracteres", () => {
  it("reconhece texto que saiu como símbolos", () => {
    expect(isGarbled([{ text: "❘❙❚❯❱❙❲❳❘❱❨❱❳❩❙❳❬❬❨❘❳❩❭❪❳❱❙❲❳❘❱❨❱❳❩❙❪❫❱❙❲" }])).toBe(true);
    expect(
      isGarbled([{ text: "O ENIAC foi concluído em 1945 na Pensilvânia, nos Estados Unidos." }]),
    ).toBe(false);
    expect(isGarbled([{ text: "curto" }])).toBe(false);
  });

  it("usa o OCR da página quando o texto do PDF é lixo", async () => {
    const garbled = "❘❙❚❯❱❙❲❳❘❱❨❱❳❩❙❳❬❬❨❘❳❩❭❪❳❱❙❲❳❘❱❨❱❳❩❙❪❫❱❙❲";
    const pdf: PdfDocumentLike = {
      numPages: 1,
      getPage: async () => ({
        getViewport: () => ({ width: 595, height: 842 }),
        getTextContent: async () => ({
          items: [
            {
              str: garbled,
              transform: [12, 0, 0, 12, 50, 700],
              width: 300,
              height: 12,
              fontName: "f",
              hasEOL: false,
            },
          ],
        }),
        cleanup: () => {},
      }),
    };
    const asked: number[] = [];
    const result = await readPdf(pdf, {
      title: "prova.pdf",
      ocr: async (page) => {
        asked.push(page);
        return "1. Qual é a capital da França?\n(A) Lisboa\n(B) Paris\n(C) Roma";
      },
    });
    expect(asked).toEqual([1]);
    expect(JSON.stringify(result.lines)).toContain("Qual é a capital da França");
    expect(JSON.stringify(result.lines)).not.toContain("❘");
  });
});
