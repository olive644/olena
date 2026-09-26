import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HANDWRITING_LAYER_ORDER,
  DEFAULT_HANDWRITING_LAYER_VISIBILITY,
} from "../domain/handwriting";

const renderPage = vi.hoisted(() => vi.fn());
vi.mock("./handwriting-canvas", () => ({ renderPage }));

import { renderPageScene, type PageScene } from "./handwriting-page-scene";

const scene: PageScene = {
  strokes: [{ id: "a", tool: "pen", color: "#000", width: 4, points: [] }],
  paper: "ruled",
  paperColor: "light",
  stickies: [],
  pageText: "Olá",
  pageTextSize: 30,
  pageTextFrame: { x: 1, y: 2, width: 3, height: 4 },
  coordinateSystems: [],
  backgroundImage: undefined,
  backgroundFrame: undefined,
  layers: DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  layerOrder: DEFAULT_HANDWRITING_LAYER_ORDER,
  images: [],
};

beforeEach(() => renderPage.mockClear());

describe("cena da folha", () => {
  it("por padrão desenha a folha limpa, na ordem de argumentos do desenho", () => {
    const canvas = document.createElement("canvas");
    renderPageScene(canvas, scene);
    const args = renderPage.mock.calls[0]!;
    expect(args[0]).toBe(canvas);
    expect(args[1]).toBe(scene.strokes);
    expect(args.slice(2, 5)).toEqual(["ruled", "light", []]);
    expect(args[5]).toBe(false);
    expect(args[6]).toBe("Olá");
    expect(args[7]).toBe(30);
    expect(args[14]).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  it("na tela aceita o modo de edição, outros traços e outro texto", () => {
    renderPageScene(document.createElement("canvas"), scene, {
      editing: true,
      strokes: [],
      pageText: "",
    });
    const args = renderPage.mock.calls[0]!;
    expect(args[1]).toEqual([]);
    expect(args[5]).toBe(true);
    expect(args[6]).toBe("");
  });
});
