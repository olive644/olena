import { PAPER_LETTER_PATHS } from "./paper-letter-paths";

const INK = "#292432",
  CREAM = "#fff9ef";
let mascotPromise: Promise<HTMLImageElement> | null = null;
export function loadPaperExportMascot(): Promise<HTMLImageElement> {
  if (!mascotPromise)
    mascotPromise = (async () => {
      const image = new Image();
      image.src = "/olena-favicon.png";
      await image.decode();
      return image;
    })().catch(() => {
      mascotPromise = null;
      throw new Error("Não foi possível carregar a Olena do selo. Tente novamente.");
    });
  return mascotPromise;
}

function polygon(context: CanvasRenderingContext2D, points: number[][], color: string) {
  context.fillStyle = color;
  context.beginPath();
  points.forEach(([x, y], index) => (index ? context.lineTo(x!, y!) : context.moveTo(x!, y!)));
  context.closePath();
  context.fill();
}

/** Usa os mesmos recortes aprovados do título da marca no aplicativo. */
function drawExportWordmark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
) {
  context.save();
  context.translate(x, y);
  context.scale(height / 98, height / 98);
  for (const letter of "OLENASTUDY") {
    const path = new Path2D(PAPER_LETTER_PATHS[letter]);
    context.save();
    context.translate(3, 5);
    context.fillStyle = "#17131d";
    context.fill(path, "evenodd");
    context.restore();
    context.fillStyle = INK;
    context.fill(path, "evenodd");
    context.translate(66, 0);
  }
  context.restore();
}

/** Enquadra uma cópia de exportação; nunca altera o canvas/documento salvo. */
export function brandedExportCanvas(
  source: HTMLCanvasElement,
  mascot: CanvasImageSource,
  label = "CADERNO",
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const margin = Math.max(16, Math.round(source.width * 0.035));
  const header = Math.max(56, Math.round(source.width * 0.075));
  const footer = Math.max(80, Math.round(source.width * 0.11));
  canvas.width = source.width + margin * 2;
  canvas.height = source.height + header + footer;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a arte de exportação.");
  context.fillStyle = CREAM;
  context.fillRect(0, 0, canvas.width, canvas.height);
  polygon(
    context,
    [
      [0, 0],
      [margin * 3, 0],
      [0, header],
    ],
    "#eee5d5",
  );
  polygon(
    context,
    [
      [canvas.width, canvas.height],
      [canvas.width - margin * 3, canvas.height],
      [canvas.width, canvas.height - footer],
    ],
    "#e9ddc6",
  );
  context.drawImage(source, margin, header);
  const fontSize = Math.max(18, Math.round(header * 0.36));
  const mascotSize = header * 0.64;
  context.drawImage(mascot, margin, (header - mascotSize) / 2, mascotSize, mascotSize);
  drawExportWordmark(context, margin + mascotSize + fontSize * 0.4, header * 0.25, header * 0.5);
  context.font = `700 ${Math.max(10, fontSize * 0.48)}px Manrope, sans-serif`;
  context.textAlign = "right";
  context.fillStyle = INK;
  context.fillText(label, canvas.width - margin, header * 0.64);
  context.textAlign = "left";
  context.font = `700 ${Math.max(9, footer * 0.14)}px Manrope, sans-serif`;
  context.fillStyle = INK;
  context.fillText("FEITO PARA APRENDER", margin, canvas.height - footer * 0.15);
  return canvas;
}

export function downloadExportBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
