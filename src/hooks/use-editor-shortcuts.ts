import { useEffect, useRef, type RefObject } from "react";
import { useNotebookShortcuts, shortcutFromEvent } from "../data/notebook-shortcuts";
import type { HandwritingTool } from "../components/handwriting-types";
import {
  NOTEBOOK_TOOL_SHORTCUTS,
  NOTEBOOK_INSERT_SHORTCUTS,
  NOTEBOOK_SHORTCUTS,
} from "../components/notebook-shortcut-catalog";

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
  copyStyle?: () => void;
  insert?: (kind: "text" | "sticky" | "table") => void;
  cycleSelection?: (direction: -1 | 1) => void;
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
  const { settings } = useNotebookShortcuts();
  const bindings = useRef(settings.bindings);
  const holdKey = useRef("");
  useEffect(() => {
    latest.current = state;
    bindings.current = settings.bindings;
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
      const binding = shortcutFromEvent(event);
      const action = binding
        ? NOTEBOOK_SHORTCUTS.find((item) => bindings.current[item.id] === binding)?.id
        : undefined;
      if (!action) return;
      const selectionActions = {
        copy: current.copy,
        cut: current.cut,
        paste: current.paste,
        duplicate: current.duplicate,
        selectAll: current.selectAll,
      };
      if (action in selectionActions) {
        if (current.tool !== "select") return;
        event.preventDefault();
        selectionActions[action as keyof typeof selectionActions]();
        return;
      }
      const directions: Record<string, [number, number]> = {
        left: [-1, 0],
        right: [1, 0],
        up: [0, -1],
        down: [0, 1],
      };
      const direction = directions[action.replace("Large", "")];
      if (direction) {
        if (!current.hasSelection) return;
        event.preventDefault();
        const step = action.endsWith("Large") ? 10 : 1;
        current.nudge(direction[0] * step, direction[1] * step);
        return;
      }
      if (action === "nextItem" || action === "previousItem") {
        if (
          current.tool !== "select" ||
          event.target !== canvasRef.current ||
          !current.cycleSelection
        )
          return;
        event.preventDefault();
        current.cycleSelection(action === "nextItem" ? 1 : -1);
        return;
      }
      if (action === "panHold") {
        if (!event.repeat && spaceTool.current === null && current.tool !== "hand") {
          spaceTool.current = current.tool;
          holdKey.current = event.code || event.key.toLowerCase();
          current.setTool("hand");
        }
        event.preventDefault();
        return;
      }
      const tool = NOTEBOOK_TOOL_SHORTCUTS.find((item) => action === "tool-" + item.tool);
      if (tool) {
        event.preventDefault();
        current.setTool(tool.tool);
        return;
      }
      const insertion = NOTEBOOK_INSERT_SHORTCUTS.find((item) => action === "insert-" + item.kind);
      if (insertion && current.insert) {
        event.preventDefault();
        if (!event.repeat) current.insert(insertion.kind);
        return;
      }
      const actions: Partial<Record<typeof action, (() => void) | undefined>> = {
        undo: current.undo,
        redo: current.redo,
        redoAlt: current.redo,
        copyStyle: current.copyStyle,
        zoomIn: () => centerZoom(1),
        zoomOut: () => centerZoom(-1),
        resetView: current.resetView,
      };
      const run = actions[action];
      if (run) {
        event.preventDefault();
        run();
      }
    }
    function releasePan() {
      const previous = spaceTool.current;
      if (previous === null) return;
      spaceTool.current = null;
      holdKey.current = "";
      latest.current.setTool(previous);
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code !== holdKey.current && event.key.toLowerCase() !== holdKey.current) return;
      releasePan();
    }
    window.addEventListener("blur", releasePan);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releasePan);
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
