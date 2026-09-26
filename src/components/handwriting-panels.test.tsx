import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import { HandwritingFooter } from "./handwriting-footer";
import { HandwritingHistoryBar } from "./handwriting-history-bar";
import { HandwritingPaperPicker } from "./handwriting-paper-picker";
import { HandwritingWritingWindow } from "./handwriting-writing-window";

function historyProps(overrides: Partial<Parameters<typeof HandwritingHistoryBar>[0]> = {}) {
  return {
    textMode: false,
    textAutoCorrect: true,
    onToggleAutoCorrect: vi.fn(),
    zoom: 1.5,
    canUndo: true,
    canRedo: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canClear: true,
    onClear: vi.fn(),
    ...overrides,
  };
}

describe("barra de histórico e zoom", () => {
  it("mostra o zoom em porcentagem e dispara as ações", () => {
    const props = historyProps();
    render(<HandwritingHistoryBar {...props} />);
    expect(screen.getByText("150%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    fireEvent.click(screen.getByRole("button", { name: "Refazer" }));
    fireEvent.click(screen.getByRole("button", { name: "Limpar folha" }));
    expect(props.onUndo).toHaveBeenCalledTimes(1);
    expect(props.onRedo).toHaveBeenCalledTimes(1);
    expect(props.onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Redefinir visualização" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lupa para ampliar" })).toBeNull();
  });

  it("desativa desfazer, refazer e limpar quando não há o que fazer", () => {
    render(
      <HandwritingHistoryBar
        {...historyProps({ canUndo: false, canRedo: false, canClear: false })}
      />,
    );
    for (const name of ["Desfazer", "Refazer", "Limpar folha"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("esconde a correção automática fora do modo texto", () => {
    render(<HandwritingHistoryBar {...historyProps()} />);
    expect(screen.queryByRole("button", { name: "Correção automática de texto" })).toBeNull();
  });

  it("mostra a correção automática no modo texto e alterna ao clicar", () => {
    const props = historyProps({ textMode: true, textAutoCorrect: false });
    render(<HandwritingHistoryBar {...props} />);
    const toggle = screen.getByRole("button", { name: "Correção automática de texto" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(props.onToggleAutoCorrect).toHaveBeenCalledTimes(1);
  });
});

describe("seletor de papel", () => {
  const base = {
    paper: "ruled" as const,
    paperColor: "light" as const,
    sectionsOpen: { paper: false, color: false },
    onToggleSection: vi.fn(),
    onSelectPaper: vi.fn(),
    onSelectPaperColor: vi.fn(),
  };

  it("mantém as opções escondidas até abrir a seção", () => {
    render(<HandwritingPaperPicker {...base} />);
    expect(screen.queryByRole("button", { name: "Quadriculado" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Escura" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tipo de papel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cor da folha" }));
    expect(base.onToggleSection).toHaveBeenNthCalledWith(1, "paper");
    expect(base.onToggleSection).toHaveBeenNthCalledWith(2, "color");
  });

  it("lista os tipos de papel, marca o atual e escolhe outro", () => {
    const onSelectPaper = vi.fn();
    render(
      <HandwritingPaperPicker
        {...base}
        sectionsOpen={{ paper: true, color: false }}
        onSelectPaper={onSelectPaper}
      />,
    );
    expect(screen.getByRole("button", { name: "Pautado" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Pontilhado" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "Quadriculado" }));
    expect(onSelectPaper).toHaveBeenCalledWith("grid");
  });

  it("lista as cores da folha e escolhe outra", () => {
    const onSelectPaperColor = vi.fn();
    render(
      <HandwritingPaperPicker
        {...base}
        paperColor="aged"
        sectionsOpen={{ paper: false, color: true }}
        onSelectPaperColor={onSelectPaperColor}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Papel de livro" }).getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Escura" }));
    expect(onSelectPaperColor).toHaveBeenCalledWith("night");
  });
});

describe("janela de escrita ampliada", () => {
  function windowProps() {
    return {
      canvasRef: createRef<HTMLCanvasElement>(),
      status: "Coluna 2, linha 3",
      autoFollow: true,
      onAutoFollowChange: vi.fn(),
      onStart: vi.fn(),
      onMove: vi.fn(),
      onFinish: vi.fn(),
      onBack: vi.fn(),
      onAdvance: vi.fn(),
      onNextLine: vi.fn(),
    };
  }

  it("mostra o status e dispara voltar, avançar e próxima linha", () => {
    const props = windowProps();
    render(<HandwritingWritingWindow {...props} />);
    expect(screen.getByText("Coluna 2, linha 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: "Avançar" }));
    fireEvent.click(screen.getByRole("button", { name: "Próxima linha" }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.onAdvance).toHaveBeenCalledTimes(1);
    expect(props.onNextLine).toHaveBeenCalledTimes(1);
  });

  it("informa a mudança de acompanhar escrita", () => {
    const props = windowProps();
    render(<HandwritingWritingWindow {...props} />);
    const checkbox = screen.getByRole("checkbox", { name: "Acompanhar escrita" });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    fireEvent.click(checkbox);
    expect(props.onAutoFollowChange).toHaveBeenCalledWith(false);
  });

  it("entrega o canvas ao pai e repassa os gestos de ponteiro", () => {
    const props = windowProps();
    render(<HandwritingWritingWindow {...props} />);
    const canvas = screen.getByLabelText("Área ampliada para escrever com dedo ou caneta");
    expect(props.canvasRef.current).toBe(canvas);
    fireEvent.pointerDown(canvas);
    fireEvent.pointerMove(canvas);
    fireEvent.pointerUp(canvas);
    fireEvent.pointerCancel(canvas);
    expect(props.onStart).toHaveBeenCalledTimes(1);
    expect(props.onMove).toHaveBeenCalledTimes(1);
    expect(props.onFinish).toHaveBeenCalledTimes(2);
  });
});

describe("rodapé do editor", () => {
  function cloud(status: CloudSyncState["status"]): CloudSyncState {
    return { authenticated: true, status } as CloudSyncState;
  }

  it("sem conta, mostra o rascunho e convida a entrar", () => {
    render(<HandwritingFooter cloud={undefined} draftStatus="Rascunho recuperado" inert={false} />);
    expect(screen.getByText("Rascunho recuperado")).toBeTruthy();
    expect(
      screen.getByText("Entre na sua conta para sincronizar entre dispositivos."),
    ).toBeTruthy();
  });

  it("sem conta e sem rascunho, informa o salvamento automático", () => {
    render(<HandwritingFooter cloud={undefined} draftStatus="" inert={false} />);
    expect(screen.getByText("Salvamento automático ativo")).toBeTruthy();
  });

  it.each([
    ["synced", "Sincronizado na sua conta"],
    ["offline", "Sem conexão. Alterações aguardando sincronização"],
    ["conflict", "Há alterações simultâneas para revisar na conta"],
    ["syncing", "Sincronizando com sua conta…"],
  ] as const)("com conta e estado %s, mostra a mensagem correta", (status, message) => {
    render(
      <HandwritingFooter
        cloud={cloud(status as CloudSyncState["status"])}
        draftStatus=""
        inert={false}
      />,
    );
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByText("Computador e celular usam a mesma conta.")).toBeTruthy();
  });
});
