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
    expect(screen.getByRole("status", { name: "Zoom atual" }).textContent).toContain("150");
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
    expect(screen.getByRole("button", { name: "Quadro amplo" }).getAttribute("aria-pressed")).toBe(
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
      view: { x: 100, y: 110, zoom: 1 },
      page: { width: 1200, height: 1600 },
      tool: "pen",
      onNavigate: vi.fn(),
      onStart: vi.fn(),
      onMove: vi.fn(),
      onFinish: vi.fn(),
    };
  }

  it("tem uma alça acessível para mover a janela, também por teclado", () => {
    render(<HandwritingWritingWindow {...windowProps()} />);
    const grip = screen.getByRole("button", { name: "Mover janela de escrita" });
    expect(grip.getAttribute("title")).toContain("setas do teclado");
    // Sem layout (jsdom) a janela ainda monta e as setas não quebram nada.
    fireEvent.keyDown(grip, { key: "ArrowRight" });
    fireEvent.keyDown(grip, { key: "a" });
    expect(screen.getByRole("region", { name: "Janela de escrita ampliada" })).toBeTruthy();
  });

  it("usa navegação por gestos sem as três setas nem o status de coluna", () => {
    render(<HandwritingWritingWindow {...windowProps()} />);
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Avançar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Próxima linha" })).toBeNull();
    expect(document.querySelector(".handwriting-writing-window__status")).toBeNull();
  });
  it("mantém o acompanhamento sem oferecer um controle para desativá-lo", () => {
    render(<HandwritingWritingWindow {...windowProps()} />);
    expect(screen.queryByRole("checkbox", { name: "Acompanhar escrita" })).toBeNull();
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
