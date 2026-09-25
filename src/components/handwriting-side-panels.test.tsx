import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CoordinateStats } from "../domain/coordinate-math";
import {
  HandwritingBrushPanel,
  HandwritingCoordinatePanel,
  HandwritingLayerPanel,
  HandwritingRulerPanel,
} from "./handwriting-side-panels";

describe("painel de pincéis", () => {
  it("marca o pincel atual e escolhe outro", () => {
    const onBrushChange = vi.fn();
    render(<HandwritingBrushPanel brush="ink" color="#7c3aed" onBrushChange={onBrushChange} />);
    expect(
      screen.getByRole("button", { name: /Caneta-tinteiro/ }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: /Fineliner/ }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: /Pincel macio/ }));
    expect(onBrushChange).toHaveBeenCalledWith("soft");
  });

  it("mostra a amostra de cada pincel na cor da tinta", () => {
    const { container } = render(
      <HandwritingBrushPanel brush="fine" color="#7c3aed" onBrushChange={vi.fn()} />,
    );
    const strokes = [...container.querySelectorAll("svg.brush-sample path")].map((path) =>
      path.getAttribute("stroke"),
    );
    expect(strokes).toEqual(["#7c3aed", "#7c3aed", "#7c3aed"]);
  });
});

describe("painel da régua", () => {
  it("marca a unidade atual e escolhe outra", () => {
    const onRulerUnitChange = vi.fn();
    render(
      <HandwritingRulerPanel
        rulerUnit="cm"
        rulerKind="straight"
        onRulerUnitChange={onRulerUnitChange}
        onRulerKindChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Centímetros/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: /Pixels/ }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: /Polegadas/ }));
    expect(onRulerUnitChange).toHaveBeenCalledWith("in");
  });

  it("oferece instrumentos funcionais e escolhe o gabarito circular", () => {
    const onRulerKindChange = vi.fn();
    render(
      <HandwritingRulerPanel
        rulerUnit="px"
        rulerKind="straight"
        onRulerUnitChange={vi.fn()}
        onRulerKindChange={onRulerKindChange}
      />,
    );
    expect(screen.getByRole("button", { name: /Régua reta/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: /Esquadro 45°/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Transferidor/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Gabarito circular/ }));
    expect(onRulerKindChange).toHaveBeenCalledWith("circle");
    expect(screen.getByText(/96 px equivalem a 1 polegada/)).toBeTruthy();
  });
});

function coordinateProps(
  overrides: Partial<Parameters<typeof HandwritingCoordinatePanel>[0]> = {},
) {
  return {
    coordinateStep: 1 as const,
    onStepChange: vi.fn(),
    coordinateMeasurements: true,
    onMeasurementsChange: vi.fn(),
    equalCoordinateAxes: false,
    onEqualAxesChange: vi.fn(),
    inspectedCoordinateStats: null,
    isLivePreview: false,
    ...overrides,
  };
}

const STATS: CoordinateStats = { deltaX: 3, deltaY: 4, distance: 5, slope: 4 / 3, angle: 53.13 };

describe("painel de coordenadas", () => {
  it("marca o valor da divisão e escolhe outro", () => {
    const props = coordinateProps({ coordinateStep: 5 });
    render(<HandwritingCoordinatePanel {...props} />);
    expect(
      screen.getByRole("button", { name: /Cada divisão vale 5/ }).getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /Cada divisão vale 10/ }));
    expect(props.onStepChange).toHaveBeenCalledWith(10);
  });

  it("deixa preferências e instrução longa fora do estojo", () => {
    const props = coordinateProps();
    render(<HandwritingCoordinatePanel {...props} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/Arraste a partir da origem/)).toBeNull();
  });

  it("não mostra a leitura quando não há eixo para inspecionar", () => {
    render(<HandwritingCoordinatePanel {...coordinateProps()} />);
    expect(screen.queryByText("LEITURA DO EIXO")).toBeNull();
    expect(screen.queryByText("PRÉVIA DO GESTO")).toBeNull();
  });

  it("mostra a leitura de um eixo já desenhado", () => {
    render(
      <HandwritingCoordinatePanel {...coordinateProps({ inspectedCoordinateStats: STATS })} />,
    );
    expect(screen.getByText("LEITURA DO EIXO")).toBeTruthy();
    expect(screen.getByText(/Δx 3 · Δy 4/)).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("1.33")).toBeTruthy();
    expect(screen.getByText("53.13°")).toBeTruthy();
    expect(
      screen.getByText("Use Selecionar para inspecionar outro sistema desenhado."),
    ).toBeTruthy();
  });

  it("mostra a prévia durante o arraste e a inclinação vertical", () => {
    render(
      <HandwritingCoordinatePanel
        {...coordinateProps({
          inspectedCoordinateStats: { ...STATS, deltaX: 0, slope: null },
          isLivePreview: true,
        })}
      />,
    );
    expect(screen.getByText("PRÉVIA DO GESTO")).toBeTruthy();
    expect(screen.getByText("vertical")).toBeTruthy();
    expect(
      screen.getByText("Solte para salvar este sistema. A prévia acompanha o arraste."),
    ).toBeTruthy();
  });
});

describe("painel de camadas", () => {
  const visibility = {
    background: true,
    coordinates: true,
    strokes: false,
    text: true,
    stickies: true,
  };

  it("lista as camadas na ordem e alterna a visibilidade", () => {
    const onToggleLayer = vi.fn();
    render(
      <HandwritingLayerPanel
        hasBackgroundLayer={false}
        layerVisibility={visibility}
        visibleLayerOrder={["strokes", "text"]}
        onToggleLayer={onToggleLayer}
        onMoveLayer={vi.fn()}
      />,
    );
    const strokes = screen.getByRole("checkbox", {
      name: "Mostrar camada Traços",
    }) as HTMLInputElement;
    const text = screen.getByRole("checkbox", { name: "Mostrar camada Texto" }) as HTMLInputElement;
    expect(strokes.checked).toBe(false);
    expect(text.checked).toBe(true);
    fireEvent.click(strokes);
    expect(onToggleLayer).toHaveBeenCalledWith("strokes");
    expect(screen.queryByText("Imagens")).toBeNull();
  });

  it("reordena para cima e para baixo, bloqueando nas pontas", () => {
    const onMoveLayer = vi.fn();
    render(
      <HandwritingLayerPanel
        hasBackgroundLayer={false}
        layerVisibility={visibility}
        visibleLayerOrder={["strokes", "text"]}
        onToggleLayer={vi.fn()}
        onMoveLayer={onMoveLayer}
      />,
    );
    expect(
      (screen.getByRole("button", { name: "Mover Traços para cima" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Mover Texto para baixo" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Mover Traços para baixo" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover Texto para cima" }));
    expect(onMoveLayer).toHaveBeenNthCalledWith(1, "strokes", 1);
    expect(onMoveLayer).toHaveBeenNthCalledWith(2, "text", -1);
  });

  it("mostra a camada de imagens quando há fundo ou imagens importadas", () => {
    const onToggleLayer = vi.fn();
    render(
      <HandwritingLayerPanel
        hasBackgroundLayer
        layerVisibility={visibility}
        visibleLayerOrder={[]}
        onToggleLayer={onToggleLayer}
        onMoveLayer={vi.fn()}
      />,
    );
    expect(screen.getByText("Documentos e fotos importados")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggleLayer).toHaveBeenCalledWith("background");
    expect(screen.queryByText("Nenhuma camada adicionada ainda.")).toBeNull();
  });

  it("avisa quando não há nenhuma camada", () => {
    render(
      <HandwritingLayerPanel
        hasBackgroundLayer={false}
        layerVisibility={visibility}
        visibleLayerOrder={[]}
        onToggleLayer={vi.fn()}
        onMoveLayer={vi.fn()}
      />,
    );
    expect(screen.getByText("Nenhuma camada adicionada ainda.")).toBeTruthy();
  });
});
