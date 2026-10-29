// Desenhos 2D que viram textura no caderno 3D. Seguem o papel recortado do design system:
// roxos do caderno, creme, amarelo e cantoneiras com dobra.
import { uiText } from "../../i18n/runtime";
import { DIVIDER } from "./notebook-3d-model";
import {
  COVER_CORNER,
  COVER_UNITS,
  paintBackArt,
  paintCoverArt,
  paperStar,
  seeded,
} from "./notebook-cover-paint";

export { paperStar } from "./notebook-cover-paint";

export const PAGE_UNITS = { width: 1200, height: 1600 } as const;
type Ctx = CanvasRenderingContext2D;
const FONT = '"Manrope", "Segoe UI", system-ui, sans-serif';
const HAND = '"Nunito", "Segoe UI", system-ui, sans-serif';

function fitText(x: Ctx, text: string, maxWidth: number) {
  let value = text;
  while (x.measureText(value).width > maxWidth && value.length > 3)
    value = `${value.slice(0, -2)}…`;
  return value;
}

/** Capa: arte fixa da Olena no arco, cantoneiras, vinco da lombada e a etiqueta com o nome do caderno. */
/** Etiqueta de papel com fita amarela, a mesma da vitrine 2D (.book-cover__label). */
function label(x: Ctx, title: string, caption: string) {
  x.save();
  x.rotate(-0.026);
  x.fillStyle = "#51259b";
  x.fillRect(-392, -84, 820, 196);
  x.fillStyle = "#fff9ef";
  x.fillRect(-410, -100, 820, 196);
  x.strokeStyle = "#d5ccba";
  x.lineWidth = 3;
  x.strokeRect(-404, -94, 808, 184);
  x.fillStyle = "#ffe88d";
  x.beginPath();
  x.moveTo(-130, -118);
  x.lineTo(140, -114);
  x.lineTo(134, -82);
  x.lineTo(-136, -86);
  x.closePath();
  x.fill();
  x.fillStyle = "#292432";
  x.textAlign = "left";
  // Título longo: diminui um pouco e, se ainda não couber, quebra em duas linhas.
  let size = 72;
  x.font = `800 ${size}px ${FONT}`;
  while (x.measureText(title).width > 740 && size > 58) {
    size -= 2;
    x.font = `800 ${size}px ${FONT}`;
  }
  if (x.measureText(title).width <= 740) x.fillText(title, -370, 14);
  else {
    size = 50;
    x.font = `800 ${size}px ${FONT}`;
    const lines = wrap(x, title, 740);
    x.fillText(fitText(x, lines[0] ?? "", 740), -370, -16);
    x.fillText(fitText(x, lines.slice(1).join(" "), 740), -370, 34);
  }
  x.fillStyle = "#7b6f8c";
  x.font = `800 24px ${FONT}`;
  x.letterSpacing = "4px";
  x.fillText(fitText(x, caption, 740), -370, 76);
  x.letterSpacing = "0px";
  x.restore();
}

/** Capa: arte de papel recortado (sem personagens) e a etiqueta com o título vivo. */
export function drawCover(x: Ctx, width: number, height: number, title: string) {
  x.save();
  x.scale(width / COVER_UNITS.width, height / COVER_UNITS.height);
  paintCoverArt(x);
  x.translate(COVER_UNITS.width * 0.5 + 40, COVER_UNITS.height - 250);
  label(x, title || uiText(3177), uiText(3165));
  x.restore();
}

/** Contracapa: medalhão da lua e etiqueta "Este caderno pertence a", com linhas para o nome. */
export function drawBackCover(x: Ctx, width: number, height: number) {
  x.save();
  x.scale(width / COVER_UNITS.width, height / COVER_UNITS.height);
  paintBackArt(x);
  x.translate(COVER_UNITS.width * 0.47, COVER_UNITS.height * 0.74);
  x.rotate(0.016);
  const labelWidth = 760;
  x.fillStyle = "#51259b";
  x.fillRect(-labelWidth / 2 + 10, -88, labelWidth, 236);
  x.fillStyle = "#fffdf7";
  x.fillRect(-labelWidth / 2, -100, labelWidth, 236);
  x.strokeStyle = "#d5ccba";
  x.lineWidth = 3;
  x.strokeRect(-labelWidth / 2 + 6, -94, labelWidth - 12, 224);
  x.fillStyle = "#a779ef";
  x.fillRect(-110, -118, 220, 34);
  x.fillStyle = "#7b6f8c";
  x.font = `800 26px ${FONT}`;
  x.letterSpacing = "4px";
  x.textAlign = "left";
  x.fillText(fitText(x, uiText(3166), labelWidth - 80), -labelWidth / 2 + 40, -30);
  x.letterSpacing = "0px";
  x.strokeStyle = "#cfc6dc";
  x.lineWidth = 3;
  for (const y of [44, 104]) {
    x.beginPath();
    x.moveTo(-labelWidth / 2 + 40, y);
    x.lineTo(labelWidth / 2 - 40, y);
    x.stroke();
  }
  x.restore();
}

/**
 * Guarda (verso das capas): papel lilás com estrelas e luas recortadas. Os cantos de fora são
 * arredondados como a capa; o lado da lombada fica à esquerda (u = 0).
 */
export function drawEndpaper(x: Ctx, width: number, height: number) {
  const radius = (COVER_CORNER / COVER_UNITS.width) * width;
  x.clearRect(0, 0, width, height);
  x.save();
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(width - radius, 0);
  x.quadraticCurveTo(width, 0, width, radius);
  x.lineTo(width, height - radius);
  x.quadraticCurveTo(width, height, width - radius, height);
  x.lineTo(0, height);
  x.closePath();
  x.clip();
  x.fillStyle = "#ece2ff";
  x.fillRect(0, 0, width, height);
  const random = seeded(3);
  const step = width / 6;
  for (let y = 0; y < height + step; y += step)
    for (let column = (y / step) % 2 ? step / 2 : 0; column < width + step; column += step) {
      if (random() < 0.5)
        paperStar(x, column + 24, y + 24, step * 0.13, random(), "#d6c3ff", "#b99cf2");
      else {
        x.fillStyle = "#d6c3ff";
        x.beginPath();
        x.arc(column + 24, y + 24, step * 0.12, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "#ece2ff";
        x.beginPath();
        x.arc(column + 18, y + 19, step * 0.1, 0, Math.PI * 2);
        x.fill();
      }
    }
  // A guarda é colada: perto da lombada o papel escurece de leve.
  const hinge = x.createLinearGradient(0, 0, width * 0.12, 0);
  hinge.addColorStop(0, "rgba(60,30,110,0.28)");
  hinge.addColorStop(1, "rgba(60,30,110,0)");
  x.fillStyle = hinge;
  x.fillRect(0, 0, width * 0.12, height);
  x.restore();
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

/** Lateral da pilha: uma faixa por folha, com a linha fina entre elas que mostra quantas são. */
export function drawPageEdges(x: Ctx, width: number, height: number) {
  x.fillStyle = "#fbf3e2";
  x.fillRect(0, 0, width, height);
  x.fillStyle = "#fffdf7";
  x.fillRect(0, height * 0.18, width, height * 0.5);
  x.fillStyle = "#d8c8ab";
  x.fillRect(0, height - height * 0.14, width, height * 0.14);
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
  x.fillStyle = "#fffaf0";
  x.fillRect(0, 0, width, height);
  // Grão leve do papel, sempre igual para a mesma folha.
  const random = seeded(17 + (page?.index ?? 0) * 31);
  for (let index = 0; index < 2600; index++) {
    x.fillStyle = random() < 0.5 ? "rgba(120,96,60,0.05)" : "rgba(255,255,255,0.5)";
    x.fillRect(random() * width, random() * height, 2, 2);
  }
  if (page) {
    const top = 150;
    const box = { x: 40, y: top, w: width - 80, h: height - top - 120 };
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
    } else {
      // Folha ainda sem desenho: pauta clara e a margem, como o papel pautado do editor.
      x.strokeStyle = "rgba(124,111,180,0.22)";
      x.lineWidth = 3;
      for (let y = top + 90; y < height - 140; y += 72) {
        x.beginPath();
        x.moveTo(70, y);
        x.lineTo(width - 70, y);
        x.stroke();
      }
      x.strokeStyle = "rgba(226,104,140,0.35)";
      x.beginPath();
      x.moveTo(side ? 170 : width - 170, top + 20);
      x.lineTo(side ? 170 : width - 170, height - 140);
      x.stroke();
      if (page.content) {
        x.fillStyle = "#3a3346";
        x.font = `700 40px ${HAND}`;
        let y = top + 82;
        for (const line of wrap(x, page.content, box.w - 220)) {
          if (y > box.y + box.h - 20) break;
          x.fillText(line, side ? 196 : 110, y);
          y += 72;
        }
      }
    }
    x.fillStyle = "#292432";
    x.font = `800 54px ${FONT}`;
    x.textAlign = "left";
    const title = fitText(x, page.title || uiText(3177), width - 360);
    x.fillText(title, side ? 70 : 100, 96);
    x.fillStyle = "#FACC15";
    x.fillRect(side ? 70 : 100, 112, Math.min(width - 360, x.measureText(title).width) * 0.6, 10);
    x.fillStyle = "#7b6f8c";
    x.font = `800 24px ${FONT}`;
    x.letterSpacing = "5px";
    // O rótulo fica sempre no canto de fora, longe do título.
    x.textAlign = "right";
    x.fillText(uiText(3167, [String(page.index + 1).padStart(2, "0")]), width - 70, 60);
    x.letterSpacing = "0px";
    // Número da folha numa bolinha de papel no canto de fora, embaixo.
    const nx = side ? width - 96 : 96;
    const ny = height - 76;
    x.fillStyle = "rgba(81,37,155,0.18)";
    x.beginPath();
    x.arc(nx + 4, ny + 6, 40, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#ece2ff";
    x.beginPath();
    x.arc(nx, ny, 40, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#51259b";
    x.font = `800 32px ${FONT}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(String(page.index + 1), nx, ny + 2);
    x.textBaseline = "alphabetic";
    x.textAlign = "left";
  }
  // Sombra da dobra na lombada e um leve escurecer na borda de fora.
  const edge = side ? 0 : width;
  const fold = x.createLinearGradient(edge, 0, side ? 150 : width - 150, 0);
  fold.addColorStop(0, "rgba(60,40,90,0.28)");
  fold.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = fold;
  x.fillRect(side ? 0 : width - 150, 0, 150, height);
  const outer = x.createLinearGradient(side ? width : 0, 0, side ? width - 60 : 60, 0);
  outer.addColorStop(0, "rgba(120,96,60,0.12)");
  outer.addColorStop(1, "rgba(120,96,60,0)");
  x.fillStyle = outer;
  x.fillRect(side ? width - 60 : 0, 0, 60, height);
}

/** Mesmo convite da vitrine 2D: ícone "+" de papel e o nome em roxo, centralizados na folha. */
export function drawCreateCard(x: Ctx, canvasWidth: number, canvasHeight: number, first: boolean) {
  x.clearRect(0, 0, canvasWidth, canvasHeight);
  // O desenho é pensado em 1024 de largura; escala para o tamanho do canvas.
  const scale = canvasWidth / 1024;
  const width = 1024;
  const height = canvasHeight / scale;
  x.save();
  x.scale(scale, scale);
  const cx = width / 2;
  const icon = 150;
  const top = height / 2 - icon / 2 - 40;
  x.save();
  x.translate(cx - icon / 2, top);
  x.scale(icon / 48, icon / 48);
  for (const [fill, path] of [
    ["#292432", "M8 10 14 5h24l5 6-2 27-6 5H11l-6-6Z"],
    ["#51465D", "m8 10 6-5 4 7-5 24-8 1Z"],
    ["#FFF9EF", "M21 14h7v8h8v7h-8v8h-7v-8h-8v-7h8Z"],
    ["#FACC15", "m28 14 4 4-4 4Z"],
  ] as const) {
    x.fillStyle = fill;
    x.fill(new Path2D(path));
  }
  x.restore();
  x.fillStyle = "#51259b";
  x.font = `800 58px ${FONT}`;
  x.textAlign = "center";
  x.fillText(first ? uiText(1391) : uiText(746), cx, top + icon + 80);
  x.textAlign = "left";
  x.restore();
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
