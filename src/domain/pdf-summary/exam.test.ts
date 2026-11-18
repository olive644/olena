import { describe, expect, it } from "vitest";
import { isExam, parseExam, studyableQuestions } from "./exam";
import { structureText } from "./layout";

const parse = (text: string) => parseExam(structureText(text, "Prova"));

const PROVA = `Prova de Ciências, 8º ano

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
B) O líquido toma a forma do recipiente
que o contém.
C) O sólido não possui forma própria.
D) A sublimação é a passagem do líquido para o sólido.

QUESTÃO 5
Qual gás as plantas liberam na fotossíntese?
a) Oxigênio
b) Nitrogênio
c) Hélio
d) Metano

GABARITO
1-B 2-B 3-A 4-B 5-A
`;

describe("leitor de prova", () => {
  it("lê questões, alternativas e gabarito", () => {
    const exam = parse(PROVA);
    expect(isExam(exam)).toBe(true);
    expect(exam.questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5]);
    expect(exam.questions[0]!.stem).toContain("glicose usando luz");
    expect(exam.questions[0]!.options).toEqual([
      "Respiração celular",
      "Fotossíntese",
      "Fermentação",
      "Digestão",
    ]);
    expect(exam.questions.map((q) => q.answer)).toEqual([1, 1, 0, 1, 0]);
    expect(exam.hasAnswerKey).toBe(true);
    expect(exam.answered).toBe(5);
  });

  it("junta alternativa quebrada em duas linhas e aceita (A) e a)", () => {
    const exam = parse(PROVA);
    expect(exam.questions[3]!.options[1]).toBe(
      "O líquido toma a forma do recipiente que o contém.",
    );
    expect(exam.questions[1]!.options).toHaveLength(4);
    expect(exam.questions[4]!.options[0]).toBe("Oxigênio");
  });

  it("marca questão que depende de figura e a deixa fora do estudo", () => {
    const exam = parse(PROVA);
    expect(exam.questions[2]!.needsFigure).toBe(true);
    expect(exam.figureQuestions).toBe(1);
    expect(studyableQuestions(exam).map((q) => q.number)).toEqual([1, 2, 4, 5]);
  });

  it("não inventa resposta quando não há gabarito", () => {
    const semGabarito = PROVA.replace(/GABARITO[^]*$/, "");
    const exam = parse(semGabarito);
    expect(exam.questions).toHaveLength(5);
    expect(exam.hasAnswerKey).toBe(false);
    expect(exam.questions.every((q) => q.answer === undefined)).toBe(true);
    expect(studyableQuestions(exam)).toEqual([]);
  });

  it("lê gabarito dentro da questão e em tabela corrida", () => {
    const inline = `1. Qual é a capital da França?
A) Lisboa
B) Paris
C) Roma
Gabarito: B
2. Quanto é 2 + 2?
A) 3
B) 4
C) 5
Resposta correta: B
3. Qual a cor do céu limpo?
A) Azul
B) Verde
C) Preto
Gabarito: A
4. Qual a capital da Itália?
A) Roma
B) Madri
C) Paris
Gabarito: A
`;
    const exam = parse(inline);
    expect(exam.questions.map((q) => q.answer)).toEqual([1, 1, 0, 0]);
    const tabela = parse(
      PROVA.replace(
        "1-B 2-B 3-A 4-B 5-A",
        "Questão 1: B\nQuestão 2: B\nQuestão 3: A\nQuestão 4: B\nQuestão 5: A",
      ),
    );
    expect(tabela.questions.map((q) => q.answer)).toEqual([1, 1, 0, 1, 0]);
  });

  it("texto comum não vira prova", () => {
    const texto = `A fotossíntese é o processo pelo qual as plantas produzem glicose.

1. A luz é absorvida pela clorofila.
2. A água é quebrada na fase clara.
3. O gás carbônico entra pelas folhas.`;
    expect(isExam(parse(texto))).toBe(false);
  });

  it("não confunde número de página nem lista dentro do enunciado com questão", () => {
    const comLista = `1) Sobre a lista abaixo, qual é a correta?
1. item um
2. item dois
A) opção a
B) opção b
C) opção c
2) Segunda pergunta de teste aqui?
A) sim
B) não
C) talvez`;
    const exam = parse(comLista);
    expect(exam.questions.map((q) => q.number)).toEqual([1, 2]);
  });
});
