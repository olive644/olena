import { expect, it } from "vitest";
import { erasePageText, pageTextLines, rulerLength } from "./handwriting";

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

it("mede a folha digital em pixels, centímetros e polegadas", () => {
  expect(rulerLength(1200, "cm")).toBe("21.00 cm");
  expect(rulerLength((1200 * 2.54) / 21, "in")).toBe("1.00 in");
  expect(rulerLength(42.4, "px")).toBe("42 px");
});
