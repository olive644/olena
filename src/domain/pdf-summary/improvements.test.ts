import { describe, expect, it } from "vitest";
import { isExample, isFormula, keyTerms } from "./facts";
import { summarizePlainText } from "./index";
import { computingHistory, fixtureAsText } from "./fixtures.test-data";

describe("fórmulas e exemplos", () => {
  const physics = [
    "# Física",
    "## Movimento",
    "A velocidade média mede o quanto um corpo se desloca em cada intervalo de tempo. Ela é calculada pela razão entre a distância percorrida e o tempo gasto. Por exemplo, um carro que percorre 120 km em 2 horas tem velocidade média de 60 km/h.",
    "v = Δs / Δt",
    "A aceleração indica quanto a velocidade varia a cada segundo. Quando a aceleração é constante, o movimento é chamado de uniformemente variado, e as equações ficam mais simples:",
    "- F = m · a\n- v = v0 + a · t",
    "## Energia",
    "A energia cinética depende da massa e do quadrado da velocidade do corpo. Por isso, dobrar a velocidade quadruplica a energia. Suponha que dois carros de massas iguais andem a 20 km/h e a 40 km/h: o segundo terá quatro vezes mais energia.",
    "Ec = m · v² / 2",
  ].join("\n\n");

  it("traz as fórmulas do arquivo, que antes se perdiam por serem curtas", async () => {
    const { markdown } = await summarizePlainText(physics, "fisica.md");
    expect(markdown).toContain("- **Fórmula:** v = Δs / Δt");
    expect(markdown).toContain("- **Fórmula:** F = m · a");
    expect(markdown).toContain("- **Fórmula:** v = v0 + a · t");
    expect(markdown).toContain("- **Fórmula:** Ec = m · v² / 2");
    // A fórmula não vira também uma frase solta.
    expect(markdown).not.toMatch(/^- (?!\*\*Fórmula).*v = Δs/m);
  });

  it("separa um exemplo em caixa própria", async () => {
    const { markdown } = await summarizePlainText(physics, "fisica.md");
    expect(markdown).toMatch(/^> \*\*Exemplo\*\* (?:Por exemplo|Suponha)/m);
  });

  it("reconhece fórmula sem confundir com texto corrido", () => {
    expect(isFormula("F = m · a")).toBe(true);
    expect(isFormula("v = Δs / Δt")).toBe(true);
    expect(isFormula("x² + y² = r²")).toBe(true);
    expect(isFormula("A água ferve a 100 graus quando a pressão é igual à do mar.")).toBe(false);
    expect(isFormula("O resultado é igual a cinco")).toBe(false);
    expect(isExample("Por exemplo, um carro anda.")).toBe(true);
    expect(isExample("Um carro anda rápido.")).toBe(false);
  });
});

describe("termos-chave", () => {
  it("mantêm a inicial maiúscula de nomes próprios, mesmo quando abrem frases", () => {
    const terms = keyTerms(
      [
        "John Mauchly liderou o projeto do ENIAC.",
        "O projeto foi liderado por John Mauchly e por Presper Eckert.",
        "John Mauchly e Presper Eckert construíram o ENIAC na Pensilvânia.",
        "Depois, John Mauchly trabalhou em outros computadores.",
      ],
      "pt",
      8,
    ).map((item) => item.term);
    expect(terms.some((term) => /^john\b/.test(term))).toBe(false);
    expect(terms.some((term) => term.startsWith("John"))).toBe(true);
  });
});

describe("tamanho do resumo", () => {
  it("curto, médio e longo escolhem quantidades crescentes do arquivo", async () => {
    const text = fixtureAsText(computingHistory);
    const short = await summarizePlainText(text, "a.md", { detail: "short" });
    const medium = await summarizePlainText(text, "a.md");
    const long = await summarizePlainText(text, "a.md", { detail: "long" });
    expect(short.stats.wordsOut).toBeLessThan(medium.stats.wordsOut);
    expect(medium.stats.wordsOut).toBeLessThan(long.stats.wordsOut);
    expect(short.stats.wordsOut).toBeLessThan(short.stats.wordsIn * 0.65);
    expect(long.stats.wordsOut).toBeLessThanOrEqual(long.stats.wordsIn * 1.05);
    expect(short.stats.selectedSentences).toBeLessThan(long.stats.selectedSentences);
  });
});

describe("arquivos em inglês", () => {
  const english = [
    "# Photosynthesis",
    "## Light reactions",
    "Plants capture sunlight with chlorophyll inside the chloroplasts of their leaves. The energy of the light is used to split water molecules and release oxygen into the air. This stage also produces the energy carriers that the plant needs for the next stage.",
    "## The Calvin cycle",
    "The second stage uses the energy carriers to turn carbon dioxide into sugar. This sugar is the food that the plant uses for growth, and it is stored as starch in the roots and seeds of many species. The process does not need light directly, but it depends on the products of the first stage.",
    "## Why it matters",
    "Almost every food chain on Earth depends on photosynthesis because plants make the sugar that animals eat. The process also keeps the amount of oxygen in the air stable, which allows living beings to breathe. Scientists study it to design better crops and clean energy.",
  ].join("\n\n");

  it("usa os rótulos em inglês", async () => {
    const { markdown } = await summarizePlainText(english, "photo.md");
    expect(markdown).toContain("> **About this summary**");
    expect(markdown).toContain("> **Overview**");
    expect(markdown).not.toContain("Sobre este resumo");
    expect(markdown).not.toContain("Visão geral");
  });
});
