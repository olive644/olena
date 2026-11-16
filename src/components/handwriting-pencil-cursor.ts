import { normalizeHex } from "./handwriting-quick-colors-model";

export const PENCIL_CURSOR_TIP = { x: 6, y: 21 } as const;
export const PENCIL_CURSOR_ART =
  '<g transform="translate(4 4) scale(.5625)"><path d="m4 22 18-19 7 7-18 19-9 2z" fill="#292432"/><path d="m5 21 16-17 7 7-17 17z" fill="#ffcf35"/><path d="m5 21 16-17 2 2L7 23z" fill="#fff0a1"/><path d="m9 25 16-17 3 3-17 17z" fill="#d99524"/><path d="m21 4 2-2 7 7-2 2z" fill="#a77af2"/><path d="m23 2 2-1 6 6-1 2z" fill="#7240b1"/><path d="m5 21 6 7-8 2z" fill="#e4be8b"/><path d="m4 26 3 3-4 1z" fill="#292432"/></g>';

export function pencilCursor(color: string, drawing = false) {
  const dot = drawing
    ? `<circle cx="6" cy="21" r="3.5" fill="${normalizeHex(color) ?? "#17151c"}" stroke="#fff9ef" stroke-width="1.5"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">${dot}${PENCIL_CURSOR_ART}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${PENCIL_CURSOR_TIP.x} ${PENCIL_CURSOR_TIP.y}, crosshair`;
}
