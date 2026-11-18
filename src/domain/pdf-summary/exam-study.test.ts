import { describe, expect, it } from "vitest";
import { applyAnswerKey, parseExam } from "./exam";
import { examFlashcards, examProblem, examQuizQuestions, examSummary } from "./exam-study";
import { flashcardsFromPlainText, summarizePlainText } from "./index";
import { structureText } from "./layout";

const PROVA = `Prova de Ciências

QUESTÃO 1
Qual é o processo pelo qual as plantas produzem glicose usando luz?
A) Respiração celular
B) Fotossíntese
C) Fermentação
D) Digestão

QUESTÃO 2
O ENIAC foi concluído em qual ano?
(A) 1939
(B) 1945
(C) 1957
(D) 1969

QUESTÃO 3
Observe a figura abaixo e responda: qual órgão está indicado pela seta?
A) Coração
B) Pulmão
C) Fígado
D) Rim

QUESTÃO 4
Sobre os estados da matéria, assinale a alternativa correta.
A) O gás tem forma e volume definidos.
B) O líquido toma a forma do recipiente que o contém.
C) O sólido não possui forma própria.
D) A sublimação é a passagem do líquido para o sólido.

QUESTÃO 5
Qual gás as plantas liberam na fotossíntese?
a) Oxigênio
b) Nitrogênio
c) Hélio
d) Metano
`;
const KEY = "\nGABARITO\n1-B 2-B 3-A 4-B 5-A\n";
const parse = (text: string) => parseExam(structureText(text, "Prova"));

describe("material de estudo de uma prova", () => {
  it("vira flashcards de verdadeiro ou falso com o gabarito no verso", async () => {
    const cards = await flashcardsFromPlainText(PROVA + KEY, "prova");
    // 4 questões estudáveis (a da figura fica de fora), duas afirmações cada
    expect(cards).toHaveLength(8);
    const truths = cards.filter((card) => card.back.startsWith("Verdadeiro."));
    const lies = cards.filter((card) => card.back.startsWith("Falso."));
    expect(truths).toHaveLength(4);
    expect(lies).toHaveLength(4);
    expect(truths[0]!.front).toContain("Resposta: Fotossíntese");
    expect(truths[0]!.back).toBe("Verdadeiro. Gabarito: B) Fotossíntese");
    expect(lies[0]!.back).toBe("Falso. O gabarito é B) Fotossíntese");
    expect(lies[0]!.front).not.toContain("Resposta: Fotossíntese");
    expect(cards.every((card) => card.kind === "exam")).toBe(true);
  });

  it("não inventa respostas: sem gabarito explica o que falta", async () => {
    await expect(flashcardsFromPlainText(PROVA, "prova")).rejects.toMatchObject({
      name: "ExamError",
      reason: "no-answer-key",
    });
    expect(examProblem(parse(PROVA))?.reason).toBe("no-answer-key");
    expect(examProblem(parse(PROVA + KEY))).toBeUndefined();
  });

  it("junta a prova e o gabarito de arquivos separados", () => {
    const exam = parse(PROVA);
    const only = parse("GABARITO\n1-B 2-B 3-A 4-B 5-A\n");
    expect(only.questions).toHaveLength(0);
    expect(only.key).toEqual({ 1: 1, 2: 1, 3: 0, 4: 1, 5: 0 });
    const joined = applyAnswerKey(exam, only.key);
    expect(joined.answered).toBe(5);
    expect(examProblem(joined)).toBeUndefined();
    expect(examQuizQuestions(joined)).toHaveLength(4);
  });

  it("quiz e simulado usam as questões reais, com as alternativas e o gabarito do arquivo", () => {
    const questions = examQuizQuestions(parse(PROVA + KEY));
    expect(questions.map((question) => question.answer)).toEqual([1, 1, 1, 0]);
    expect(questions[0]!.prompt).toContain("glicose usando luz");
    expect(questions[0]!.options).toHaveLength(4);
    expect(questions[0]!.explanation).toBe("Gabarito: B) Fotossíntese");
  });

  it("resumo da prova lista gabarito, distribuição e questões com figura", async () => {
    const summary = await summarizePlainText(PROVA + KEY, "Prova de Ciências");
    expect(summary.stats.sentences).toBe(5);
    expect(summary.markdown).toContain("5 questões encontradas, 5 com gabarito no arquivo");
    expect(summary.markdown).toContain("1 dependem de figura ou gráfico");
    expect(summary.markdown).toContain("| 3 | A |");
    expect(summary.markdown).toContain("**Distribuição das respostas:** A 2, B 3");
    expect(summary.markdown).toContain("**B) Fotossíntese**");
    expect(summary.markdown).toContain("Questões que citam figura, gráfico ou tabela: 3");
    const noKey = examSummary(parse(PROVA), "Prova");
    expect(noKey).toContain("não traz o gabarito");
  });

  it("texto comum continua com o caminho de sempre", async () => {
    const cards = await flashcardsFromPlainText(
      "A fotossíntese é o processo pelo qual as plantas transformam energia luminosa em energia química. A planta usa gás carbônico, água e luz para produzir glicose e liberar oxigênio. O cloroplasto é a organela que contém a clorofila, pigmento verde que absorve a luz do sol.",
      "texto",
    );
    expect(cards.every((card) => card.kind !== "exam")).toBe(true);
    expect(examFlashcards(parse("sem questões"))).toEqual([]);
  });
});
