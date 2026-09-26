import type { HandwritingPaperColor } from "../domain/handwriting";

/** Modelos sem data: o calendário e a semana podem ser reutilizados em qualquer período. */
export function drawPlannerPaper(
  context: CanvasRenderingContext2D,
  paper: "weekly" | "calendar",
  color: HandwritingPaperColor,
  width: number,
  height: number,
) {
  const dark = color === "night";
  const ink = dark ? "#FFF9EF" : "#292432";
  const line = dark ? "#6d5f78" : "#d5cce3";
  context.save();
  context.scale(width / 1200, height / 1600);
  context.fillStyle = "#51259B";
  context.fillRect(64, 70, 1072, 112);
  context.fillStyle = "#7C3AED";
  context.fillRect(56, 60, 1072, 112);
  context.fillStyle = "#A779EF";
  context.beginPath();
  context.moveTo(56, 60);
  context.lineTo(94, 60);
  context.lineTo(56, 98);
  context.fill();
  context.fillStyle = "#FFF9EF";
  context.font = "bold 44px Manrope, sans-serif";
  context.fillText(paper === "weekly" ? "Plano semanal" : "Calendário", 88, 132);
  context.fillStyle = ink;
  context.font = "24px Manrope, sans-serif";
  context.fillText(
    paper === "weekly"
      ? "Semana de: ____________________"
      : "Mês: ____________________    Ano: __________",
    64,
    236,
  );
  const labels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const box = (x: number, y: number, w: number, h: number, label: string) => {
    context.strokeStyle = line;
    context.lineWidth = 2;
    context.strokeRect(x, y, w, h);
    context.fillStyle = dark ? "#51465D" : "#eee5ff";
    context.fillRect(x + 1, y + 1, w - 2, 48);
    context.fillStyle = ink;
    context.font = "bold 22px Manrope, sans-serif";
    context.fillText(label, x + 18, y + 32);
  };
  if (paper === "weekly") {
    [...labels, "Prioridades e ideias"].forEach((label, index) => {
      const x = 64 + (index % 2) * 548;
      const y = 290 + Math.floor(index / 2) * 300;
      box(x, y, 524, 278, label);
      context.strokeStyle = line;
      context.lineWidth = 1;
      for (let row = 0; row < 4; row++) {
        context.beginPath();
        context.moveTo(x + 18, y + 98 + row * 45);
        context.lineTo(x + 506, y + 98 + row * 45);
        context.stroke();
      }
    });
  } else {
    const cellWidth = 1072 / 7;
    labels.forEach((label, index) =>
      box(64 + index * cellWidth, 290, cellWidth, 54, label.slice(0, 3)),
    );
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        const x = 64 + col * cellWidth;
        const y = 344 + row * 156;
        context.strokeStyle = line;
        context.strokeRect(x, y, cellWidth, 156);
        context.fillStyle = dark ? "#51465D" : "#eee5ff";
        context.fillRect(x + 10, y + 10, 28, 28);
      }
    }
    box(64, 1320, 1072, 170, "Lembretes do mês");
  }
  context.restore();
}
