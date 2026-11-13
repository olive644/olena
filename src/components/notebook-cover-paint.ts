// Arte da capa e da contracapa do caderno em papel recortado, sem personagens.
// Fonte editável da capa original e das contracapas. O script gera as texturas da vitrine 2D.

/** Medidas de referência do desenho; quem chama escala para o tamanho do canvas. */
export const COVER_UNITS = { width: 1200, height: 1624 } as const;
/** Raio dos cantos de fora da capa, em unidades do desenho. */
export const COVER_CORNER = 46;

export type CoverTheme = "stars" | "mathematics" | "english";
const palette = (theme: CoverTheme) =>
  theme === "mathematics"
    ? ["#2457b3", "#163d85", "#102859"]
    : theme === "english"
      ? ["#317f88", "#225c6d", "#193747"]
      : ["#6a35cc", "#5126ad", "#33186f"];

type Paint = CanvasRenderingContext2D;

export function seeded(seed: number) {
  let value = seed;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

export function paperStar(
  x: Paint,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
  fill = "#FACC15",
  fold = "#B88C13",
) {
  x.beginPath();
  for (let index = 0; index < 10; index++) {
    const angle = rotation - Math.PI / 2 + (index * Math.PI) / 5;
    const length = index % 2 ? radius * 0.46 : radius;
    x.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
  }
  x.closePath();
  x.fillStyle = fill;
  x.fill();
  x.save();
  x.clip();
  x.globalAlpha = 0.35;
  x.fillStyle = fold;
  x.beginPath();
  x.moveTo(cx, cy);
  x.lineTo(cx + radius * 2, cy - radius * 0.2);
  x.lineTo(cx + radius * 2, cy + radius * 2);
  x.lineTo(cx - radius * 0.3, cy + radius * 2);
  x.closePath();
  x.fill();
  x.restore();
}

/** Contorno da capa: cantos arredondados só do lado de fora; a lombada fica reta. */
function boardPath(x: Paint, spineOnLeft: boolean) {
  const { width, height } = COVER_UNITS;
  const r = COVER_CORNER;
  x.beginPath();
  if (spineOnLeft) {
    x.moveTo(0, 0);
    x.lineTo(width - r, 0);
    x.quadraticCurveTo(width, 0, width, r);
    x.lineTo(width, height - r);
    x.quadraticCurveTo(width, height, width - r, height);
    x.lineTo(0, height);
  } else {
    x.moveTo(width, 0);
    x.lineTo(r, 0);
    x.quadraticCurveTo(0, 0, 0, r);
    x.lineTo(0, height - r);
    x.quadraticCurveTo(0, height, r, height);
    x.lineTo(width, height);
  }
  x.closePath();
}

/** Couro roxo com grão fino, a mesma base da vitrine 2D. */
function leather(x: Paint, seed: number, theme: CoverTheme = "stars") {
  const { width, height } = COVER_UNITS;
  const random = seeded(seed);
  const gradient = x.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette(theme)[0]!);
  gradient.addColorStop(0.5, palette(theme)[1]!);
  gradient.addColorStop(1, palette(theme)[2]!);
  x.fillStyle = gradient;
  x.fillRect(0, 0, width, height);
  for (let index = 0; index < 16000; index++) {
    x.fillStyle = random() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(10,0,30,0.06)";
    x.fillRect(random() * width, random() * height, 2, 2);
  }
  return random;
}

/** Painel de papel colado com a costura tracejada em volta. */
function panel(x: Paint, left: number, top: number, right: number, bottom: number) {
  const width = right - left;
  const height = bottom - top;
  x.fillStyle = "rgba(20,6,50,0.45)";
  x.beginPath();
  x.roundRect(left + 8, top + 12, width, height, 30);
  x.fill();
  const fill = x.createLinearGradient(left, top, right, bottom);
  fill.addColorStop(0, "#6f3ad6");
  fill.addColorStop(1, "#4a209f");
  x.fillStyle = fill;
  x.beginPath();
  x.roundRect(left, top, width, height, 30);
  x.fill();
  x.strokeStyle = "rgba(255,240,214,0.78)";
  x.lineWidth = 6;
  x.setLineDash([24, 16]);
  x.beginPath();
  x.roundRect(left + 24, top + 24, width - 48, height - 48, 18);
  x.stroke();
  x.setLineDash([]);
}

/** Cantoneira de papel amarelo com dobra, como as etiquetas do app. */
function cornerGuard(x: Paint, cx: number, cy: number, flipX: boolean, flipY: boolean) {
  x.save();
  x.translate(cx, cy);
  x.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  x.fillStyle = "rgba(20,6,50,0.4)";
  x.beginPath();
  x.moveTo(-200, 8);
  x.lineTo(8, 8);
  x.lineTo(8, 208);
  x.closePath();
  x.fill();
  x.fillStyle = "#FACC15";
  x.beginPath();
  x.moveTo(-210, 0);
  x.lineTo(0, 0);
  x.lineTo(0, 210);
  x.closePath();
  x.fill();
  x.fillStyle = "#d9a90c";
  x.beginPath();
  x.moveTo(-210, 0);
  x.lineTo(-150, 0);
  x.lineTo(0, 150);
  x.lineTo(0, 210);
  x.closePath();
  x.fill();
  x.strokeStyle = "#fff1a8";
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(-188, 10);
  x.lineTo(-10, 188);
  x.stroke();
  x.restore();
}

/** Lua crescente de papel com a dobra sombreada. */
function paperMoon(x: Paint, cx: number, cy: number, radius: number) {
  // Crescente = disco menos um disco deslocado, recortado dentro do primeiro.
  const crescent = (ox: number, oy: number) => {
    x.beginPath();
    x.arc(cx + ox, cy + oy, radius, 0, Math.PI * 2);
    x.clip();
    x.beginPath();
    x.rect(cx + ox - radius, cy + oy - radius, radius * 2, radius * 2);
    x.arc(cx + ox + radius * 0.5, cy + oy - radius * 0.24, radius * 0.84, 0, Math.PI * 2, true);
  };
  x.save();
  crescent(10, 14);
  x.fillStyle = "rgba(20,6,50,0.35)";
  x.fill("evenodd");
  x.restore();
  x.save();
  crescent(0, 0);
  x.fillStyle = "#fff1c1";
  x.fill("evenodd");
  x.clip("evenodd");
  x.fillStyle = "#ecc25a";
  x.beginPath();
  x.moveTo(cx - radius, cy + radius * 0.05);
  x.lineTo(cx + radius, cy + radius * 0.9);
  x.lineTo(cx - radius, cy + radius);
  x.closePath();
  x.fill();
  x.restore();
}

/** Faixas onduladas de papel sobrepostas, dando profundidade ao céu da capa. */
function paperHills(x: Paint, left: number, right: number, base: number, random: () => number) {
  const layers = [
    { color: "#8a5cf0", lift: 120, wave: 46 },
    { color: "#7646e2", lift: 72, wave: 38 },
    { color: "#6231cc", lift: 26, wave: 30 },
  ];
  for (const layer of layers) {
    const phase = random() * Math.PI * 2;
    const top = base - layer.lift;
    x.fillStyle = "rgba(20,6,50,0.3)";
    x.beginPath();
    x.moveTo(left, base + 40);
    for (let px = left; px <= right; px += 20)
      x.lineTo(px, top + 12 + Math.sin(px / 140 + phase) * layer.wave);
    x.lineTo(right, base + 40);
    x.closePath();
    x.fill();
    x.fillStyle = layer.color;
    x.beginPath();
    x.moveTo(left, base + 40);
    for (let px = left; px <= right; px += 20)
      x.lineTo(px, top + Math.sin(px / 140 + phase) * layer.wave);
    x.lineTo(right, base + 40);
    x.closePath();
    x.fill();
  }
}

function constellation(x: Paint, points: [number, number, number][]) {
  x.save();
  x.strokeStyle = "rgba(255,240,214,0.6)";
  x.lineWidth = 4;
  x.setLineDash([3, 12]);
  x.lineCap = "round";
  x.beginPath();
  points.forEach(([px, py], index) => (index ? x.lineTo(px, py) : x.moveTo(px, py)));
  x.stroke();
  x.restore();
  points.forEach(([px, py, radius], index) =>
    paperStar(x, px, py, radius, index * 0.7, index % 2 ? "#ffe88d" : "#FACC15"),
  );
}

/**
 * Capa: céu noturno de papel com lua, constelação e colinas. A faixa de baixo fica livre para a
 * etiqueta do título (texto vivo na vitrine 2D).
 */
export function paintCoverArt(x: Paint, transparentCorners = true, theme: CoverTheme = "stars") {
  const { width, height } = COVER_UNITS;
  x.save();
  if (transparentCorners) {
    x.clearRect(0, 0, width, height);
    boardPath(x, true);
    x.clip();
  }
  const random = leather(x, 11, theme);
  const spine = x.createLinearGradient(0, 0, 110, 0);
  spine.addColorStop(0, "rgba(12,4,30,0.6)");
  spine.addColorStop(1, "rgba(12,4,30,0)");
  x.fillStyle = spine;
  x.fillRect(0, 0, 110, height);
  x.fillStyle = "rgba(255,255,255,0.09)";
  x.fillRect(84, 0, 4, height);
  panel(x, 140, 86, width - 86, height - 86);
  // céu: recorte do painel em cima, onde fica a ilustração
  x.save();
  x.beginPath();
  x.roundRect(176, 122, width - 298, height * 0.6, 22);
  x.clip();
  const sky = x.createLinearGradient(0, 122, 0, 122 + height * 0.6);
  sky.addColorStop(0, "#2c1766");
  sky.addColorStop(1, "#4b25a3");
  x.fillStyle = sky;
  x.fillRect(176, 122, width - 298, height * 0.6);
  for (let index = 0; index < 70; index++) {
    x.fillStyle = `rgba(255,246,214,${0.25 + random() * 0.55})`;
    x.beginPath();
    x.arc(
      200 + random() * (width - 340),
      140 + random() * height * 0.42,
      1.6 + random() * 2.6,
      0,
      Math.PI * 2,
    );
    x.fill();
  }
  paperMoon(x, width * 0.66, height * 0.25, 150);
  constellation(x, [
    [300, 300, 26],
    [410, 236, 18],
    [520, 300, 22],
    [470, 420, 16],
    [610, 470, 20],
  ]);
  paperHills(x, 176, width - 122, 122 + height * 0.6, random);
  x.restore();
  // moldura recortada do céu
  x.strokeStyle = "#fff1c1";
  x.lineWidth = 10;
  x.beginPath();
  x.roundRect(176, 122, width - 298, height * 0.6, 22);
  x.stroke();
  paperStar(x, 230, 170, 44, 0.3);
  paperStar(x, width - 190, height * 0.58, 34, -0.4);
  cornerGuard(x, width, 0, false, false);
  cornerGuard(x, width, height, false, true);
  x.fillStyle = "rgba(255,240,214,0.55)";
  x.font = '800 30px "Manrope", "Segoe UI", sans-serif';
  x.letterSpacing = "10px";
  x.textAlign = "center";
  x.fillText("OLENA STUDY", (176 + width - 122) / 2, height * 0.6 + 196);
  x.letterSpacing = "0px";
  x.textAlign = "left";
  x.restore();
}

/** Contracapa: medalhão com a lua e espaço para o nome de quem é dono do caderno. */
export function paintBackArt(x: Paint, theme: CoverTheme = "stars") {
  const { width, height } = COVER_UNITS;
  x.save();
  x.clearRect(0, 0, width, height);
  boardPath(x, false);
  x.clip();
  const random = leather(x, 21, theme);
  const spine = x.createLinearGradient(width, 0, width - 110, 0);
  spine.addColorStop(0, "rgba(12,4,30,0.6)");
  spine.addColorStop(1, "rgba(12,4,30,0)");
  x.fillStyle = spine;
  x.fillRect(width - 110, 0, 110, height);
  panel(x, 86, 86, width - 140, height - 86);
  const cx = (86 + width - 140) / 2;
  const cy = height * 0.34;
  const radius = 250;
  x.fillStyle = "rgba(20,6,50,0.45)";
  x.beginPath();
  x.arc(cx + 10, cy + 14, radius, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#fff1c1";
  x.beginPath();
  x.arc(cx, cy, radius, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#FACC15";
  x.beginPath();
  x.arc(cx, cy, radius * 0.93, 0, Math.PI * 2);
  x.fill();
  const sky = x.createRadialGradient(cx, cy - 60, 20, cx, cy, radius * 0.88);
  sky.addColorStop(0, "#4b2f8a");
  sky.addColorStop(1, "#241650");
  x.fillStyle = sky;
  x.beginPath();
  x.arc(cx, cy, radius * 0.88, 0, Math.PI * 2);
  x.fill();
  x.save();
  x.beginPath();
  x.arc(cx, cy, radius * 0.88, 0, Math.PI * 2);
  x.clip();
  for (let index = 0; index < 46; index++) {
    x.fillStyle = `rgba(255,246,214,${0.3 + random() * 0.6})`;
    x.beginPath();
    x.arc(
      cx - radius + random() * radius * 2,
      cy - radius + random() * radius * 2,
      1.5 + random() * 2.4,
      0,
      Math.PI * 2,
    );
    x.fill();
  }
  if (theme === "stars") paperMoon(x, cx - 20, cy - 10, 120);
  else {
    x.fillStyle = "#ffcf16";
    x.font = '800 180px "Manrope", sans-serif';
    x.textAlign = "center";
    x.fillText(theme === "english" ? "HI!" : "+", cx, cy + 55);
  }
  paperHills(x, cx - radius, cx + radius, cy + radius * 0.95, random);
  x.restore();
  paperStar(x, cx - radius * 0.92, cy - radius * 0.78, 42, 0.3);
  paperStar(x, cx + radius * 0.9, cy + radius * 0.66, 32, -0.2);
  cornerGuard(x, 0, 0, true, false);
  cornerGuard(x, 0, height, true, true);
  x.restore();
}

/** Bandeira LGBT em seis faixas de papel, com a mesma encadernação original. */
export function paintPrideArt(x: Paint, back = false) {
  if (back) paintBackArt(x);
  else paintCoverArt(x, false);
  const colors = ["#e44958", "#ed9144", "#ffcf16", "#43996a", "#397fc2", "#8053b8"];
  const left = back ? 122 : 176;
  const top = 122;
  const width = 902;
  const height = COVER_UNITS.height * 0.6;
  x.save();
  x.beginPath();
  x.roundRect(left, top, width, height, 22);
  x.clip();
  colors.forEach((color, index) => {
    const y = top + (index * height) / 6;
    const h = height / 6;
    x.fillStyle = color;
    x.fillRect(left, y, width, h + 1);
    x.fillStyle = "rgba(255,255,255,0.18)";
    x.beginPath();
    x.moveTo(left, y);
    x.lineTo(left + width * 0.72, y);
    x.lineTo(left + width * 0.3, y + h * 0.66);
    x.closePath();
    x.fill();
    x.fillStyle = "rgba(30,14,48,0.16)";
    x.beginPath();
    x.moveTo(left + width, y);
    x.lineTo(left + width, y + h);
    x.lineTo(left + width * 0.48, y + h);
    x.closePath();
    x.fill();
    x.fillStyle = "rgba(25,15,40,0.14)";
    x.fillRect(left, y + h - 6, width, 6);
  });
  x.restore();
  x.strokeStyle = "#fff1c1";
  x.lineWidth = 10;
  x.beginPath();
  x.roundRect(left, top, width, height, 22);
  x.stroke();
  paperStar(x, left + 58, top + 56, 40, 0.3);
  paperStar(x, left + width - 62, top + height - 60, 30, -0.2);
  // As faixas continuam na lombada, alinhadas com a capa, sem outra arte desconectada.
  colors.forEach((color, index) => {
    const y = (index * COVER_UNITS.height) / 6;
    x.fillStyle = color;
    x.fillRect(0, y, 80, COVER_UNITS.height / 6 + 1);
    x.fillStyle = "rgba(25,15,40,0.25)";
    x.fillRect(0, y, 18, COVER_UNITS.height / 6 + 1);
    x.fillStyle = "rgba(255,255,255,0.22)";
    x.fillRect(68, y, 8, COVER_UNITS.height / 6 + 1);
  });
}
