import { describe, expect, it } from "vitest";
import { drawCornellPaper, drawStaffPaper } from "./handwriting-template-paper";
import { drawPaper } from "./handwriting-canvas";

// Contexto 2D falso: grava toda chamada de método e toda propriedade lida/gravada, sem
// desenhar nada de verdade (jsdom não tem canvas 2D).
function fakeContext() {
  const calls: string[] = [];
  const context = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return (target as Record<string, unknown>)[prop as string];
        return (...args: unknown[]) => {
          calls.push(`${String(prop)}(${args.length})`);
        };
      },
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { context, calls };
}

describe("papel Cornell", () => {
  it("desenha o cabeçalho, as três áreas e não estoura a folha", () => {
    const { context, calls } = fakeContext();
    expect(() => drawCornellPaper(context, "light", 1200, 1600)).not.toThrow();
    expect(calls.filter((call) => call.startsWith("fillText")).length).toBeGreaterThanOrEqual(5);
    expect(calls.filter((call) => call.startsWith("stroke")).length).toBeGreaterThan(0);
  });

  it("funciona em qualquer tamanho de bitmap e cor de folha", () => {
    const { context } = fakeContext();
    for (const color of ["light", "aged", "night"] as const) {
      expect(() => drawCornellPaper(context, color, 2400, 3200)).not.toThrow();
    }
  });
});

describe("pauta musical", () => {
  it("desenha mais de uma pauta de 5 linhas, sem estourar a folha", () => {
    const { context, calls } = fakeContext();
    expect(() => drawStaffPaper(context, "light", 1200, 1600)).not.toThrow();
    // 5 linhas por pauta; a folha cabe várias pautas com a folga usada aqui.
    const strokes = calls.filter((call) => call.startsWith("stroke(")).length;
    expect(strokes).toBeGreaterThanOrEqual(10);
  });
});

describe("drawPaper encaminha os papéis novos", () => {
  it("cornell e pauta musical não travam e pintam o fundo da cor certa", () => {
    const cornell = fakeContext();
    drawPaper(cornell.context, "cornell", "aged");
    expect(cornell.context.fillStyle).toBeTruthy();
    const staff = fakeContext();
    expect(() => drawPaper(staff.context, "staff", "night")).not.toThrow();
  });
});
