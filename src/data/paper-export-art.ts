const INK = "#292432",
  CREAM = "#fff9ef",
  PURPLE = "#7c3aed";
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

/** Arte autoral de papel: selo da Olena e estrela, não uma certificação. */
export function drawPaperExportSeal(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  mascot: CanvasImageSource,
) {
  context.save();
  context.translate(x, y);
  context.scale(size / 100, size / 100);
  polygon(
    context,
    [
      [50, 0],
      [85, 15],
      [100, 50],
      [85, 85],
      [50, 100],
      [15, 85],
      [0, 50],
      [15, 15],
    ],
    PURPLE,
  );
  polygon(
    context,
    [
      [50, 8],
      [79, 21],
      [92, 50],
      [79, 79],
      [50, 92],
      [21, 79],
      [8, 50],
      [21, 21],
    ],
    CREAM,
  );
  context.drawImage(mascot, 15, 15, 70, 70);
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
  context.font = `800 ${fontSize}px Manrope, sans-serif`;
  context.fillStyle = INK;
  context.fillText("Olena", margin, header * 0.64);
  context.fillStyle = PURPLE;
  context.fillText("Study", margin + context.measureText("Olena").width, header * 0.64);
  context.font = `700 ${Math.max(10, fontSize * 0.48)}px Manrope, sans-serif`;
  context.textAlign = "right";
  context.fillStyle = INK;
  context.fillText(label, canvas.width - margin, header * 0.64);
  context.textAlign = "left";
  const baseline = canvas.height - footer * 0.36;
  context.save();
  context.globalAlpha = 0.18;
  context.font = `800 ${Math.max(22, footer * 0.42)}px Manrope, sans-serif`;
  context.fillStyle = PURPLE;
  context.fillText("OLENA STUDY", margin, baseline);
  context.restore();
  context.font = `700 ${Math.max(9, footer * 0.14)}px Manrope, sans-serif`;
  context.fillStyle = INK;
  context.fillText("FEITO PARA APRENDER", margin, canvas.height - footer * 0.15);
  drawPaperExportSeal(
    context,
    canvas.width - margin - footer * 0.8,
    canvas.height - footer * 0.92,
    footer * 0.76,
    mascot,
  );
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
