import { expect, it } from "vitest";
import { pageTextLines } from "./handwriting";

it("preserva parágrafos e divide linhas longas sem perder caracteres", () => {
  expect(pageTextLines("Título\n\nTexto")).toEqual(["Título", "", "Texto"]);
  const text = "á".repeat(120);
  const lines = pageTextLines(text);
  expect(lines.map((line) => line.length)).toEqual([58, 58, 4]);
  expect(lines.join("")).toBe(text);
});
