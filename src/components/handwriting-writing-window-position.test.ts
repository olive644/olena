import { afterEach, describe, expect, it } from "vitest";
import {
  WRITING_WINDOW_POSITION_KEY,
  clampWritingWindow,
  fromFraction,
  readWritingWindowFraction,
  toFraction,
  writeWritingWindowFraction,
} from "./handwriting-writing-window-position";

afterEach(() => localStorage.clear());

const area = { width: 1000, height: 700 };
const size = { width: 600, height: 200 };

describe("posição da janela de escrita", () => {
  it("mantém a janela inteira dentro do editor", () => {
    expect(clampWritingWindow({ x: -50, y: -10 }, area, size)).toEqual({ x: 0, y: 0 });
    expect(clampWritingWindow({ x: 900, y: 650 }, area, size)).toEqual({ x: 400, y: 500 });
    expect(clampWritingWindow({ x: 120.4, y: 80.6 }, area, size)).toEqual({ x: 120, y: 81 });
  });

  it("respeita a origem da área de escrita, para não cobrir as ferramentas", () => {
    const writing = { x: 0, y: 120, width: 1000, height: 500 };
    expect(clampWritingWindow({ x: 10, y: 0 }, writing, size)).toEqual({ x: 10, y: 120 });
    expect(clampWritingWindow({ x: 10, y: 900 }, writing, size)).toEqual({ x: 10, y: 420 });
    const fraction = toFraction({ x: 200, y: 270 }, writing, size);
    expect(fraction).toEqual({ x: 0.5, y: 0.5 });
    expect(fromFraction(fraction, writing, size)).toEqual({ x: 200, y: 270 });
  });

  it("fica no canto quando a janela é maior que a área", () => {
    expect(clampWritingWindow({ x: 50, y: 50 }, { width: 300, height: 100 }, size)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("converte para fração e volta em telas de tamanhos diferentes", () => {
    const fraction = toFraction({ x: 200, y: 250 }, area, size);
    expect(fraction).toEqual({ x: 0.5, y: 0.5 });
    // Numa tela menor a mesma fração cai no mesmo lugar relativo e continua dentro.
    const small = { width: 700, height: 500 };
    const back = fromFraction(fraction, small, { width: 600, height: 200 });
    expect(back).toEqual({ x: 50, y: 150 });
    expect(fromFraction({ x: 1, y: 1 }, small, size)).toEqual({ x: 100, y: 300 });
  });

  it("lembra a posição só neste aparelho e ignora dados inválidos", () => {
    expect(readWritingWindowFraction()).toBeNull();
    writeWritingWindowFraction({ x: 0.25, y: 0.75 });
    expect(readWritingWindowFraction()).toEqual({ x: 0.25, y: 0.75 });
    for (const bad of [
      "{quebrado",
      "null",
      JSON.stringify({ x: 2, y: 0.5 }),
      JSON.stringify({ x: "a", y: 0.5 }),
      JSON.stringify([0.1, 0.2]),
    ]) {
      localStorage.setItem(WRITING_WINDOW_POSITION_KEY, bad);
      expect(readWritingWindowFraction()).toBeNull();
    }
  });
});
