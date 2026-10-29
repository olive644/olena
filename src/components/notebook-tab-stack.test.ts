import { describe, expect, it } from "vitest";
import { leafOfPage, tabSide, tabsChangingSide } from "./notebook-tab-stack";

describe("pilha de abas do caderno", () => {
  it("cada folha traz duas páginas: 1 e 2 na folha 1, 3 e 4 na folha 2", () => {
    expect([0, 1, 2, 3, 4, 5].map(leafOfPage)).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it("no par aberto, a página da esquerda sai pela esquerda e a da direita, pela direita", () => {
    // Par 1 = páginas 2 e 3 (índices 2 e 3).
    expect(tabSide(2, 1)).toBe("left");
    expect(tabSide(3, 1)).toBe("right");
  });

  it("folhas já viradas ficam na pilha da esquerda e as próximas, na da direita", () => {
    expect(tabSide(1, 3)).toBe("left");
    expect(tabSide(2, 3)).toBe("left");
    expect(tabSide(6, 3)).toBe("left");
    expect(tabSide(7, 3)).toBe("right");
    expect(tabSide(8, 3)).toBe("right");
    expect(tabSide(0, 0)).toBe("left");
    expect(tabSide(1, 0)).toBe("right");
  });

  it("ao virar um par para frente, só as abas das folhas viradas mudam de lado", () => {
    const tabs = [{ pageId: "a" }, { pageId: "b" }, { pageId: "c" }, { pageId: "d" }];
    const ids = ["p0", "a", "b", "c", "d", "e"].map((id) => id);
    const named = [
      { pageId: "p0" },
      { pageId: "a" },
      { pageId: "b" },
      { pageId: "c" },
      { pageId: "d" },
    ];
    // Do par 0 para o 1: a folha 1 (páginas índice 1 e 2) vira.
    expect(tabsChangingSide(named, ids, 0, 1).map((tab) => tab.pageId)).toEqual(["a", "b"]);
    // Voltando, as mesmas.
    expect(tabsChangingSide(named, ids, 1, 0).map((tab) => tab.pageId)).toEqual(["a", "b"]);
    // Um salto de 0 para 2 leva as folhas 1 e 2 juntas.
    expect(tabsChangingSide(tabs, ["a", "b", "c", "d"], 0, 2).length).toBeGreaterThan(0);
    expect(tabsChangingSide(named, ids, 2, 2)).toEqual([]);
  });
});
