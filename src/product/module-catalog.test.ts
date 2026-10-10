import { describe, expect, it } from "vitest";
import { PRODUCT_MODULES, STUDENT_SPACE_TOOLS } from "./module-catalog";

describe("catálogo de módulos", () => {
  it("mantém identificadores únicos e um Espaço do aluno disponível", () => {
    const ids = PRODUCT_MODULES.map((module) => module.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(PRODUCT_MODULES.find((module) => module.id === "student-space")).toMatchObject({
      name: "Espaço do aluno",
      status: "available",
      entryView: "today",
    });
  });

  it("só oferece na tela inicial ferramentas que já possuem uma entrada real", () => {
    const availableViews = new Set(
      PRODUCT_MODULES.filter((module) => module.status === "available").map(
        (module) => module.entryView,
      ),
    );

    for (const tool of STUDENT_SPACE_TOOLS) {
      expect(availableViews.has(tool.view)).toBe(true);
    }
  });

  it("marca digitalização e bingo como recursos disponíveis", () => {
    expect(PRODUCT_MODULES.find((module) => module.id === "scanner")).toMatchObject({
      status: "available",
      entryView: "notes",
    });
    expect(PRODUCT_MODULES.find((module) => module.id === "bingo")).toMatchObject({
      status: "available",
      entryView: "learn",
    });
  });

  it("marca escrita à mão e Modo Sala como disponíveis e mantém o OCR de digitalizações planejado", () => {
    expect(PRODUCT_MODULES.find((module) => module.id === "handwriting")).toMatchObject({
      status: "available",
      entryView: "notes",
    });
    expect(PRODUCT_MODULES.find((module) => module.id === "room")).toMatchObject({
      status: "available",
      entryView: "room",
    });
    expect(PRODUCT_MODULES.find((module) => module.id === "ocr")?.status).toBe("planned");
  });
});
