// Cores recentes e conta-gotas da barra de cores rápidas do editor. A lista de recentes é só
// preferência deste aparelho (cache de conveniência), nunca progresso do aluno.
export const QUICK_COLOR_STORAGE_KEY = "olena.handwriting.recent-colors";
export const QUICK_COLOR_LIMIT = 5;

export function normalizeHex(value: string): string | null {
  const text = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
}

// Põe a cor no começo da lista, sem repetir e sem guardar as cores que já estão fixas na barra.
export function rememberRecentColor(
  recent: readonly string[],
  color: string,
  fixed: readonly string[],
  limit = QUICK_COLOR_LIMIT,
): string[] {
  const hex = normalizeHex(color);
  if (!hex || fixed.includes(hex)) return [...recent].slice(0, limit);
  return [hex, ...recent.filter((item) => item !== hex)].slice(0, limit);
}

export function readRecentColors(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(QUICK_COLOR_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const colors: string[] = [];
    for (const item of parsed) {
      const hex = typeof item === "string" ? normalizeHex(item) : null;
      if (hex && !colors.includes(hex)) colors.push(hex);
    }
    return colors.slice(0, QUICK_COLOR_LIMIT);
  } catch {
    return [];
  }
}

export function writeRecentColors(colors: readonly string[]) {
  try {
    localStorage.setItem(
      QUICK_COLOR_STORAGE_KEY,
      JSON.stringify(colors.slice(0, QUICK_COLOR_LIMIT)),
    );
  } catch {
    // Sem armazenamento (janela privada, bloqueio): a barra funciona, só não lembra.
  }
}

function toHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

// Cor que a pessoa vê num ponto da folha: a folha é uma pilha de canvas (papel, imagens, tinta) e
// o resultado é a soma delas, da primeira à última. Devolve null fora da folha ou sem cor.
export function sampleCanvasStack(
  canvases: readonly HTMLCanvasElement[],
  clientX: number,
  clientY: number,
): string | null {
  if (!canvases.length) return null;
  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;
  const context = probe.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  let inside = false;
  for (const canvas of canvases) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
    inside = true;
    context.drawImage(canvas, x, y, 1, 1, 0, 0, 1, 1);
  }
  if (!inside) return null;
  const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
  return alpha === 0 ? null : toHex(red, green, blue);
}
