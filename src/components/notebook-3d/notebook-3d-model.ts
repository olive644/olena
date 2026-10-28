// Regras do caderno 3D sem dependência de WebGL: estados, pilha, curva da folha e marcações.
// O módulo é puro para ser testado no jsdom e reaproveitado pela cena.

/** Medidas em unidades da cena. A folha tem a proporção 3:4 do caderno 2D. */
export const BOOK = {
  pageWidth: 3,
  pageHeight: 4,
  boardThickness: 0.075,
  sheetThickness: 0.026,
  boardWidth: 3.12,
  boardHeight: 4.22,
  segmentsX: 40,
  segmentsZ: 10,
} as const;

/** Divisória com a proporção do app (96 x 44 px sobre uma folha de 380 x 507 px). */
export const DIVIDER = { outside: 0.56, inside: 0.3, height: 0.42 } as const;
/** Marcador com a proporção do app (56 x 158 px, 44 px para fora da borda de baixo). */
export const RIBBON = { width: 0.42, length: (0.42 * 158) / 56, outside: 0.42 } as const;

/** A folha 0 fica colada no verso da capa, como na vitrine 2D: a capa abre mostrando a folha 1. */
export function sheetCount(pages: number) {
  return pages >= 2 ? Math.ceil((pages - 1) / 2) : 0;
}
export function spreadCount(pages: number) {
  return Math.max(1, Math.ceil(pages / 2));
}
/** Capa, folhas soltas e contracapa giram na mesma lombada. */
export function leafCount(pages: number) {
  return sheetCount(pages) + 2;
}

export type BookView = { cover: boolean; back: boolean; spread: number };

/** Quantas peças (capa incluída) estão viradas para a esquerda em cada estado do caderno. */
export function flippedFor(view: BookView, pages: number) {
  if (view.cover) return 0;
  if (view.back) return leafCount(pages);
  return 1 + Math.max(0, Math.min(spreadCount(pages) - 1, view.spread));
}

export function viewFor(flipped: number, pages: number): BookView {
  const leaves = leafCount(pages);
  if (flipped <= 0) return { cover: true, back: false, spread: 0 };
  if (flipped >= leaves) return { cover: false, back: true, spread: spreadCount(pages) - 1 };
  // Sem folha para mostrar daquele lado, o estado vira a última dupla.
  return { cover: false, back: false, spread: Math.min(spreadCount(pages) - 1, flipped - 1) };
}

/** Índices das duas folhas visíveis, ou null quando o lado está vazio ou fechado. */
export function visiblePages(flipped: number, pages: number): [number | null, number | null] {
  if (flipped < 1 || flipped > sheetCount(pages) + 1) return [null, null];
  const left = (flipped - 1) * 2;
  return [left < pages ? left : null, left + 1 < pages ? left + 1 : null];
}

/** Peça que leva a folha: a 0 vai no verso da capa; as outras ficam na frente ou no verso de uma folha solta. */
export function leafOfPage(index: number): { leaf: number; front: boolean } {
  if (index === 0) return { leaf: 0, front: false };
  return { leaf: 1 + Math.floor((index - 1) / 2), front: index % 2 === 1 };
}

export function thickness(leaf: number, leaves: number) {
  return leaf === 0 || leaf === leaves - 1 ? BOOK.boardThickness : BOOK.sheetThickness;
}

/** Altura do centro da peça parada: à direita ficam as de índice maior embaixo, à esquerda as de índice menor. */
export function restHeight(leaf: number, left: boolean, leaves: number) {
  let height = 0;
  for (let other = 0; other < leaves; other++)
    if (left ? other < leaf : other > leaf) height += thickness(other, leaves);
  return height + thickness(leaf, leaves) / 2;
}

export type BendPoint = [x: number, y: number, angle: number];

/**
 * Curva da folha: cada linha da malha dobra um pouco diferente, então o canto puxado vai na frente
 * e a dobra fica levemente diagonal. O ângulo nunca passa do plano da mesa.
 */
export function bendSheet(
  theta: number,
  curl: number,
  bias: number,
  hingeY: number,
  /** Linhas de uma chamada anterior: são reescritas no lugar, sem criar lixo a cada quadro. */
  rows: BendPoint[][] = [],
) {
  const step = BOOK.pageWidth / BOOK.segmentsX;
  for (let row = 0; row <= BOOK.segmentsZ; row++) {
    const weight = 1 + 0.55 * bias * ((row / BOOK.segmentsZ) * 2 - 1);
    let x = 0;
    let y = hingeY;
    const points = (rows[row] ??= []);
    const first = (points[0] ??= [0, 0, 0]);
    first[0] = x;
    first[1] = y;
    first[2] = theta;
    for (let index = 1; index <= BOOK.segmentsX; index++) {
      const fraction = index / BOOK.segmentsX;
      const angle = clamp(theta + curl * weight * fraction ** 1.25, -0.015, Math.PI + 0.015);
      x += Math.cos(angle) * step;
      y += Math.sin(angle) * step;
      const point = (points[index] ??= [0, 0, 0]);
      point[0] = x;
      point[1] = y;
      point[2] = angle;
    }
  }
  return rows;
}

export function pointAlong(row: BendPoint[], distance: number): BendPoint {
  const position = clamp(distance / BOOK.pageWidth, 0, 1) * BOOK.segmentsX;
  const index = Math.min(BOOK.segmentsX - 1, Math.floor(position));
  const t = position - index;
  const a = row[index]!;
  const b = row[index + 1]!;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export type LeafMotion = { theta: number; omega: number; curl: number; curlSpeed: number };

/**
 * Mola do papel: a folha segue o alvo, o ar segura a ponta enquanto ela gira e, ao parar, ela
 * assenta com um leve quique. Capas não curvam.
 */
export function stepLeaf(
  leaf: LeafMotion,
  goal: number,
  dt: number,
  options: { dragging: boolean; sheet: boolean; lead: number },
): LeafMotion {
  const stiffness = options.dragging ? 260 : 150;
  const damping = options.dragging ? 30 : 20;
  let omega = leaf.omega + (stiffness * (goal - leaf.theta) - damping * leaf.omega) * dt;
  let theta = leaf.theta + omega * dt;
  if (theta < 0) {
    theta = 0;
    omega *= -0.2;
  }
  if (theta > Math.PI) {
    theta = Math.PI;
    omega *= -0.2;
  }
  if (!options.sheet) return { theta, omega, curl: 0, curlSpeed: 0 };
  const lift = Math.sin(clamp(theta / Math.PI, 0, 1) * Math.PI);
  const wanted = clamp(-0.075 * omega, -0.85, 0.85) + options.lead * lift;
  const curlSpeed = leaf.curlSpeed + (120 * (wanted - leaf.curl) - 14 * leaf.curlSpeed) * dt;
  return { theta, omega, curl: leaf.curl + curlSpeed * dt, curlSpeed };
}

/** Curva suave de ida e volta, usada para o alvo das viradas automáticas. */
export function easeInOut(t: number) {
  const value = clamp(t, 0, 1);
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

/** Ponto da divisória ao longo da folha: mesma fórmula da vitrine 2D (22 px no topo, 66 px de folga). */
export function dividerCenterZ(position: number) {
  return -BOOK.pageHeight / 2 + 0.17 + position * (BOOK.pageHeight - 0.52) + DIVIDER.height / 2;
}

/** Distância do marcador até a lombada, a partir da posição de 0 a 1 sobre a folha. */
export function bookmarkDistance(position: number, front: boolean) {
  const fromOuterOrSpine = (0.14 + 0.72 * position) * BOOK.pageWidth;
  return front ? fromOuterOrSpine : BOOK.pageWidth - fromOuterOrSpine;
}

export type PlacementResult =
  | { ok: true; page: number; position: number }
  | { ok: false; reason: "divider-edge" | "bookmark-sheet" | "missing-page" };

/**
 * Onde a marcação cai, com as regras da vitrine 2D: divisória só na borda direita, presa na folha
 * da direita; marcador sobre qualquer folha visível, preso à folha tocada.
 */
export function placeTab(
  kind: "divider" | "bookmark",
  point: { x: number; z: number },
  visible: [number | null, number | null],
): PlacementResult {
  const { pageWidth: width, pageHeight: height } = BOOK;
  const inside =
    point.x > -width - 0.7 &&
    point.x < width + 0.9 &&
    point.z > -height / 2 - 0.6 &&
    point.z < height / 2 + 0.7;
  if (!inside || (visible[0] === null && visible[1] === null))
    return { ok: false, reason: kind === "divider" ? "divider-edge" : "bookmark-sheet" };
  if (kind === "divider") {
    if (point.x < -width + 0.65 * 2 * width) return { ok: false, reason: "divider-edge" };
    const page = visible[1] ?? visible[0];
    if (page === null) return { ok: false, reason: "missing-page" };
    const position = clamp(
      (point.z + height / 2 - 0.17 - DIVIDER.height / 2) / (height - 0.52),
      0,
      1,
    );
    return { ok: true, page, position };
  }
  const side = point.x < 0 ? 0 : 1;
  const page = visible[side];
  if (page === null) return { ok: false, reason: "missing-page" };
  const across = side ? point.x / width : (point.x + width) / width;
  return { ok: true, page, position: clamp((across - 0.14) / 0.72, 0, 1) };
}

/** Folhas que levantam em leque quando o ponteiro passa na borda da pilha. */
export function peekFan(stackSize: number, pointerZ: number) {
  if (stackSize < 2) return null;
  const depth = clamp(
    Math.floor(((pointerZ + BOOK.pageHeight / 2) / BOOK.pageHeight) * stackSize),
    0,
    stackSize - 1,
  );
  const angles = Array.from({ length: depth }, (_, index) => 0.34 + 0.05 * (depth - index));
  return { depth, angles };
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
