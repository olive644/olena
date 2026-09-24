import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HandwritingInkOptions } from "./handwriting-ink-options";
import { HandwritingSelectionActions } from "./handwriting-selection-actions";
import { HandwritingToolGroup } from "./handwriting-tool-group";

function toolGroupProps(overrides: Partial<Parameters<typeof HandwritingToolGroup>[0]> = {}) {
  return {
    textMode: false,
    tool: "pen" as const,
    layersOpen: false,
    writingWindowOpen: false,
    onSelectTool: vi.fn(),
    onToggleLayers: vi.fn(),
    onToggleText: vi.fn(),
    onAddSticky: vi.fn(),
    onToggleWritingWindow: vi.fn(),
    ...overrides,
  };
}

describe("grupo de instrumentos", () => {
  it.each([
    ["Régua", "ruler"],
    ["Sistema de coordenadas", "coordinates"],
    ["Caneta", "pen"],
    ["Marca-texto", "highlighter"],
    ["Borracha", "eraser"],
    ["Mover folha", "hand"],
    ["Selecionar traços", "select"],
  ])("o botão %s escolhe a ferramenta %s", (name, tool) => {
    const props = toolGroupProps();
    render(<HandwritingToolGroup {...props} />);
    fireEvent.click(screen.getByRole("button", { name }));
    expect(props.onSelectTool).toHaveBeenCalledWith(tool);
  });

  it("marca só a ferramenta ativa", () => {
    render(<HandwritingToolGroup {...toolGroupProps({ tool: "eraser" })} />);
    expect(screen.getByRole("button", { name: "Borracha" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Caneta" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("no modo texto nenhuma ferramenta fica marcada, só o botão de texto", () => {
    render(<HandwritingToolGroup {...toolGroupProps({ textMode: true, tool: "pen" })} />);
    expect(screen.getByRole("button", { name: "Caneta" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Texto na página inteira" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("dispara camadas, texto, post-it e janela de escrita", () => {
    const props = toolGroupProps({ layersOpen: true, writingWindowOpen: true });
    render(<HandwritingToolGroup {...props} />);
    expect(
      screen.getByRole("button", { name: "Camadas da folha" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Janela de escrita ampliada" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Camadas da folha" }));
    fireEvent.click(screen.getByRole("button", { name: "Texto na página inteira" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar post-it" }));
    fireEvent.click(screen.getByRole("button", { name: "Janela de escrita ampliada" }));
    expect(props.onToggleLayers).toHaveBeenCalledTimes(1);
    expect(props.onToggleText).toHaveBeenCalledTimes(1);
    expect(props.onAddSticky).toHaveBeenCalledTimes(1);
    expect(props.onToggleWritingWindow).toHaveBeenCalledTimes(1);
  });
});

function selectionProps(
  overrides: Partial<Parameters<typeof HandwritingSelectionActions>[0]> = {},
) {
  return {
    tool: "select" as const,
    selectionMode: "rectangle" as const,
    onSelectionModeChange: vi.fn(),
    selectedIds: [] as string[],
    selectedCoordinateIds: [] as string[],
    canAlign: false,
    onAlign: vi.fn(),
    onScale: vi.fn(),
    onDelete: vi.fn(),
    hasBackground: false,
    onRemoveBackground: vi.fn(),
    hasSelectedImages: false,
    onRemoveSelectedImages: vi.fn(),
    onRotateImages: vi.fn(),
    hasPageText: false,
    pageTextSize: 28,
    onChangeTextSize: vi.fn(),
    hasSelectedCoordinateSystem: false,
    selectedStrokeCount: 0,
    formulaDraft: "",
    onFormulaDraftChange: vi.fn(),
    ocrBusy: false,
    ocrProgress: 0,
    onUseCoordinateFormula: vi.fn(),
    onRecognizeFormula: vi.fn(),
    onInsertFormula: vi.fn(),
    ...overrides,
  };
}

describe("ações da seleção", () => {
  it("permite trocar entre retângulo e laço livre na ferramenta de seleção", () => {
    const props = selectionProps();
    render(<HandwritingSelectionActions {...props} />);
    expect(screen.getByRole("button", { name: "Retângulo" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Laço livre" }));
    expect(props.onSelectionModeChange).toHaveBeenCalledWith("lasso");
  });

  it("não mostra o modo de seleção quando a ferramenta é outra", () => {
    render(
      <HandwritingSelectionActions {...selectionProps({ tool: "pen", selectedIds: ["a"] })} />,
    );
    expect(screen.queryByRole("button", { name: "Retângulo" })).toBeNull();
  });

  it("conta os itens no singular e no plural", () => {
    const { rerender } = render(
      <HandwritingSelectionActions {...selectionProps({ selectedIds: ["a"] })} />,
    );
    expect(screen.getByText("1 item selecionado")).toBeTruthy();
    rerender(<HandwritingSelectionActions {...selectionProps({ selectedIds: ["a", "b"] })} />);
    expect(screen.getByText("2 itens selecionados")).toBeTruthy();
  });

  it("alinha só quando há traços, e aumenta, diminui e apaga a seleção", () => {
    const props = selectionProps({ selectedIds: ["a"] });
    const { rerender } = render(<HandwritingSelectionActions {...props} />);
    expect((screen.getByRole("button", { name: "Alinhar" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    rerender(<HandwritingSelectionActions {...props} canAlign />);
    fireEvent.click(screen.getByRole("button", { name: "Alinhar" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumentar" }));
    fireEvent.click(screen.getByRole("button", { name: "Diminuir" }));
    fireEvent.click(screen.getByRole("button", { name: "Apagar seleção" }));
    expect(props.onAlign).toHaveBeenCalledTimes(1);
    expect(props.onScale).toHaveBeenNthCalledWith(1, 1.12);
    expect(props.onScale).toHaveBeenNthCalledWith(2, 0.88);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it("apaga sistemas de coordenadas selecionados", () => {
    const props = selectionProps({ selectedCoordinateIds: ["c1", "c2"] });
    render(<HandwritingSelectionActions {...props} />);
    expect(screen.getByText("2 sistemas de coordenadas selecionados")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Apagar coordenadas" }));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it("remove a imagem de fundo e gira imagens importadas", () => {
    const props = selectionProps({ hasBackground: true, hasSelectedImages: true });
    render(<HandwritingSelectionActions {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Remover imagem" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover imagem(ns)" }));
    fireEvent.click(screen.getByRole("button", { name: "Girar −15°" }));
    fireEvent.click(screen.getByRole("button", { name: "Girar +15°" }));
    expect(props.onRemoveBackground).toHaveBeenCalledTimes(1);
    expect(props.onRemoveSelectedImages).toHaveBeenCalledTimes(1);
    expect(props.onRotateImages).toHaveBeenNthCalledWith(1, -1);
    expect(props.onRotateImages).toHaveBeenNthCalledWith(2, 1);
  });

  it("muda o tamanho do texto da folha e bloqueia nos limites", () => {
    const props = selectionProps({ hasPageText: true, pageTextSize: 16 });
    const { rerender } = render(<HandwritingSelectionActions {...props} />);
    expect(screen.getByText("Texto: 16px")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Diminuir texto" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar texto" }));
    expect(props.onChangeTextSize).toHaveBeenCalledWith(2);
    rerender(<HandwritingSelectionActions {...props} pageTextSize={72} />);
    expect(
      (screen.getByRole("button", { name: "Aumentar texto" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Diminuir texto" }));
    expect(props.onChangeTextSize).toHaveBeenCalledWith(-2);
  });

  it("esconde o assistente de fórmula sem coordenadas nem traços selecionados", () => {
    render(<HandwritingSelectionActions {...selectionProps()} />);
    expect(screen.queryByLabelText("Fórmula matemática")).toBeNull();
  });

  it("no assistente, edita a fórmula, usa a leitura e insere só com texto", () => {
    const props = selectionProps({ hasSelectedCoordinateSystem: true });
    const { rerender } = render(<HandwritingSelectionActions {...props} />);
    expect(
      (screen.getByRole("button", { name: "Inserir fórmula" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("Fórmula matemática"), { target: { value: "y = x" } });
    expect(props.onFormulaDraftChange).toHaveBeenCalledWith("y = x");
    fireEvent.click(screen.getByRole("button", { name: "Usar leitura" }));
    expect(props.onUseCoordinateFormula).toHaveBeenCalledTimes(1);
    rerender(<HandwritingSelectionActions {...props} formulaDraft="y = x" />);
    fireEvent.click(screen.getByRole("button", { name: "Inserir fórmula" }));
    expect(props.onInsertFormula).toHaveBeenCalledTimes(1);
  });

  it("oferece o OCR local para traços e mostra o progresso enquanto reconhece", () => {
    const props = selectionProps({ selectedStrokeCount: 2 });
    const { rerender } = render(<HandwritingSelectionActions {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Reconhecer OCR local" }));
    expect(props.onRecognizeFormula).toHaveBeenCalledTimes(1);
    rerender(<HandwritingSelectionActions {...props} ocrBusy ocrProgress={40} />);
    const busy = screen.getByRole("button", { name: "OCR 40%" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
  });
});

function inkProps(overrides: Partial<Parameters<typeof HandwritingInkOptions>[0]> = {}) {
  return {
    tool: "pen" as const,
    color: "#17151C",
    onColorChange: vi.fn(),
    width: 5,
    onWidthChange: vi.fn(),
    stabilization: true,
    onStabilizationChange: vi.fn(),
    penOnly: false,
    onPenOnlyChange: vi.fn(),
    ...overrides,
  };
}

describe("opções de tinta", () => {
  it("marca a cor atual sem diferenciar maiúsculas e escolhe outra", () => {
    const props = inkProps();
    render(<HandwritingInkOptions {...props} />);
    expect(screen.getByRole("button", { name: "Tinta Grafite" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Tinta Roxo" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tinta Roxo" }));
    expect(props.onColorChange).toHaveBeenCalledWith("#7c3aed");
  });

  it("aceita uma cor personalizada", () => {
    const props = inkProps();
    render(<HandwritingInkOptions {...props} />);
    fireEvent.change(screen.getByLabelText("Cor da tinta", { selector: "input" }), {
      target: { value: "#123456" },
    });
    expect(props.onColorChange).toHaveBeenCalledWith("#123456");
  });

  it("marca a espessura atual e escolhe outra", () => {
    const props = inkProps();
    render(<HandwritingInkOptions {...props} />);
    expect(screen.getByRole("button", { name: "Traço Regular" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Traço Forte" }));
    expect(props.onWidthChange).toHaveBeenCalledWith(8);
  });

  it("desativa cor e espessura com a borracha", () => {
    render(<HandwritingInkOptions {...inkProps({ tool: "eraser" })} />);
    expect(
      (screen.getByRole("group", { name: "Cor da tinta" }) as HTMLFieldSetElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("group", { name: "Espessura do traço" }) as HTMLFieldSetElement).disabled,
    ).toBe(true);
  });

  it("liga e desliga o ajuste inteligente e o modo só caneta", () => {
    const props = inkProps();
    render(<HandwritingInkOptions {...props} />);
    const assist = screen.getByRole("checkbox", { name: /Ajuste inteligente/ }) as HTMLInputElement;
    expect(assist.checked).toBe(true);
    fireEvent.click(assist);
    expect(props.onStabilizationChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "Só caneta, dedo move" }));
    expect(props.onPenOnlyChange).toHaveBeenCalledWith(true);
  });
});
