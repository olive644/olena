// Posição da janela de escrita ampliada. Fica guardada como fração da área do editor, só neste
// aparelho (preferência de conveniência, não progresso), para sobreviver a telas de tamanhos diferentes.
export const WRITING_WINDOW_POSITION_KEY = "olena.handwriting.writing-window-position";

export type WritingWindowPoint = { x: number; y: number };
export type WritingWindowBox = { width: number; height: number };
// A área onde a janela pode ficar: a região de escrita, com origem dentro do editor.
export type WritingWindowArea = WritingWindowBox & { x?: number; y?: number };

// Mantém a janela inteira dentro da área de escrita (assim ela nunca cobre as ferramentas). Se ela
// for maior que a área, fica no canto de cima e da esquerda.
export function clampWritingWindow(
  point: WritingWindowPoint,
  area: WritingWindowArea,
  size: WritingWindowBox,
): WritingWindowPoint {
  const minX = area.x ?? 0;
  const minY = area.y ?? 0;
  const maxX = minX + Math.max(0, area.width - size.width);
  const maxY = minY + Math.max(0, area.height - size.height);
  return {
    x: Math.min(maxX, Math.max(minX, Math.round(point.x))),
    y: Math.min(maxY, Math.max(minY, Math.round(point.y))),
  };
}

export function toFraction(
  point: WritingWindowPoint,
  area: WritingWindowArea,
  size: WritingWindowBox,
): WritingWindowPoint {
  const rangeX = Math.max(1, area.width - size.width);
  const rangeY = Math.max(1, area.height - size.height);
  return { x: (point.x - (area.x ?? 0)) / rangeX, y: (point.y - (area.y ?? 0)) / rangeY };
}

export function fromFraction(
  fraction: WritingWindowPoint,
  area: WritingWindowArea,
  size: WritingWindowBox,
): WritingWindowPoint {
  return clampWritingWindow(
    {
      x: (area.x ?? 0) + fraction.x * Math.max(0, area.width - size.width),
      y: (area.y ?? 0) + fraction.y * Math.max(0, area.height - size.height),
    },
    area,
    size,
  );
}

function validFraction(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function readWritingWindowFraction(): WritingWindowPoint | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(WRITING_WINDOW_POSITION_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return null;
    const { x, y } = parsed as Record<string, unknown>;
    return validFraction(x) && validFraction(y) ? { x, y } : null;
  } catch {
    return null;
  }
}

export function writeWritingWindowFraction(fraction: WritingWindowPoint) {
  try {
    localStorage.setItem(WRITING_WINDOW_POSITION_KEY, JSON.stringify(fraction));
  } catch {
    // Sem armazenamento (janela privada, bloqueio): a janela move, só não lembra.
  }
}
