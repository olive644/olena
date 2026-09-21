import { expect, it } from "vitest";
import { erasePageText, pageTextLines } from "./handwriting";

it("preserva parágrafos e divide linhas longas sem perder caracteres", () => {
  expect(pageTextLines("Título\n\nTexto")).toEqual(["Título", "", "Texto"]);
  const text = "á".repeat(120);
  const lines = pageTextLines(text);
  expect(lines.map((line) => line.length)).toEqual([58, 58, 4]);
  expect(lines.join("")).toBe(text);
});

it("apaga letras tocadas sem deslocar as demais linhas ou perder acentos", () => {
  const text = "Minha anotação\nSegunda linha";
  expect(erasePageText(text, [{ x: 128, y: 85, pressure: 0.5 }], 17)).toBe(
    "   ha anotação\nSegunda linha",
  );
  expect(erasePageText(text, [{ x: 1000, y: 600, pressure: 0.5 }], 17)).toBe(text);
});
