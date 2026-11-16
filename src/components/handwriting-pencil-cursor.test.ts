import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { pencilCursor, PENCIL_CURSOR_TIP, PENCIL_CURSOR_ART } from "./handwriting-pencil-cursor";

function svg(cursor: string) {
  return new DOMParser().parseFromString(
    decodeURIComponent(cursor.split('url("data:image/svg+xml,')[1]!.split('")')[0]!),
    "image/svg+xml",
  );
}
describe("ponta do lápis sincronizada com o cursor", () => {
  it("mantém exatamente o mesmo desenho e ponto de mira ao começar o traço", () => {
    const resting = svg(pencilCursor("#ef476f"));
    const active = svg(pencilCursor("#ef476f", true));
    expect(resting.querySelector("circle")).toBeNull();
    expect(active.querySelector("g")?.outerHTML).toBe(resting.querySelector("g")?.outerHTML);
    expect(active.querySelector("circle")?.getAttribute("cx")).toBe(String(PENCIL_CURSOR_TIP.x));
    expect(active.querySelector("circle")?.getAttribute("cy")).toBe(String(PENCIL_CURSOR_TIP.y));
    expect(active.querySelector("circle")?.getAttribute("fill")).toBe("#ef476f");
    expect(pencilCursor("#ef476f", true)).toContain('") 6 21, crosshair');
  });
  it("usa o mesmo desenho no SVG de repouso e reduz o lápis para 18 px", () => {
    const file = readFileSync("public/navigation-icons/paper/notebook-pencil-cursor.svg", "utf8");
    expect(file).toContain(PENCIL_CURSOR_ART);
    expect(PENCIL_CURSOR_ART).toContain("scale(.5625)");
    expect(32 * 0.5625).toBe(18);
  });
  it("recusa inserir atributos vindos de uma cor inválida", () => {
    expect(
      svg(pencilCursor('red" onload="alert(1)', true))
        .querySelector("circle")
        ?.getAttribute("fill"),
    ).toBe("#17151c");
  });
});
