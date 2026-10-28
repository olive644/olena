// Desenhos 2D que viram textura no caderno 3D. Seguem o papel recortado do design system:
// roxos do caderno, creme, amarelo e cantoneiras com dobra.
import { uiText } from "../../i18n/runtime";
import { DIVIDER } from "./notebook-3d-model";

export const PAGE_UNITS = { width: 1200, height: 1600 } as const;
type Ctx = CanvasRenderingContext2D;
const FONT = '"Manrope", "Segoe UI", system-ui, sans-serif';
const HAND = '"Nunito", "Segoe UI", system-ui, sans-serif';

function seeded(seed: number) {
  let value = seed;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

export function paperStar(
  x: Ctx,
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

function corners(x: Ctx, width: number, height: number, onLeft: boolean) {
  for (const bottom of [false, true]) {
    x.save();
    if (onLeft) {
      x.translate(width, 0);
      x.scale(-1, 1);
    }
    if (bottom) {
      x.translate(0, height);
      x.scale(1, -1);
    }
    x.fillStyle = "#51259b";
    x.beginPath();
    x.moveTo(width - 250, 0);
    x.lineTo(width, 0);
    x.lineTo(width, 250);
    x.closePath();
    x.fill();
    x.strokeStyle = "#a779ef";
    x.lineWidth = 7;
    x.beginPath();
    x.moveTo(width - 238, 7);
    x.lineTo(width - 7, 238);
    x.stroke();
    x.restore();
  }
}

function fitText(x: Ctx, text: string, maxWidth: number) {
  let value = text;
  while (x.measureText(value).width > maxWidth && value.length > 3)
    value = `${value.slice(0, -2)}…`;
  return value;
}

/** Capa: arte fixa da Olena no arco, cantoneiras, vinco da lombada e a etiqueta com o nome do caderno. */
export function drawCover(
  x: Ctx,
  width: number,
  height: number,
  art: CanvasImageSource | null,
  title: string,
) {
  x.fillStyle = "#4f22a6";
  x.fillRect(0, 0, width, height);
  if (art) x.drawImage(art, 0, 0, width, height);
  const groove = x.createLinearGradient(0, 0, 90, 0);
  groove.addColorStop(0, "rgba(12,4,30,0.55)");
  groove.addColorStop(1, "rgba(12,4,30,0)");
  x.fillStyle = groove;
  x.fillRect(0, 0, 90, height);
  x.fillStyle = "rgba(255,255,255,0.08)";
  x.fillRect(70, 0, 3, height);
  corners(x, width, height, false);
  const k = width / 1240;
  x.save();
  x.translate(560 * k, height - 270 * k);
  x.scale(k, k);
  x.rotate(-0.018);
  x.fillStyle = "#51259b";
  x.fillRect(-402, -86, 820, 192);
  x.fillStyle = "#fffdf7";
  x.fillRect(-410, -96, 820, 192);
  x.strokeStyle = "#d5ccba";
  x.lineWidth = 3;
  x.strokeRect(-404, -90, 808, 180);
  x.fillStyle = "#ffe88d";
  x.fillRect(-120, -112, 240, 34);
  x.fillStyle = "#292432";
  x.textAlign = "left";
  x.font = `800 70px ${FONT}`;
  x.fillText(fitText(x, title || uiText(3177), 740), -370, 18);
  x.fillStyle = "#7b6f8c";
  x.font = `800 24px ${FONT}`;
  x.letterSpacing = "4px";
  x.fillText(fitText(x, uiText(3165), 740), -370, 66);
  x.letterSpacing = "0px";
  x.restore();
}

function leather(x: Ctx, width: number, height: number, seed: number) {
  const random = seeded(seed);
  const gradient = x.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#6c37cf");
  gradient.addColorStop(0.45, "#4f22a6");
  gradient.addColorStop(1, "#2c1566");
  x.fillStyle = gradient;
  x.fillRect(0, 0, width, height);
  for (let index = 0; index < 12000; index++) {
    x.fillStyle = random() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(10,0,30,0.05)";
    x.fillRect(random() * width, random() * height, 2, 2);
  }
  return random;
}

/** Contracapa: a lombada fica à direita quando ela está virada para cima. */
export function drawBackCover(
  x: Ctx,
  width: number,
  height: number,
  olena: CanvasImageSource | null,
) {
  const random = leather(x, width, height, 21);
  x.save();
  x.strokeStyle = "rgba(196,166,255,0.85)";
  x.lineWidth = 4;
  x.setLineDash([16, 11]);
  x.beginPath();
  x.roundRect(36, 36, width - 128, height - 72, 28);
  x.stroke();
  x.restore();
  const groove = x.createLinearGradient(width, 0, width - 90, 0);
  groove.addColorStop(0, "rgba(12,4,30,0.55)");
  groove.addColorStop(1, "rgba(12,4,30,0)");
  x.fillStyle = groove;
  x.fillRect(width - 90, 0, 90, height);
  corners(x, width, height, true);
  const cx = width * 0.47;
  const cy = height * 0.36;
  const radius = width * 0.24;
  x.fillStyle = "#1a0d3d";
  x.beginPath();
  x.arc(cx + 10, cy + 14, radius, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#FFF9EF";
  x.beginPath();
  x.arc(cx, cy, radius, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#FACC15";
  x.beginPath();
  x.arc(cx, cy, radius * 0.94, 0, Math.PI * 2);
  x.fill();
  const sky = x.createRadialGradient(cx, cy - radius * 0.2, 20, cx, cy, radius * 0.92);
  sky.addColorStop(0, "#4b2f8a");
  sky.addColorStop(1, "#241650");
  x.fillStyle = sky;
  x.beginPath();
  x.arc(cx, cy, radius * 0.92, 0, Math.PI * 2);
  x.fill();
  x.save();
  x.beginPath();
  x.arc(cx, cy, radius * 0.92, 0, Math.PI * 2);
  x.clip();
  for (let index = 0; index < 40; index++) {
    x.fillStyle = `rgba(255,246,214,${0.3 + random() * 0.6})`;
    x.beginPath();
    x.arc(
      cx - radius + random() * radius * 2,
      cy - radius + random() * radius * 1.2,
      1.5 + random() * 2.4,
      0,
      Math.PI * 2,
    );
    x.fill();
  }
  if (olena)
    x.drawImage(olena, cx - radius * 0.78, cy - radius * 0.72, radius * 1.56, radius * 1.96);
  x.restore();
  paperStar(x, cx - radius * 0.9, cy - radius * 0.8, 40, 0.3);
  paperStar(x, cx + radius * 0.86, cy + radius * 0.7, 30, -0.2);
  x.save();
  x.translate(cx, height * 0.7);
  x.rotate(0.015);
  const labelWidth = width * 0.63;
  x.fillStyle = "#51259b";
  x.fillRect(-labelWidth / 2 + 8, -86, labelWidth, 220);
  x.fillStyle = "#fffdf7";
  x.fillRect(-labelWidth / 2, -96, labelWidth, 220);
  x.strokeStyle = "#d5ccba";
  x.lineWidth = 3;
  x.strokeRect(-labelWidth / 2 + 6, -90, labelWidth - 12, 208);
  x.fillStyle = "#a779ef";
  x.fillRect(-110, -112, 220, 34);
  x.fillStyle = "#7b6f8c";
  x.font = `800 26px ${FONT}`;
  x.letterSpacing = "4px";
  x.textAlign = "left";
  x.fillText(fitText(x, uiText(3166), labelWidth - 80), -labelWidth / 2 + 40, -30);
  x.letterSpacing = "0px";
  x.strokeStyle = "#cfc6dc";
  for (const y of [40, 100]) {
    x.beginPath();
    x.moveTo(-labelWidth / 2 + 40, y);
    x.lineTo(labelWidth / 2 - 40, y);
    x.stroke();
  }
  x.restore();
  for (const [sx, sy, r] of [
    [width * 0.2, height * 0.88, 24],
    [width * 0.74, height * 0.9, 18],
    [width * 0.84, height * 0.12, 22],
  ] as const)
    paperStar(x, sx, sy, r, random() * 2);
}

export function drawEndpaper(x: Ctx, width: number, height: number) {
  x.fillStyle = "#ece2ff";
  x.fillRect(0, 0, width, height);
  const random = seeded(3);
  for (let y = 0; y < height; y += 120)
    for (let column = (y / 120) % 2 ? 60 : 0; column < width; column += 120) {
      if (random() < 0.5) paperStar(x, column + 30, y + 30, 16, random(), "#d6c3ff", "#b99cf2");
      else {
        x.fillStyle = "#d6c3ff";
        x.beginPath();
        x.arc(column + 30, y + 30, 14, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "#ece2ff";
        x.beginPath();
        x.arc(column + 24, y + 25, 12, 0, Math.PI * 2);
        x.fill();
      }
    }
}

/** Lombada escura com costura tracejada e as três alças inclinadas da vitrine 2D. */
export function drawSpine(x: Ctx, width: number, height: number) {
  x.fillStyle = "#292432";
  x.fillRect(0, 0, width, height);
  x.strokeStyle = "#a779ef";
  x.globalAlpha = 0.7;
  x.lineWidth = 3;
  x.setLineDash([14, 10]);
  for (const column of [width * 0.3, width * 0.7]) {
    x.beginPath();
    x.moveTo(column, 20);
    x.lineTo(column, height - 20);
    x.stroke();
  }
  x.setLineDash([]);
  x.globalAlpha = 1;
  for (const fraction of [0.155, 0.465, 0.775]) {
    const y = fraction * height;
    const band = 0.059 * height;
    x.fillStyle = "#51465d";
    x.fillRect(0, y, width, band);
    x.fillStyle = "#a779ef";
    x.fillRect(0, y, width, 4);
    x.fillRect(0, y + band - 4, width, 4);
  }
}

export function drawPageEdges(x: Ctx, width: number, height: number) {
  x.fillStyle = "#fffdf7";
  x.fillRect(0, 0, width, height);
  x.fillStyle = "#e3d8c4";
  x.fillRect(0, height - 8, width, 8);
  x.fillStyle = "#f3ecdf";
  x.fillRect(0, height / 2 - 3, width, 3);
}

export function drawClaspStrap(x: Ctx, width: number, height: number) {
  x.fillStyle = "#51259b";
  x.fillRect(0, 0, width, height);
  x.fillStyle = "#a779ef";
  x.fillRect(0, 0, 5, height);
  x.fillRect(width - 5, 0, 5, height);
  x.fillStyle = "#7c3aed";
  x.fillRect(5, 0, 12, height);
  x.fillStyle = "#292432";
  x.fillRect(width - 19, 0, 14, height);
  x.strokeStyle = "#a779ef";
  x.lineWidth = 3;
  x.setLineDash([10, 8]);
  for (const column of [24, width - 26]) {
    x.beginPath();
    x.moveTo(column, 10);
    x.lineTo(column, height - 10);
    x.stroke();
  }
}

export type PageArt = {
  title: string;
  index: number;
  content: string;
  preview: CanvasImageSource | null;
};

function wrap(x: Ctx, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (x.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Folha do caderno: o mesmo desenho que o editor gera (a miniatura salva da página) dentro do papel,
 * com título em cima e número embaixo, como na vitrine 2D. A sombra da dobra fica do lado da lombada.
 */
export function drawPage(x: Ctx, page: PageArt | null) {
  const { width, height } = PAGE_UNITS;
  const side = page ? page.index % 2 : 1;
  x.fillStyle = "#fffdf7";
  x.fillRect(0, 0, width, height);
  if (page) {
    const top = 150;
    const box = { x: 40, y: top, w: width - 80, h: height - top - 110 };
    if (page.preview) {
      const source = page.preview as HTMLImageElement;
      const sw = source.naturalWidth || source.width || 1;
      const sh = source.naturalHeight || source.height || 1;
      const scale = Math.min(box.w / sw, box.h / sh);
      x.drawImage(
        page.preview,
        box.x + (box.w - sw * scale) / 2,
        box.y + (box.h - sh * scale) / 2,
        sw * scale,
        sh * scale,
      );
    } else if (page.content) {
      x.fillStyle = "#3a3346";
      x.font = `700 40px ${HAND}`;
      let y = top + 70;
      for (const line of wrap(x, page.content, box.w - 60)) {
        if (y > box.y + box.h - 20) break;
        x.fillText(line, box.x + 30, y);
        y += 60;
      }
    }
    x.fillStyle = "#292432";
    x.font = `800 54px ${FONT}`;
    x.textAlign = "left";
    const title = fitText(x, page.title || uiText(3177), width - 320);
    x.fillText(title, side ? 70 : 90, 96);
    x.fillStyle = "#FACC15";
    x.fillRect(side ? 70 : 90, 112, Math.min(width - 320, x.measureText(title).width) * 0.6, 10);
    x.fillStyle = "#7b6f8c";
    x.font = `800 24px ${FONT}`;
    x.letterSpacing = "5px";
    // O rótulo fica sempre no canto de fora, longe do título.
    x.textAlign = "right";
    x.fillText(uiText(3167, [String(page.index + 1).padStart(2, "0")]), width - 70, 60);
    x.letterSpacing = "0px";
    x.textAlign = side ? "right" : "left";
    x.font = `800 28px ${FONT}`;
    x.fillText(String(page.index + 1), side ? width - 80 : 80, height - 50);
    x.textAlign = "left";
  }
  const edge = side ? 0 : width;
  const fold = x.createLinearGradient(edge, 0, side ? 120 : width - 120, 0);
  fold.addColorStop(0, "rgba(60,40,90,0.22)");
  fold.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = fold;
  x.fillRect(side ? 0 : width - 120, 0, 120, height);
}

/** Cartão "Nova folha" sobre a guarda quando o lado direito está vazio. */
export function drawCreateCard(
  x: Ctx,
  width: number,
  height: number,
  first: boolean,
  pencil: CanvasImageSource | null,
) {
  x.clearRect(0, 0, width, height);
  x.fillStyle = "rgba(255,253,247,0.78)";
  x.beginPath();
  x.roundRect(30, 30, width - 60, height - 60, 30);
  x.fill();
  x.strokeStyle = "#7433E0";
  x.lineWidth = 6;
  x.setLineDash([22, 16]);
  x.stroke();
  x.setLineDash([]);
  if (pencil) x.drawImage(pencil, width / 2 - 190, height / 2 - 430, 380, 380);
  x.fillStyle = "#7433E0";
  x.beginPath();
  x.roundRect(width / 2 - 250, height / 2 + 10, 500, 110, 26);
  x.fill();
  x.fillStyle = "#fff9ef";
  x.font = `800 44px ${FONT}`;
  x.textAlign = "center";
  x.fillText(first ? uiText(1391) : `+ ${uiText(746)}`, width / 2, height / 2 + 82);
  x.textAlign = "left";
}

const tabText = (color: string) =>
  ["#FACC15", "#5887C9"].includes(color.toUpperCase()) ? "#17151C" : "#FFF9EF";

/** Divisória no recorte da vitrine 2D, com o nome na horizontal na parte que sai da folha. */
export function drawDivider(
  x: Ctx,
  width: number,
  height: number,
  label: string,
  color: string,
  buried: boolean,
  mirror: boolean,
) {
  x.clearRect(0, 0, width, height);
  x.save();
  if (mirror) {
    x.translate(width, 0);
    x.scale(-1, 1);
  }
  const shape: [number, number][] = [
    [0, 0.07],
    [0.9, 0],
    [1, 0.12],
    [1, 0.9],
    [0, 1],
  ];
  const path = (dx: number, dy: number) => {
    x.beginPath();
    shape.forEach(([a, b], index) =>
      index ? x.lineTo(a * width + dx, b * height + dy) : x.moveTo(a * width + dx, b * height + dy),
    );
    x.closePath();
  };
  path(4, 8);
  x.fillStyle = "rgba(41,36,50,0.28)";
  x.fill();
  path(0, 0);
  x.fillStyle = color;
  x.fill();
  x.save();
  x.clip();
  x.fillStyle = "rgba(255,255,255,0.4)";
  x.fillRect(0, 0, width * 0.12, height);
  x.fillStyle = "rgba(41,36,50,0.16)";
  x.fillRect(width - 18, 0, 18, height);
  x.fillRect(0, height - 16, width, 16);
  x.restore();
  const start = (DIVIDER.inside / (DIVIDER.inside + DIVIDER.outside)) * width;
  const maxWidth = width - start - 26;
  x.fillStyle = tabText(color);
  x.textAlign = "center";
  x.textBaseline = "middle";
  let size = 44;
  x.font = `800 ${size}px ${FONT}`;
  const words = label.split(" ");
  let lines = [label];
  if (x.measureText(label).width > maxWidth && words.length > 1) {
    const half = Math.ceil(words.length / 2);
    lines = [words.slice(0, half).join(" "), words.slice(half).join(" ")];
  }
  while (lines.some((line) => x.measureText(line).width > maxWidth) && size > 24) {
    size -= 2;
    x.font = `800 ${size}px ${FONT}`;
  }
  lines.forEach((line, index) =>
    x.fillText(
      fitText(x, line, maxWidth),
      start + maxWidth / 2 + 6,
      height / 2 + (index - (lines.length - 1) / 2) * size * 1.05 - 2,
    ),
  );
  if (buried) {
    x.globalCompositeOperation = "source-atop";
    x.fillStyle = "rgba(41,36,50,0.18)";
    x.fillRect(0, 0, width, height);
  }
  x.restore();
}
