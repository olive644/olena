import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

it("caneta: escolhe o estilo da linha e marca o selecionado", () => {
  const onDashChange = vi.fn();
  const props = {
    tool: "pen" as const,
    width: 5,
    color: "#17151c",
    onColorChange: vi.fn(),
    onWidthChange: vi.fn(),
    onDashChange,
  };
  const view = render(<HandwritingInkOptions {...props} />);
  const solid = screen.getByRole("button", { name: "Linha contínua" });
  expect(solid.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Linha tracejada" }));
  expect(onDashChange).toHaveBeenLastCalledWith("dashed");
  fireEvent.click(screen.getByRole("button", { name: "Linha pontilhada" }));
  expect(onDashChange).toHaveBeenLastCalledWith("dotted");
  fireEvent.click(solid);
  expect(onDashChange).toHaveBeenLastCalledWith(undefined);
  view.rerender(<HandwritingInkOptions {...props} dash="dotted" />);
  expect(
    screen.getByRole("button", { name: "Linha pontilhada" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(solid.getAttribute("aria-pressed")).toBe("false");
});

for (const tool of ["highlighter", "eraser"] as const) {
  it(`${tool}: não mostra o estilo da linha`, () => {
    render(
      <HandwritingInkOptions
        tool={tool}
        width={5}
        color="#17151c"
        onColorChange={vi.fn()}
        onWidthChange={vi.fn()}
        onDashChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Linha tracejada" })).toBeNull();
  });
}

describe("borracha: modo de fundo", () => {
  const base = {
    tool: "eraser" as const,
    width: 10,
    color: "#17151c",
    onColorChange: vi.fn(),
    onWidthChange: vi.fn(),
    eraserWholeStroke: false,
  };

  it("fica desabilitado sem página ou imagem importada, e explica por quê", () => {
    render(
      <HandwritingInkOptions
        {...base}
        onEraserWholeStrokeChange={vi.fn()}
        onEraserBackgroundChange={vi.fn()}
        backgroundAvailable={false}
      />,
    );
    const button = screen.getByRole("button", { name: "Apagar só o fundo importado" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("title")).toContain("importada");
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("escolhe o fundo e os três modos são exclusivos", () => {
    const onBackground = vi.fn();
    const onWhole = vi.fn();
    const view = render(
      <HandwritingInkOptions
        {...base}
        onEraserWholeStrokeChange={onWhole}
        onEraserBackgroundChange={onBackground}
        backgroundAvailable
      />,
    );
    const background = screen.getByRole("button", { name: "Apagar só o fundo importado" });
    const partial = screen.getByRole("button", { name: "Apagar só o trecho tocado" });
    const whole = screen.getByRole("button", { name: "Apagar o traço inteiro" });
    expect(partial.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(background);
    expect(onBackground).toHaveBeenLastCalledWith(true);
    view.rerender(
      <HandwritingInkOptions
        {...base}
        onEraserWholeStrokeChange={onWhole}
        onEraserBackgroundChange={onBackground}
        backgroundAvailable
        eraserBackground
      />,
    );
    expect(background.getAttribute("aria-pressed")).toBe("true");
    expect(partial.getAttribute("aria-pressed")).toBe("false");
    expect(whole.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(whole);
    expect(onBackground).toHaveBeenLastCalledWith(false);
    expect(onWhole).toHaveBeenLastCalledWith(true);
  });

  it("sem o recurso ligado, o botão de fundo nem aparece", () => {
    render(<HandwritingInkOptions {...base} onEraserWholeStrokeChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Apagar só o fundo importado" })).toBeNull();
  });
});
