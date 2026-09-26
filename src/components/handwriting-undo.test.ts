import { describe, expect, it } from "vitest";
import { restoreStrokes } from "./handwriting-undo";
import type { Stroke } from "./handwriting-types";

const stroke = (id: string): Stroke =>
  ({ id, tool: "pen", color: "#000", width: 3, points: [] }) as unknown as Stroke;

describe("desfazer em caderno compartilhado", () => {
  it("sem colegas, restaura exatamente o retrato", () => {
    const result = restoreStrokes([stroke("a")], [stroke("a"), stroke("b")], new Set());
    expect(result.map((item) => item.id)).toEqual(["a"]);
  });

  it("desfazer o meu traço não apaga o traço que o colega escreveu depois", () => {
    // Retrato antes do meu traço: vazio. Agora: meu traço "mine" e o do colega "theirs".
    const result = restoreStrokes([], [stroke("mine"), stroke("theirs")], new Set(["theirs"]));
    expect(result.map((item) => item.id)).toEqual(["theirs"]);
  });

  it("refazer devolve o meu traço e mantém o do colega", () => {
    const result = restoreStrokes([stroke("mine")], [stroke("theirs")], new Set(["theirs"]));
    expect(result.map((item) => item.id)).toEqual(["mine", "theirs"]);
  });

  it("não duplica um traço de colega que já estava no retrato", () => {
    const result = restoreStrokes(
      [stroke("theirs"), stroke("mine")],
      [stroke("theirs")],
      new Set(["theirs"]),
    );
    expect(result.map((item) => item.id)).toEqual(["theirs", "mine"]);
  });

  it("um traço que eu mesmo apaguei com a borracha volta ao desfazer", () => {
    const result = restoreStrokes([stroke("mine")], [], new Set());
    expect(result.map((item) => item.id)).toEqual(["mine"]);
  });
});
