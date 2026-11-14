import { describe, expect, it } from "vitest";
import { selectionToolbarPosition, snapSelection } from "./handwriting-selection-layout";

describe("guias da seleção", () => {
  it("encaixa o topo no limite de seis unidades e ignora alvos distantes", () => {
    const moving = { x: 100, y: 106, width: 100, height: 80 };
    const targets = [{ x: 350, y: 100, width: 100, height: 80 }];
    const result = snapSelection(moving, targets, 6);
    expect(result).toMatchObject({ dx: 0, dy: -6 });
    expect(result.guides).toContainEqual({ axis: "y", value: 100, start: 100, end: 450 });
    expect(snapSelection({ ...moving, y: 108 }, targets, 6).guides).toEqual([]);
  });

  it("prefere a referência mais próxima entre bordas e centros", () => {
    const result = snapSelection(
      { x: 98, y: 300, width: 100, height: 80 },
      [
        { x: 103, y: 600, width: 100, height: 80 },
        { x: 100, y: 800, width: 100, height: 80 },
      ],
      6,
    );
    expect(result.dx).toBe(2);
  });
});

describe("posição da barra da seleção", () => {
  const viewport = { x: 0, y: 100, width: 390, height: 600 };
  const toolbar = { width: 220, height: 52 };
  it("vai para baixo quando o topo está sob o cabeçalho", () => {
    expect(
      selectionToolbarPosition({ x: 10, y: 110, width: 150, height: 90 }, viewport, toolbar),
    ).toEqual({ x: 8, y: 208, below: true });
  });
  it("fica acima e dentro da área visível depois de rolar", () => {
    const result = selectionToolbarPosition(
      { x: 350, y: 350, width: 200, height: 100 },
      viewport,
      toolbar,
    );
    expect(result).toEqual({ x: 162, y: 290, below: false });
  });
});
