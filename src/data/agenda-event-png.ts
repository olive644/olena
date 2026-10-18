import { uiLocale } from "../i18n/runtime";
import type { StudyEvent } from "../domain/workspace";
import { brandedExportCanvas, loadPaperExportMascot } from "./paper-export-art";

export async function agendaEventPng(
  event: StudyEvent,
  subject: string,
  date: string,
): Promise<File> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 560;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar o PNG do evento.");
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, 800, 560);
  context.fillStyle = event.color ?? "#7c3aed";
  context.fillRect(0, 0, 10, 560);
  let y = 64;
  function text(value: string, size: number, maximumLines: number) {
    context!.font = `700 ${size}px Manrope, sans-serif`;
    context!.fillStyle = "#292432";
    const words = [...value.replace(/\s+/g, " ").slice(0, 1200)];
    let line = "",
      count = 0;
    for (const character of words) {
      if (context!.measureText(line + character).width > 704) {
        context!.fillText(line, 40, y);
        y += size * 1.5;
        line = "";
        if (++count >= maximumLines) return;
      }
      line += character;
    }
    if (line) {
      context!.fillText(line, 40, y);
      y += size * 1.5;
    }
  }
  text(event.title, 32, 3);
  y += 18;
  text(subject, 20, 1);
  text(
    new Date(`${date}T12:00:00`).toLocaleDateString(uiLocale(), {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    20,
    2,
  );
  text(
    event.allDay ? "Dia inteiro" : `${event.time}${event.endTime ? ` até ${event.endTime}` : ""}`,
    24,
    1,
  );
  if (event.location) text(event.location, 18, 2);
  if (event.description && y < 450)
    text(event.description, 16, Math.max(1, Math.floor((530 - y) / 24)));
  const exported = brandedExportCanvas(canvas, await loadPaperExportMascot(), "AGENDA");
  const blob = await new Promise<Blob>((resolve, reject) =>
    exported.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Não foi possível criar o PNG."))),
      "image/png",
    ),
  );
  return new File([blob], "evento-olenastudy.png", { type: "image/png" });
}
