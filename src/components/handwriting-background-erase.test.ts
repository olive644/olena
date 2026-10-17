import { afterEach, describe, expect, it, vi } from "vitest";
import { isHandwritingDocument } from "../data/local-workspace";
import { drawCoverMask, drawStroke, renderPage, sizePageCanvas } from "./handwriting-canvas";
import { strokeInkBounds } from "./handwriting-geometry";
import type { Stroke } from "./handwriting-types";

type Call = {
  name: string;
  args: unknown[];
  op: unknown;
  strokeStyle: unknown;
  lineWidth: unknown;
};

// Contexto 2D falso que registra cada chamada com o estado do momento (operação de composição,
// cor e espessura do traço), para conferir o que foi desenhado e em que modo.
function recordingContext() {
  const calls: Call[] = [];
  const state: Record<string, unknown> = {};
  const context = new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      return (...args: unknown[]) => {
        calls.push({
          name: String(prop),
          args,
          op: target["globalCompositeOperation"],
          strokeStyle: target["strokeStyle"],
          lineWidth: target["lineWidth"],
        });
      };
    },
    set(target, prop, value) {
      target[prop as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { context, calls, state };
}

afterEach(() => vi.restoreAllMocks());

const point = (x: number, y: number) => ({ x, y, pressure: 0.5 });
const cover: Stroke = {
  id: "cover",
  tool: "pen",
  brush: "fine",
  cover: true,
  color: "#7433e0",
  width: 60,
  points: [point(100, 100), point(400, 100)],
};
const ink: Stroke = {
  id: "ink",
  tool: "pen",
  brush: "fine",
  color: "#17151c",
  width: 4,
  points: [point(100, 300), point(400, 300)],
};

// Monta a folha com uma página importada e devolve o que foi desenhado na folha e no rascunho.
function render(strokes: Stroke[], options: { background?: boolean; visible?: boolean } = {}) {
  const page = document.createElement("canvas");
  sizePageCanvas(page, 1);
  const main = recordingContext();
  vi.spyOn(page, "getContext").mockReturnValue(main.context);
  const scratch = document.createElement("canvas");
  const side = recordingContext();
  vi.spyOn(scratch, "getContext").mockReturnValue(side.context);
  const create = document.createElement.bind(document);
  const spy = vi
    .spyOn(document, "createElement")
    .mockImplementation(((tag: string) => (tag === "canvas" ? scratch : create(tag))) as never);
  const background = options.background === false ? undefined : new Image();
  renderPage(page, strokes, "blank", "light", [], false, "", 28, [], background, undefined, {
    background: options.visible !== false,
    coordinates: true,
    strokes: true,
    text: true,
    stickies: true,
  });
  return { main, side, scratch, scratchRequested: spy.mock.calls.length > 0 };
}

describe("borracha de fundo: desenho", () => {
  it("no traço, a prévia é uma faixa roxa clara com a largura inteira (não 65%)", () => {
    const { context, state } = recordingContext();
    let alpha = 0;
    let width = 0;
    const spied = new Proxy(context as unknown as Record<string, unknown>, {
      get(target, prop) {
        if (prop === "stroke")
          return () => {
            alpha = Number(state["globalAlpha"]);
            width = Number(state["lineWidth"]);
          };
        return Reflect.get(target, prop);
      },
      set(target, prop, value) {
        return Reflect.set(target, prop, value);
      },
    }) as unknown as CanvasRenderingContext2D;
    drawStroke(spied, cover);
    expect(alpha).toBeCloseTo(0.18);
    expect(width).toBe(60);
    expect(state["strokeStyle"]).toBe("#7433e0");
  });

  it("a máscara é um traço preto opaco, de largura constante", () => {
    const { context, calls } = recordingContext();
    drawCoverMask(context, cover);
    const stroke = calls.find((call) => call.name === "stroke")!;
    expect(stroke.strokeStyle).toBe("#000000");
    expect(stroke.lineWidth).toBe(60);
  });

  it("fura o fundo: desenha o fundo à parte, apaga com destination-out e põe sobre o papel", () => {
    const { main, side, scratch } = render([cover, ink]);
    const names = side.calls.map((call) => call.name);
    expect(names.indexOf("drawImage")).toBeGreaterThanOrEqual(0);
    const hole = side.calls.find((call) => call.name === "stroke")!;
    expect(hole.op).toBe("destination-out");
    expect(names.indexOf("drawImage")).toBeLessThan(names.indexOf("stroke"));
    const paste = main.calls.find((call) => call.name === "drawImage")!;
    expect(paste.args[0]).toBe(scratch);
  });

  it("o traço de cobertura não é tinta: só a tinta comum aparece na folha", () => {
    const { main } = render([cover, ink]);
    const inked = main.calls.filter((call) => call.name === "stroke");
    expect(inked.some((call) => call.strokeStyle === "#7433e0")).toBe(false);
    expect(inked.some((call) => call.strokeStyle === "#17151c")).toBe(true);
  });

  it("sem página nem imagem importada, não há furo e nada é desenhado", () => {
    const { main, scratchRequested } = render([cover], { background: false });
    expect(scratchRequested).toBe(false);
    expect(main.calls.some((call) => call.name === "stroke")).toBe(false);
  });

  it("com a camada do fundo oculta, não há furo", () => {
    const { scratchRequested } = render([cover], { visible: false });
    expect(scratchRequested).toBe(false);
  });

  it("sem traço de cobertura, o fundo vai direto para a folha, como sempre", () => {
    const { main, scratchRequested } = render([ink]);
    expect(scratchRequested).toBe(false);
    expect(main.calls.some((call) => call.name === "drawImage")).toBe(true);
  });
});

describe("borracha de fundo: edição e armazenamento", () => {
  it("a caixa do traço usa a largura inteira, como o desenho", () => {
    const bounds = strokeInkBounds(cover);
    expect(bounds.y).toBeCloseTo(100 - 30);
    expect(bounds.height).toBeCloseTo(60);
  });

  const document = (value: unknown) => ({
    version: 1,
    paper: "ruled",
    strokes: [{ ...ink, ...(value === undefined ? {} : { cover: value }) }],
    stickies: [],
  });

  it("aceita o campo ausente ou verdadeiro e recusa outros valores", () => {
    expect(isHandwritingDocument(document(undefined))).toBe(true);
    expect(isHandwritingDocument(document(true))).toBe(true);
    expect(isHandwritingDocument(document(false))).toBe(false);
    expect(isHandwritingDocument(document("sim"))).toBe(false);
  });
});
