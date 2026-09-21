import { expect, it } from "vitest";
import { stickyTextLayout } from "./sticky-text-layout";

it("preserva todo o texto exportado dentro do post-it", () => {
  for (const text of [
    "Questão\n\nResposta com acentos",
    "W".repeat(240),
    "Linha\n".repeat(40),
    "\n".repeat(240),
  ]) {
    const { lines, fontSize } = stickyTextLayout(text, (line, size) => line.length * size);
    expect(lines.join("")).toBe(text.replaceAll("\n", ""));
    expect(lines.length * fontSize * 1.3).toBeLessThanOrEqual(174);
    expect(lines.every((line) => line.length * fontSize <= 224)).toBe(true);
  }
  expect(stickyTextLayout("Título\n\nTexto", (line, size) => line.length * size).lines).toEqual([
    "Título",
    "",
    "Texto",
  ]);
});
