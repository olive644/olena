import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HandwritingInkOptions } from "./handwriting-ink-options";

for (const tool of ["pen", "highlighter", "eraser"] as const) {
  it(`${tool}: permite escolher cada percentual entre 0 e 100 sem tamanho invisível`, () => {
    const onWidthChange = vi.fn();
    const props = { tool, width: 0.5, color: "#17151c", onColorChange: vi.fn(), onWidthChange };
    const view = render(<HandwritingInkOptions {...props} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("min")).toBe("0");
    expect(slider.getAttribute("max")).toBe("100");
    expect(slider.getAttribute("step")).toBe("1");
    expect(slider.getAttribute("aria-valuetext")).toBe("0%");
    fireEvent.change(slider, { target: { value: "100" } });
    expect(onWidthChange).toHaveBeenLastCalledWith(40);
    view.rerender(<HandwritingInkOptions {...props} width={40} />);
    fireEvent.change(slider, { target: { value: "37" } });
    expect(onWidthChange.mock.calls.at(-1)?.[0]).toBeCloseTo(15.115);
    fireEvent.change(slider, { target: { value: "0" } });
    expect(onWidthChange).toHaveBeenLastCalledWith(0.5);
    if (tool === "eraser") expect(screen.queryByRole("button", { name: "Tinta Roxo" })).toBeNull();
  });
}

it("borracha: alterna entre apagar por trecho e por traço inteiro", () => {
  const onEraserWholeStrokeChange = vi.fn();
  render(
    <HandwritingInkOptions
      tool="eraser"
      width={10}
      color="#17151c"
      onColorChange={vi.fn()}
      onWidthChange={vi.fn()}
      eraserWholeStroke={false}
      onEraserWholeStrokeChange={onEraserWholeStrokeChange}
    />,
  );
  const wholeStroke = screen.getByRole("button", { name: "Apagar o traço inteiro" });
  const partial = screen.getByRole("button", { name: "Apagar só o trecho tocado" });
  expect(partial.getAttribute("aria-pressed")).toBe("true");
  expect(wholeStroke.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(wholeStroke);
  expect(onEraserWholeStrokeChange).toHaveBeenCalledWith(true);
});

it("marca-texto: mostra e ajusta a opacidade, do traço fixo à opacidade padrão", () => {
  const onHighlighterOpacityChange = vi.fn();
  render(
    <HandwritingInkOptions
      tool="highlighter"
      width={20}
      color="#facc15"
      onColorChange={vi.fn()}
      onWidthChange={vi.fn()}
      highlighterOpacity={0.3}
      onHighlighterOpacityChange={onHighlighterOpacityChange}
    />,
  );
  const slider = screen.getByRole("slider", { name: "Opacidade do marca-texto" });
  expect(slider.getAttribute("min")).toBe("10");
  expect(slider.getAttribute("max")).toBe("70");
  expect(slider.getAttribute("aria-valuetext")).toBe("30%");
  fireEvent.change(slider, { target: { value: "55" } });
  expect(onHighlighterOpacityChange).toHaveBeenCalledWith(0.55);
});

it("não mostra a opacidade do marca-texto para outras ferramentas nem sem o callback", () => {
  render(
    <HandwritingInkOptions
      tool="pen"
      width={10}
      color="#17151c"
      onColorChange={vi.fn()}
      onWidthChange={vi.fn()}
    />,
  );
  expect(screen.queryByText("Opacidade do marca-texto", { exact: false })).toBeNull();
});

it("não mostra o modo da borracha para outras ferramentas nem sem o callback", () => {
  render(
    <HandwritingInkOptions
      tool="pen"
      width={10}
      color="#17151c"
      onColorChange={vi.fn()}
      onWidthChange={vi.fn()}
    />,
  );
  expect(screen.queryByText("Modo da borracha")).toBeNull();
});
