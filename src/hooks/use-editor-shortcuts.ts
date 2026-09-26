import { useEffect, useRef, type RefObject } from "react";
import type { HandwritingTool } from "../components/handwriting-types";

export type EditorShortcutState = {
  tool: HandwritingTool;
  fileAction: "import" | "export" | null;
  writingWindowOpen: boolean;
  undo: () => void;
  redo: () => void;
  zoomAt: (clientX: number, clientY: number, direction: 1 | -1) => void;
  resetView: () => void;
  setTool: (next: HandwritingTool) => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  selectAll: () => void;
  // Com algo selecionado, as setas empurram a seleção (Shift: dez vezes mais).
  hasSelection: boolean;
  nudge: (dx: number, dy: number) => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

// Atalhos de teclado no estilo Xournal++ e de apps de mesa digitalizadora: Ctrl+Z e Ctrl+Shift+Z
// (desfazer e refazer), P, E, H e V (trocar de ferramenta), Ctrl com + - 0 (zoom), Espaço
// segurado para rolar a folha por um instante, Ctrl+C X V D A com a seleção, e a roda do mouse
// para o zoom. Os ouvintes são criados uma vez e leem o estado mais recente por uma ref.
export function useEditorShortcuts(
  state: EditorShortcutState,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  viewportRef: RefObject<HTMLElement | null>,
) {
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  // Ferramenta que estava ativa antes de o Espaço trocar para a mão.
  const spaceTool = useRef<HandwritingTool | null>(null);

  useEffect(() => {
    function centerZoom(direction: 1 | -1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      latest.current.zoomAt(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
        direction,
      );
    }
    function onKeyDown(event: KeyboardEvent) {
      const current = latest.current;
      if (current.fileAction || current.writingWindowOpen || isEditableTarget(event.target)) return;
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      if (ctrlOrCmd && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) current.redo();
        else current.undo();
        return;
      }
      if (ctrlOrCmd && current.tool === "select") {
        const actions: Record<string, () => void> = {
          c: current.copy,
          x: current.cut,
          v: current.paste,
          d: current.duplicate,
          a: current.selectAll,
        };
        const action = actions[event.key.toLowerCase()];
        if (action) {
          event.preventDefault();
          action();
          return;
        }
      }
      if (ctrlOrCmd && event.key.toLowerCase() === "y") {
        event.preventDefault();
        current.redo();
        return;
      }
      if (ctrlOrCmd && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        centerZoom(1);
        return;
      }
      if (ctrlOrCmd && event.key === "-") {
        event.preventDefault();
        centerZoom(-1);
        return;
      }
      if (ctrlOrCmd && event.key === "0") {
        event.preventDefault();
        current.resetView();
        return;
      }
      const arrow: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const step = arrow[event.key];
      if (step && current.hasSelection && !ctrlOrCmd && !event.altKey) {
        event.preventDefault();
        const size = event.shiftKey ? 10 : 1;
        current.nudge(step[0] * size, step[1] * size);
        return;
      }
      if (ctrlOrCmd || event.altKey) return;
      if (event.code === "Space") {
        if (!event.repeat && spaceTool.current === null && current.tool !== "hand") {
          spaceTool.current = current.tool;
          current.setTool("hand");
        }
        event.preventDefault();
        return;
      }
      const key = event.key.toLowerCase();
      const tools: Record<string, HandwritingTool> = {
        p: "pen",
        e: "eraser",
        h: "hand",
        v: "select",
      };
      const next = tools[key];
      if (next) {
        event.preventDefault();
        current.setTool(next);
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      const previous = spaceTool.current;
      if (previous === null) return;
      spaceTool.current = null;
      latest.current.setTool(previous);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [canvasRef]);

  // Rolar a roda dá zoom no ponto do cursor, como em apps de desenho profissionais. O ouvinte
  // nativo (não passivo) permite o preventDefault.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onWheel(event: WheelEvent) {
      if (event.shiftKey && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      latest.current.zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1 : -1);
    }
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [viewportRef]);
}
