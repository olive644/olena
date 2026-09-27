import type { HandwritingPaperColor } from "../domain/handwriting";

// Papéis com layout fixo, iguais em qualquer folha (ao contrário do plano semanal e do
// calendário, que têm data): o método Cornell, para anotar aula com pistas e resumo, e a
// pauta musical, para escrever partitura à mão.

function paperTones(color: HandwritingPaperColor) {
  const dark = color === "night";
  return {
    ink: dark ? "#FFF9EF" : "#292432",
    line: dark ? "#6d5f78" : "#d5cce3",
    soft: dark ? "#51465D" : "#eee5ff",
  };
}

export function drawCornellPaper(
  context: CanvasRenderingContext2D,
  color: HandwritingPaperColor,
  width: number,
  height: number,
) {
  const { ink, line, soft } = paperTones(color);
  context.save();
  context.scale(width / 1200, height / 1600);
  // Cabeçalho: título e data, iguais em toda folha Cornell.
  context.fillStyle = soft;
  context.fillRect(64, 60, 1072, 96);
  context.fillStyle = ink;
  context.font = "bold 32px Manrope, sans-serif";
  context.fillText("Cornell", 88, 118);
  context.font = "20px Manrope, sans-serif";
  context.fillText("Tópico: ____________________    Data: ____________________", 380, 118);

  const cuesRight = 64 + 300;
  const notesTop = 196;
  const summaryTop = 1360;
  const contentBottom = summaryTop - 24;

  // Linha vertical entre pistas e anotações, e horizontal antes do resumo.
  context.strokeStyle = line;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(cuesRight, notesTop);
  context.lineTo(cuesRight, contentBottom);
  context.moveTo(64, summaryTop);
  context.lineTo(1136, summaryTop);
  context.stroke();

  // Pautas finas dentro das três áreas, no mesmo espaçamento do papel pautado comum.
  context.lineWidth = 1.4;
  for (let y = notesTop + 44; y < contentBottom; y += 44) {
    context.beginPath();
    context.moveTo(64, y);
    context.lineTo(cuesRight - 16, y);
    context.moveTo(cuesRight + 16, y);
    context.lineTo(1136, y);
    context.stroke();
  }
  for (let y = summaryTop + 40; y < 1536; y += 40) {
    context.beginPath();
    context.moveTo(64, y);
    context.lineTo(1136, y);
    context.stroke();
  }

  context.fillStyle = ink;
  context.font = "bold 18px Manrope, sans-serif";
  context.fillText("Pistas", 64, notesTop - 12);
  context.fillText("Anotações", cuesRight + 16, notesTop - 12);
  context.fillText("Resumo", 64, summaryTop - 12);
  context.restore();
}

// Cada pauta (5 linhas finas e próximas) repete pela folha, com um respiro maior entre uma
// pauta e a próxima, do jeito de um caderno de música de papel.
export function drawStaffPaper(
  context: CanvasRenderingContext2D,
  color: HandwritingPaperColor,
  width: number,
  height: number,
) {
  const { line } = paperTones(color);
  context.save();
  context.scale(width / 1200, height / 1600);
  const left = 64;
  const right = 1136;
  const lineGap = 14;
  const staffHeight = lineGap * 4;
  const staffGap = 96;
  let y = 120;
  context.strokeStyle = line;
  context.lineWidth = 1.6;
  while (y + staffHeight < 1560) {
    for (let row = 0; row < 5; row++) {
      context.beginPath();
      context.moveTo(left, y + row * lineGap);
      context.lineTo(right, y + row * lineGap);
      context.stroke();
    }
    y += staffHeight + staffGap;
  }
  context.restore();
}
