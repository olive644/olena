import { describe, expect, it } from "vitest";
import { countWords, detectLanguage, splitSentences, stem, stripAccents } from "./portuguese";
import { dependsOnPrevious, findDates, findDefinition, isReferenceLike } from "./facts";

describe("texto em português", () => {
  it("separa frases sem cortar abreviações, decimais e siglas", () => {
    const sentences = splitSentences(
      "O Dr. Silva nasceu em 1950. Ele mediu 1,75 m de altura! Isso é verdade? Sim.",
    );
    expect(sentences[0]).toBe("O Dr. Silva nasceu em 1950.");
    expect(sentences).toContain("Ele mediu 1,75 m de altura!");
    expect(sentences).toHaveLength(4);
  });

  it("detecta o idioma e conta palavras", () => {
    expect(detectLanguage("Os alunos estudaram a matéria para a prova de amanhã.")).toBe("pt");
    expect(detectLanguage("The students studied the lesson for the exam tomorrow.")).toBe("en");
    expect(countWords("uma frase com cinco palavras")).toBe(5);
    expect(stripAccents("coração")).toBe("coracao");
  });

  it("agrupa variações da mesma palavra pelo radical", () => {
    expect(stem("computadores", "pt")).toBe(stem("computador", "pt"));
  });

  it("reconhece definições, mas não a voz passiva", () => {
    expect(
      findDefinition("O transistor é um componente eletrônico que amplifica sinais elétricos.")
        ?.term,
    ).toBe("O transistor");
    expect(findDefinition("A glicose é usada pela planta como fonte de energia.")).toBeUndefined();
  });

  it("separa anos de quantidades", () => {
    expect(findDates("O ENIAC foi concluído em 1945.").map((date) => date.label)).toContain("1945");
    expect(findDates("O ábaco é usado há mais de 2000 anos.")).toHaveLength(0);
  });

  it("detecta frases que dependem da anterior e linhas de referência", () => {
    expect(dependsOnPrevious("Nesse processo, elas usam gás carbônico.")).toBe(true);
    expect(dependsOnPrevious("A fotossíntese ocorre nas folhas.")).toBe(false);
    expect(isReferenceLike("CERUZZI, P. Computing. MIT Press, 2003. ISBN 978-0-262-53203-9.")).toBe(
      true,
    );
  });
});
