import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readPdf } from "./pdf-source";
import { summarizePdf, summarizePlainText } from "./index";
import {
  computingHistory,
  fixtureAsText,
  photosynthesis,
  statesOfMatter,
} from "./fixtures.test-data";
import { fixturePdf } from "./pdf-fixture.test-data";

async function openPdf(fixture: Parameters<typeof fixturePdf>[0], layout = {}) {
  return getDocument({ data: fixturePdf(fixture, layout), verbosity: 0 }).promise;
}

describe("tabelas", () => {
  it("detecta a tabela de um PDF pelo alinhamento do texto", async () => {
    const doc = await readPdf(await openPdf(statesOfMatter), { title: "estados.pdf" });
    const tables = doc.blocks.flatMap((block) =>
      block.kind === "paragraph" && block.table ? [block.table] : [],
    );
    expect(tables).toHaveLength(1);
    expect(tables[0]).toEqual([
      ["Estado", "Forma", "Volume"],
      ["Sólido", "Definida", "Definido"],
      ["Líquido", "Do recipiente", "Definido"],
      ["Gasoso", "Do recipiente", "Variável"],
    ]);
  });

  it("leva a tabela ao resumo, no formato que o leitor desenha", async () => {
    const { markdown } = await summarizePdf(await openPdf(statesOfMatter), { title: "e.pdf" });
    expect(markdown).toContain("| Estado | Forma | Volume |");
    expect(markdown).toContain("| --- | --- | --- |");
    expect(markdown).toContain("| Gasoso | Do recipiente | Variável |");
  });

  it("não transforma o texto da tabela em frases soltas", async () => {
    const { markdown } = await summarizePdf(await openPdf(statesOfMatter), { title: "e.pdf" });
    expect(markdown).not.toMatch(/^- .*Definida Definido/m);
    expect(markdown).not.toMatch(/^[^|#>-].*Estado Forma Volume/m);
  });

  it("não cria tabela em texto corrido, de uma ou duas colunas", async () => {
    for (const fixture of [computingHistory, photosynthesis]) {
      for (const layout of [{}, { columns: 2 as const, hyphenate: true }]) {
        const doc = await readPdf(await openPdf(fixture, layout), { title: "a.pdf" });
        const tables = doc.blocks.filter((block) => block.kind === "paragraph" && block.table);
        expect(tables, `${fixture.name} ${JSON.stringify(layout)}`).toHaveLength(0);
      }
    }
  });

  it("lê tabelas em Markdown de arquivos TXT", async () => {
    const { markdown } = await summarizePlainText(fixtureAsText(statesOfMatter), "estados.md");
    expect(markdown).toContain("| Estado | Forma | Volume |");
    expect(markdown).toContain("| Sólido | Definida | Definido |");
  });

  it("ignora o separador do Markdown e mantém o cabeçalho", async () => {
    const { markdown } = await summarizePlainText(
      "# Notas\n\nTexto de abertura com algumas palavras para a seção existir de verdade.\n\n| Item | Valor |\n| --- | --- |\n| Água | 100 |\n| Gelo | 0 |",
      "notas.md",
    );
    expect(markdown).toContain("| Item | Valor |");
    expect(markdown.match(/\| --- \| --- \|/g)).toHaveLength(1);
  });
});
