import type { SourceQuiz } from "../domain/source-quiz";
import { downloadNotebookPdf } from "./notebook-export";
/** Paginated A4 export; answers stay hidden until the exam is submitted. */
export async function downloadSourceExamPdf(
  title: string,
  quiz: SourceQuiz,
  name: string,
  date: string,
  answers: Record<number, number>,
  corrected: boolean,
  seconds: number,
) {
  await document.fonts.ready;
  const pages: string[] = [];
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let y = 0;
  function page() {
    if (canvas) pages.push(canvas.toDataURL("image/jpeg", 0.92));
    canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar o PDF.");
    ctx = context;
    ctx.fillStyle = "#fff9ef";
    ctx.fillRect(0, 0, 1240, 1754);
    ctx.fillStyle = "#86573f";
    ctx.fillRect(60, 60, 1120, 8);
    y = 115;
  }
  function text(value: string, size = 23, bold = false, color = "#352a38") {
    ctx.font = (bold ? "bold " : "") + size + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = color;
    const words = value.split(/\s+/);
    let line = "";
    for (const word of words) {
      if (ctx.measureText(line + " " + word).width > 1080 && line) {
        write(line);
        line = word;
      } else line += (line ? " " : "") + word;
    }
    if (line) write(line);
    function write(line: string) {
      if (y > 1620) {
        page();
        ctx.font = (bold ? "bold " : "") + size + 'px "Segoe UI", sans-serif';
        ctx.fillStyle = color;
      }
      ctx.fillText(line, 80, y, 1080);
      y += size * 1.55;
    }
  }
  page();
  text("SIMULADO OLENA", 26, true, "#86573f");
  text(title, 38, true);
  y += 18;
  text("Nome: " + name);
  text("Data: " + date);
  y += 18;
  if (corrected) {
    const score = quiz.questions.filter((q, i) => answers[i] === q.answer).length;
    text("Professora Olena • CORRIGIDO", 25, true, "#8a4363");
    text(
      "Pontuação: " +
        score +
        "/" +
        quiz.questions.length +
        " • Tempo: " +
        Math.floor(seconds / 60) +
        ":" +
        String(seconds % 60).padStart(2, "0"),
      24,
      true,
      "#684499",
    );
    y += 18;
  }
  quiz.questions.forEach((q, i) => {
    if (y > 1360) page();
    text(i + 1 + ". " + q.prompt, 24, true);
    q.options.forEach((option, j) =>
      text(
        (answers[i] === j ? "[X] " : "[ ] ") + String.fromCharCode(65 + j) + ". " + option,
        22,
        false,
        corrected && j === q.answer ? "#246c58" : "#352a38",
      ),
    );
    if (corrected) {
      text(
        "Resposta: " + String.fromCharCode(65 + q.answer) + ". " + q.explanation,
        21,
        false,
        "#246c58",
      );
      text(q.sourceTitle + " • Página " + q.page, 18);
    }
    y += 26;
  });
  pages.push(canvas!.toDataURL("image/jpeg", 0.92));
  await downloadNotebookPdf(
    pages,
    false,
    (title.replace(/[<>:"/\\|?*]/g, "-").slice(0, 80) || "simulado-olena") + ".pdf",
  );
}
