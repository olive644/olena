import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { structureText } from "./layout";
import { readPdf } from "./pdf-source";
import { summarizePdf, summarizePlainText } from "./index";
import { summarizeDocument } from "./summarize";
import { stripAccents } from "./portuguese";
import { fixturePdf } from "./pdf-fixture.test-data";
import {
  computingHistory,
  fixtureAsText,
  photosynthesis,
  shortNote,
  type Fixture,
} from "./fixtures.test-data";

const normalize = (text: string) => stripAccents(text).toLowerCase().replace(/\s+/g, " ");

async function summaryOf(fixture: Fixture) {
  return summarizeDocument(structureText(fixtureAsText(fixture), fixture.title));
}

function recall(fixture: Fixture, markdown: string): number {
  const text = normalize(markdown);
  return (
    fixture.gold.filter((phrase) => text.includes(normalize(phrase))).length / fixture.gold.length
  );
}

/** Frases do resumo (sem rótulos), para conferir que todas vêm do arquivo. */
function summarySentences(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => !line.startsWith("#") && !line.includes("Sobre este resumo"))
    .map((line) => line.replace(/^[-> ]+/, "").replace(/\*\*[^*]+\*\*:?\s*/g, ""))
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.trim().replace(/[.!?]+$/, ""))
    .filter(
      (sentence) => sentence.split(/\s+/).length >= 6 && /\p{L}{3}/u.test(sentence.slice(0, 6)),
    );
}

describe("resumo automático", () => {
  it("cobre as ideias principais de um texto longo e estruturado", async () => {
    const { markdown, stats } = await summaryOf(computingHistory);
    expect(recall(computingHistory, markdown)).toBeGreaterThanOrEqual(0.9);
    expect(stats.ratio).toBeLessThan(0.7);
    expect(markdown).toMatch(/^# História da Computação/);
    expect(markdown).toContain("## Roteiro do arquivo");
    expect(markdown).toContain("**Ideia central:**");
    expect(markdown).toContain("> **Definição**");
  });

  it("cobre as ideias de um texto corrido, sem títulos", async () => {
    const { markdown } = await summaryOf(photosynthesis);
    expect(recall(photosynthesis, markdown)).toBeGreaterThanOrEqual(0.75);
    expect(markdown).toMatch(/Visão geral/);
  });

  it("nunca inventa: toda frase do resumo está no arquivo", async () => {
    for (const fixture of [computingHistory, photosynthesis]) {
      const original = normalize(fixtureAsText(fixture));
      const { markdown } = await summaryOf(fixture);
      for (const sentence of summarySentences(markdown)) {
        expect(original, sentence).toContain(normalize(sentence));
      }
    }
  });

  it("deixa de fora cabeçalho, rodapé e referências", async () => {
    const { markdown } = await summaryOf(computingHistory);
    for (const word of computingHistory.forbidden) expect(markdown).not.toContain(word);
  });

  it("é determinístico", async () => {
    const first = await summaryOf(computingHistory);
    const second = await summaryOf(computingHistory);
    expect(second.markdown).toBe(first.markdown);
  });

  it("um texto curto não vira um resumo maior que ele", async () => {
    const { markdown, stats } = await summaryOf(shortNote);
    expect(stats.wordsOut).toBeLessThanOrEqual(stats.wordsIn * 0.9 + 25);
    expect(markdown.length).toBeGreaterThan(40);
  });

  it("textos sem pontuação ou vazios não quebram", async () => {
    await expect(summarizePlainText("", "vazio.txt")).resolves.toBeDefined();
    await expect(summarizePlainText("sem pontuação nenhuma aqui", "a.txt")).resolves.toBeDefined();
  });

  it("não usa travessão nem texto fora do arquivo além dos rótulos", async () => {
    const { markdown } = await summaryOf(computingHistory);
    expect(markdown).not.toMatch(/[\u2013\u2014]/);
  });

  it("o tamanho do resumo cresce devagar com o do arquivo", async () => {
    const paragraph = photosynthesis.blocks
      .filter((block) => block.kind === "paragraph")
      .map((block) => block.text)
      .join(" ");
    const small = await summarizePlainText(paragraph, "a.txt");
    const big = await summarizePlainText(
      Array.from(
        { length: 12 },
        (_, index) =>
          `## Parte ${index + 1}\n\n${paragraph.replace(/fotossíntese/g, `fotossíntese ${index}`)}`,
      ).join("\n\n"),
      "b.txt",
    );
    expect(big.stats.wordsOut).toBeGreaterThan(small.stats.wordsOut);
    expect(big.stats.ratio).toBeLessThan(small.stats.ratio);
  });
});

describe("resumo de PDF de verdade", () => {
  const layouts = [
    { name: "uma coluna", options: { header: "Apostila 2026 - Computação", footerNumbers: true } },
    {
      name: "duas colunas com hifenização",
      options: { columns: 2 as const, header: "Apostila 2026", hyphenate: true },
    },
  ];
  for (const layout of layouts) {
    it(`lê ${layout.name} e mantém a cobertura`, async () => {
      const pdf = await getDocument({
        data: fixturePdf(computingHistory, layout.options),
        verbosity: 0,
      }).promise;
      const { markdown, stats } = await summarizePdf(pdf, { title: "apostila.pdf" });
      expect(stats.pages).toBeGreaterThanOrEqual(2);
      expect(recall(computingHistory, markdown)).toBeGreaterThanOrEqual(0.75);
      expect(markdown).not.toContain("Apostila 2026");
      for (const word of computingHistory.forbidden) expect(markdown).not.toContain(word);
    });
  }

  it("recupera a estrutura de títulos do PDF", async () => {
    const pdf = await getDocument({
      data: fixturePdf(computingHistory, { header: "Apostila" }),
      verbosity: 0,
    }).promise;
    const doc = await readPdf(pdf, { title: "apostila.pdf" });
    expect(doc.title).toBe("História da Computação");
    expect(doc.blocks.filter((block) => block.kind === "heading").length).toBeGreaterThanOrEqual(4);
  });

  it("aceita cancelamento", async () => {
    const pdf = await getDocument({ data: fixturePdf(computingHistory), verbosity: 0 }).promise;
    const controller = new AbortController();
    controller.abort();
    await expect(summarizePdf(pdf, { signal: controller.signal })).rejects.toBeDefined();
  });
});

describe("desempenho", () => {
  it("resume um livro de cerca de 300 páginas em poucos segundos", async () => {
    const base = computingHistory.blocks
      .filter((block) => block.kind === "paragraph")
      .map((block) => block.text);
    const parts: string[] = [];
    for (let chapter = 0; chapter < 120; chapter += 1) {
      parts.push(`# Capítulo ${chapter + 1}`);
      for (let index = 0; index < 8; index += 1) {
        parts.push(
          `${base[(chapter + index) % base.length]!} Registro ${chapter}-${index} do capítulo.`,
        );
      }
    }
    const started = performance.now();
    const { stats } = await summarizePlainText(parts.join("\n\n"), "livro.txt");
    expect(performance.now() - started).toBeLessThan(15_000);
    expect(stats.ratio).toBeLessThan(0.3);
  }, 30_000);
});
