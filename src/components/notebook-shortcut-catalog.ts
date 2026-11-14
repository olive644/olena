export const NOTEBOOK_TOOL_SHORTCUTS = [
  { key: "p", tool: "pen", label: 355 },
  { key: "e", tool: "eraser", label: 357 },
  { key: "h", tool: "hand", label: 327 },
  { key: "v", tool: "select", label: 359 },
  { key: "m", tool: "highlighter", label: 356 },
  { key: "r", tool: "ruler", label: 345 },
  { key: "c", tool: "curve", label: 347 },
  { key: "a", tool: "coordinates", label: 352 },
] as const;

export const NOTEBOOK_INSERT_SHORTCUTS = [
  { key: "t", kind: "text", label: 361 },
  { key: "n", kind: "sticky", label: 363 },
  { key: "g", kind: "table", label: 364 },
] as const;

export const NOTEBOOK_SHORTCUTS = [
  ...NOTEBOOK_TOOL_SHORTCUTS.map((item) => ({
    id: `tool-${item.tool}` as const,
    label: item.label,
    binding: item.key,
  })),
  ...NOTEBOOK_INSERT_SHORTCUTS.map((item) => ({
    id: `insert-${item.kind}` as const,
    label: item.label,
    binding: item.key,
  })),
  { id: "undo", label: 3806, binding: "mod+z" },
  { id: "redo", label: 3807, binding: "mod+shift+z" },
  { id: "redoAlt", label: 3844, binding: "mod+y" },
  { id: "copy", label: 201, binding: "mod+c" },
  { id: "cut", label: 203, binding: "mod+x" },
  { id: "paste", label: 200, binding: "mod+v" },
  { id: "duplicate", label: 204, binding: "mod+d" },
  { id: "selectAll", label: 199, binding: "mod+a" },
  { id: "copyStyle", label: 3788, binding: "mod+alt+c" },
  { id: "zoomIn", label: 3831, binding: "mod+plus" },
  { id: "zoomOut", label: 3832, binding: "mod+minus" },
  { id: "resetView", label: 3833, binding: "mod+0" },
  { id: "panHold", label: 3808, binding: "space" },
  { id: "left", label: 3834, binding: "arrowleft" },
  { id: "right", label: 3835, binding: "arrowright" },
  { id: "up", label: 3836, binding: "arrowup" },
  { id: "down", label: 3837, binding: "arrowdown" },
  { id: "leftLarge", label: 3838, binding: "shift+arrowleft" },
  { id: "rightLarge", label: 3839, binding: "shift+arrowright" },
  { id: "upLarge", label: 3840, binding: "shift+arrowup" },
  { id: "downLarge", label: 3841, binding: "shift+arrowdown" },
  { id: "nextItem", label: 3842, binding: "tab" },
  { id: "previousItem", label: 3843, binding: "shift+tab" },
] as const;
export type NotebookShortcutId = (typeof NOTEBOOK_SHORTCUTS)[number]["id"];
