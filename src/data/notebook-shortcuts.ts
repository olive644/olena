import { useEffect, useState } from "react";
import {
  NOTEBOOK_SHORTCUTS,
  type NotebookShortcutId,
} from "../components/notebook-shortcut-catalog";
import { readNotebookPreferences } from "./notebook-preferences";
import {
  SYNCED_STORAGE_EVENT,
  SYNCED_STORAGE_APPLIED_EVENT,
  writeSyncedStorage,
} from "./synced-storage";

export const NOTEBOOK_SHORTCUTS_KEY = "helena.notebookShortcuts.v1";
export const PEN_ACTIONS = ["selected", "pen", "highlighter", "eraser", "hand", "select"] as const;
export type PenShortcutAction = (typeof PEN_ACTIONS)[number];
export const DEFAULT_NOTEBOOK_BINDINGS = Object.fromEntries(
  NOTEBOOK_SHORTCUTS.map((item) => [item.id, item.binding]),
) as Record<NotebookShortcutId, string>;
export type NotebookShortcutSettings = {
  bindings: Record<NotebookShortcutId, string>;
  penSide: PenShortcutAction;
  penTail: PenShortcutAction;
};
export function defaultNotebookShortcuts(): NotebookShortcutSettings {
  return { bindings: { ...DEFAULT_NOTEBOOK_BINDINGS }, penSide: "hand", penTail: "eraser" };
}
const validBinding =
  /^(?:(?:mod|alt|shift)\+)*(?:[\p{L}\p{N}]|f(?:[1-9]|1\d|2[0-4])|arrow(?:up|down|left|right)|space|tab|home|end|pageup|pagedown|delete|backspace|plus|minus|period|comma|slash|semicolon|bracketleft|bracketright|backslash|quote|backquote)$/u;
export function shortcutFromEvent(
  event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">,
): string | null {
  let key = event.code === "Space" ? "space" : event.key.toLowerCase();
  const aliases: Record<string, string> = {
    " ": "space",
    "+": "plus",
    "=": "plus",
    "-": "minus",
    ".": "period",
    ",": "comma",
    "/": "slash",
    "?": "slash",
    ";": "semicolon",
    ":": "semicolon",
    "[": "bracketleft",
    "{": "bracketleft",
    "]": "bracketright",
    "}": "bracketright",
    "\\": "backslash",
    "|": "backslash",
    '"': "quote",
    "\'": "quote",
    "`": "backquote",
    "~": "backquote",
  };
  key = aliases[key] ?? key;
  const value = [
    event.ctrlKey || event.metaKey ? "mod" : "",
    event.altKey ? "alt" : "",
    event.shiftKey && key !== "plus" ? "shift" : "",
    key,
  ]
    .filter(Boolean)
    .join("+");
  return validBinding.test(value) ? value : null;
}
export function shortcutLabel(binding: string): string {
  const labels: Record<string, string> = {
    mod: "Ctrl",
    alt: "Alt",
    shift: "Shift",
    space: "Space",
    arrowleft: "←",
    arrowright: "→",
    arrowup: "↑",
    arrowdown: "↓",
    plus: "+",
    minus: "−",
    period: ".",
    comma: ",",
    slash: "/",
  };
  return binding
    .split("+")
    .map(
      (key) =>
        labels[key] ??
        (key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1)),
    )
    .join(" + ");
}
export function readNotebookShortcuts(): NotebookShortcutSettings {
  const result = defaultNotebookShortcuts();
  const previous = readNotebookPreferences();
  result.penSide = previous.penBarrelErases ? "eraser" : "hand";
  result.penTail = previous.penTailErases ? "eraser" : "selected";
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(NOTEBOOK_SHORTCUTS_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return result;
    const record = parsed as Record<string, unknown>;
    for (const key of ["penSide", "penTail"] as const) {
      const value = record[key];
      if (typeof value === "string" && PEN_ACTIONS.some((action) => action === value))
        result[key] = value as PenShortcutAction;
    }
    const bindings = record["bindings"];
    if (bindings && typeof bindings === "object") {
      for (const item of NOTEBOOK_SHORTCUTS) {
        const value = (bindings as Record<string, unknown>)[item.id];
        if (
          typeof value === "string" &&
          (value === "" || (value.length <= 80 && validBinding.test(value)))
        )
          result.bindings[item.id] = value;
      }
    }
    const used = new Set<string>();
    for (const item of NOTEBOOK_SHORTCUTS) {
      const binding = result.bindings[item.id];
      if (binding && used.has(binding)) result.bindings[item.id] = "";
      else if (binding) used.add(binding);
    }
  } catch {
    /* Mantém os padrões quando o armazenamento não está disponível. */
  }
  return result;
}

export function useNotebookShortcuts() {
  const [settings, setSettings] = useState(readNotebookShortcuts);
  const [error, setError] = useState(false);
  useEffect(() => {
    const apply = () => setSettings(readNotebookShortcuts());
    window.addEventListener(SYNCED_STORAGE_EVENT, apply);
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, apply);
    return () => {
      window.removeEventListener(SYNCED_STORAGE_EVENT, apply);
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, apply);
    };
  }, []);
  function save(next: NotebookShortcutSettings) {
    setSettings(next);
    try {
      writeSyncedStorage(NOTEBOOK_SHORTCUTS_KEY, JSON.stringify(next));
      setError(false);
    } catch {
      setError(true);
    }
  }
  function changeBinding(id: NotebookShortcutId, binding: string): NotebookShortcutId | null {
    const current = readNotebookShortcuts();
    const conflict = binding
      ? NOTEBOOK_SHORTCUTS.find((item) => item.id !== id && current.bindings[item.id] === binding)
      : undefined;
    if (conflict) return conflict.id;
    save({ ...current, bindings: { ...current.bindings, [id]: binding } });
    return null;
  }
  return {
    settings,
    error,
    changeBinding,
    changePen: (key: "penSide" | "penTail", value: PenShortcutAction) =>
      save({ ...readNotebookShortcuts(), [key]: value }),
    reset: () => save(defaultNotebookShortcuts()),
  };
}
