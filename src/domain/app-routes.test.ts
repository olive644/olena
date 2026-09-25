import { describe, expect, it } from "vitest";
import { VIEW_PATHS, pathForView, viewFromPath } from "./app-routes";

describe("rotas das abas", () => {
  it("cada aba tem um caminho único e volta para ela mesma", () => {
    const paths = Object.values(VIEW_PATHS);
    expect(new Set(paths).size).toBe(paths.length);
    for (const view of Object.keys(VIEW_PATHS) as (keyof typeof VIEW_PATHS)[])
      expect(viewFromPath(pathForView(view))).toBe(view);
  });

  it("reconhece Cadernos em /cadernos, com barra final e em maiúsculas", () => {
    expect(viewFromPath("/cadernos")).toBe("notes");
    expect(viewFromPath("/cadernos/")).toBe("notes");
    expect(viewFromPath("/Cadernos")).toBe("notes");
    expect(viewFromPath("/")).toBe("today");
  });

  it("caminho desconhecido não é de nenhuma aba", () => {
    expect(viewFromPath("/qualquer-coisa")).toBeNull();
    expect(viewFromPath("/sala/ABCDE/projetor")).toBeNull();
  });
});
