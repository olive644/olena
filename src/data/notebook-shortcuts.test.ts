import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  NOTEBOOK_SHORTCUTS_KEY,
  DEFAULT_NOTEBOOK_BINDINGS,
  readNotebookShortcuts,
  useNotebookShortcuts,
  shortcutFromEvent,
} from "./notebook-shortcuts";
import { NOTEBOOK_PREFERENCES_KEY } from "./notebook-preferences";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("migra as ações antigas da caneta sem mudar a escolha do usuário", () => {
  localStorage.setItem(
    NOTEBOOK_PREFERENCES_KEY,
    JSON.stringify({ penBarrelErases: true, penTailErases: false }),
  );
  expect(readNotebookShortcuts()).toMatchObject({
    penSide: "eraser",
    penTail: "selected",
    bindings: DEFAULT_NOTEBOOK_BINDINGS,
  });
});
it("recusa dados inválidos e combinações duplicadas ao carregar", () => {
  localStorage.setItem(
    NOTEBOOK_SHORTCUTS_KEY,
    JSON.stringify({
      penSide: "unsupported",
      bindings: { "tool-pen": "q", "tool-eraser": "q", undo: 12 },
    }),
  );
  expect(readNotebookShortcuts()).toMatchObject({
    penSide: "hand",
    bindings: { "tool-pen": "q", "tool-eraser": "", undo: "mod+z" },
  });
});
it("compartilha alterações, detecta conflitos e restaura teclado e caneta", () => {
  const editor = renderHook(useNotebookShortcuts);
  const profile = renderHook(useNotebookShortcuts);
  act(() => editor.result.current.changeBinding("tool-pen", "q"));
  expect(profile.result.current.settings.bindings["tool-pen"]).toBe("q");
  let conflict: unknown;
  act(() => {
    conflict = profile.result.current.changeBinding("tool-eraser", "q");
  });
  expect(conflict).toBe("tool-pen");
  expect(editor.result.current.settings.bindings["tool-eraser"]).toBe("e");
  act(() => profile.result.current.changePen("penSide", "highlighter"));
  expect(editor.result.current.settings.penSide).toBe("highlighter");
  act(() => editor.result.current.reset());
  expect(profile.result.current.settings).toEqual({
    bindings: DEFAULT_NOTEBOOK_BINDINGS,
    penSide: "hand",
    penTail: "eraser",
  });
  expect(readNotebookShortcuts()).toEqual(profile.result.current.settings);
});
it("normaliza Ctrl, Cmd, espaço e sinais, sem aceitar modificadores sozinhos", () => {
  expect(
    shortcutFromEvent(new KeyboardEvent("keydown", { key: "c", metaKey: true, altKey: true })),
  ).toBe("mod+alt+c");
  expect(
    shortcutFromEvent(new KeyboardEvent("keydown", { key: "+", ctrlKey: true, shiftKey: true })),
  ).toBe("mod+plus");
  expect(shortcutFromEvent(new KeyboardEvent("keydown", { key: " ", code: "Space" }))).toBe(
    "space",
  );
  expect(
    shortcutFromEvent(new KeyboardEvent("keydown", { key: "Shift", shiftKey: true })),
  ).toBeNull();
});
