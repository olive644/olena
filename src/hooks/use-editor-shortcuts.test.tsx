import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEditorShortcuts, type EditorShortcutState } from "./use-editor-shortcuts";

function setup(overrides: Partial<EditorShortcutState> = {}) {
  const state: EditorShortcutState = {
    tool: "pen",
    fileAction: null,
    writingWindowOpen: false,
    undo: vi.fn(),
    redo: vi.fn(),
    zoomAt: vi.fn(),
    resetView: vi.fn(),
    setTool: vi.fn(),
    copy: vi.fn(),
    cut: vi.fn(),
    paste: vi.fn(),
    duplicate: vi.fn(),
    selectAll: vi.fn(),
    hasSelection: false,
    nudge: vi.fn(),
    ...overrides,
  };
  const canvas = document.createElement("canvas");
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    left: 100,
    top: 200,
    width: 400,
    height: 600,
    right: 500,
    bottom: 800,
    x: 100,
    y: 200,
    toJSON: () => ({}),
  });
  const viewport = document.createElement("div");
  const view = renderHook(
    ({ current }) => useEditorShortcuts(current, { current: canvas }, { current: viewport }),
    { initialProps: { current: state } },
  );
  return { state, viewport, view };
}

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe("atalhos do editor", () => {
  it("Ctrl+Z desfaz, Ctrl+Shift+Z e Ctrl+Y refazem, e o navegador não age junto", () => {
    const { state } = setup();
    expect(press("z", { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(state.undo).toHaveBeenCalledTimes(1);
    press("Z", { ctrlKey: true, shiftKey: true });
    press("y", { metaKey: true });
    expect(state.redo).toHaveBeenCalledTimes(2);
  });

  it("P, E, H e V trocam de ferramenta", () => {
    const { state } = setup();
    for (const key of ["p", "e", "h", "v"]) press(key);
    expect((state.setTool as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0])).toEqual([
      "pen",
      "eraser",
      "hand",
      "select",
    ]);
  });

  it("Ctrl com + - dá zoom no centro da folha e Ctrl+0 volta ao início", () => {
    const { state } = setup();
    press("+", { ctrlKey: true });
    press("-", { ctrlKey: true });
    expect(state.zoomAt).toHaveBeenNthCalledWith(1, 300, 500, 1);
    expect(state.zoomAt).toHaveBeenNthCalledWith(2, 300, 500, -1);
    press("0", { ctrlKey: true });
    expect(state.resetView).toHaveBeenCalledTimes(1);
  });

  it("copiar, recortar, colar, duplicar e selecionar tudo só valem com a ferramenta Selecionar", () => {
    const pen = setup();
    press("c", { ctrlKey: true });
    expect(pen.state.copy).not.toHaveBeenCalled();
    pen.view.unmount();
    const select = setup({ tool: "select" });
    for (const key of ["c", "x", "v", "d", "a"]) press(key, { ctrlKey: true });
    expect(select.state.copy).toHaveBeenCalledTimes(1);
    expect(select.state.cut).toHaveBeenCalledTimes(1);
    expect(select.state.paste).toHaveBeenCalledTimes(1);
    expect(select.state.duplicate).toHaveBeenCalledTimes(1);
    expect(select.state.selectAll).toHaveBeenCalledTimes(1);
  });

  it("com algo selecionado as setas empurram a seleção, e Shift empurra dez vezes mais", () => {
    const { state } = setup({ hasSelection: true });
    press("ArrowRight");
    press("ArrowUp", { shiftKey: true });
    expect(state.nudge).toHaveBeenNthCalledWith(1, 1, 0);
    expect(state.nudge).toHaveBeenNthCalledWith(2, 0, -10);
  });

  it("sem seleção as setas não são interceptadas", () => {
    const { state } = setup({ hasSelection: false });
    expect(press("ArrowLeft").defaultPrevented).toBe(false);
    expect(state.nudge).not.toHaveBeenCalled();
  });

  it("Espaço vira a mão enquanto está pressionado e devolve a ferramenta ao soltar", () => {
    const { state } = setup({ tool: "pen" });
    press(" ", { code: "Space" });
    press(" ", { code: "Space", repeat: true });
    expect(state.setTool).toHaveBeenCalledTimes(1);
    expect(state.setTool).toHaveBeenLastCalledWith("hand");
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    expect(state.setTool).toHaveBeenLastCalledWith("pen");
  });

  it("ignora as teclas ao digitar em um campo, com janela de arquivo ou de escrita abertas", () => {
    const { state } = setup();
    const input = document.createElement("input");
    document.body.append(input);
    press("p", {}, input);
    input.remove();
    expect(state.setTool).not.toHaveBeenCalled();
    const file = setup({ fileAction: "import" });
    press("p");
    expect(file.state.setTool).not.toHaveBeenCalled();
    file.view.unmount();
    const writing = setup({ writingWindowOpen: true });
    press("p");
    expect(writing.state.setTool).not.toHaveBeenCalled();
  });

  it("lê sempre o estado mais recente sem recriar os ouvintes", () => {
    const { state, view } = setup();
    const newer = { ...state, undo: vi.fn() };
    view.rerender({ current: newer });
    press("z", { ctrlKey: true });
    expect(newer.undo).toHaveBeenCalledTimes(1);
    expect(state.undo).not.toHaveBeenCalled();
  });

  it("a roda do mouse dá zoom no cursor, exceto com Shift sozinho", () => {
    const { state, viewport } = setup();
    viewport.dispatchEvent(
      new WheelEvent("wheel", { deltaY: -100, clientX: 10, clientY: 20, cancelable: true }),
    );
    viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, clientX: 30, clientY: 40 }));
    viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, shiftKey: true }));
    expect(state.zoomAt).toHaveBeenNthCalledWith(1, 10, 20, 1);
    expect(state.zoomAt).toHaveBeenNthCalledWith(2, 30, 40, -1);
    expect(state.zoomAt).toHaveBeenCalledTimes(2);
  });
});
