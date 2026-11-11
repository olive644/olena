import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const riv = readFileSync(new URL("../public/olena-reading/olena.riv", import.meta.url));
const layers = JSON.parse(
  readFileSync(
    new URL("../scripts/olena-reading-rive/layers/layers.json", import.meta.url),
    "utf8",
  ),
) as { order: string[]; layers: Record<string, { file: string; hidden?: boolean }> };

describe("Olena lendo em Rive", () => {
  it("é um arquivo Rive com o tamanho dentro do orçamento", () => {
    expect(riv.subarray(0, 4).toString("ascii")).toBe("RIVE");
    expect(riv.length).toBeLessThan(512 * 1024);
  });

  it("guarda a máquina de estados, as entradas e as cinco esperas", () => {
    const text = riv.toString("latin1");
    for (const name of [
      "Olena",
      "clique",
      "variacao",
      "lendo",
      "curiosa",
      "cochilo",
      "feliz",
      "estrela",
      "alegria",
    ]) {
      expect(text).toContain(name);
    }
  });

  it("tem uma imagem por camada, com as pálpebras e a folha começando invisíveis", () => {
    expect(layers.order).toEqual(
      expect.arrayContaining([
        "body",
        "tail",
        "tailTip",
        "earL",
        "earR",
        "star",
        "book",
        "pawL",
        "pawR",
      ]),
    );
    for (const name of ["lidUpL", "lidLowL", "lidUpR", "lidLowR", "page1", "page2", "page3"]) {
      expect(layers.layers[name]?.hidden).toBe(true);
    }
    for (const name of layers.order) expect(riv.includes(Buffer.from(name, "utf8"))).toBe(true);
  });
});
