import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPage, sizePageCanvas } from "./handwriting-canvas";
import type { HandwritingSticky } from "../domain/handwriting";

// jsdom não implementa canvas 2D: sem um contexto falso, renderPage() nunca chegaria a
// desenhar nada. Diferente dos testes de drawHoverPreview/drawCornellPaper (que recebem o
// contexto por parâmetro), renderPage chama canvas.getContext("2d") por dentro, então o
// jeito de interceptar aqui é substituir o método no protótipo do canvas, não a função do
// módulo (mockar o módulo não afetaria a chamada interna do próprio arquivo).
function fakeContext() {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return (target as Record<string, unknown>)[prop as string];
        return () => undefined;
      },
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

afterEach(() => vi.restoreAllMocks());

const tableSticky: HandwritingSticky = {
  id: "t1",
  kind: "table",
  x: 100,
  y: 200,
  width: 360,
  height: 220,
  color: "yellow",
  text: "",
  cells: [
    ["Data", "Tarefa"],
    ["27/09", "Revisar"],
  ],
};

describe("tabela no retrato da folha (exportação, impressão, miniatura)", () => {
  it("não trava desenhando uma tabela, com célula vazia ou texto longo", () => {
    const canvas = document.createElement("canvas");
    sizePageCanvas(canvas, 1);
    vi.spyOn(canvas, "getContext").mockReturnValue(fakeContext());
    expect(() => renderPage(canvas, [], "ruled", "light", [tableSticky])).not.toThrow();
    const empty: HandwritingSticky = { ...tableSticky, cells: [[""]] };
    expect(() => renderPage(canvas, [], "ruled", "light", [empty])).not.toThrow();
    const long: HandwritingSticky = {
      ...tableSticky,
      cells: [["x".repeat(200), "y".repeat(200)]],
    };
    expect(() => renderPage(canvas, [], "ruled", "light", [long])).not.toThrow();
  });
});
