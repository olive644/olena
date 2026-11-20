import { describe, expect, it } from "vitest";
import { adjustBudget, readBudgetUsed, reserveBudget } from "./neuron-budget";
import { createMemoryRoomStore } from "./room-transaction";

const DAY = 86_400;

describe("contador de gasto em neurons", () => {
  it("reserva até o teto e recusa o que passa dele", async () => {
    const store = createMemoryRoomStore();
    expect(await reserveBudget(store, "b", "ana", 100, 250, DAY)).toEqual({ ok: true, used: 100 });
    expect(await reserveBudget(store, "b", "ana", 100, 250, DAY)).toEqual({ ok: true, used: 200 });
    expect(await reserveBudget(store, "b", "ana", 100, 250, DAY)).toEqual({ ok: false, used: 200 });
    // outra pessoa e outro contador não são afetados
    expect((await reserveBudget(store, "b", "bia", 100, 250, DAY)).ok).toBe(true);
    expect((await reserveBudget(store, "outro", "ana", 100, 250, DAY)).ok).toBe(true);
    expect(await readBudgetUsed(store, "b", "ana", DAY)).toBe(200);
  });

  it("soma centésimos sem erro de ponto flutuante", async () => {
    const store = createMemoryRoomStore();
    for (let i = 0; i < 30; i += 1) await reserveBudget(store, "b", "ana", 0.1, 100, DAY);
    expect(await readBudgetUsed(store, "b", "ana", DAY)).toBe(3);
  });

  it("devolve o que sobrou da reserva e nunca passa de zero", async () => {
    const store = createMemoryRoomStore();
    await reserveBudget(store, "b", "ana", 140, 500, DAY);
    // o pedido gastou 20 de verdade: devolve 120
    await adjustBudget(store, "b", "ana", 20 - 140, DAY);
    expect(await readBudgetUsed(store, "b", "ana", DAY)).toBe(20);
    await adjustBudget(store, "b", "ana", -999, DAY);
    expect(await readBudgetUsed(store, "b", "ana", DAY)).toBe(0);
    // acertar para cima (gasto maior que a reserva) também vale
    await adjustBudget(store, "b", "ana", 15.5, DAY);
    expect(await readBudgetUsed(store, "b", "ana", DAY)).toBe(15.5);
  });

  it("devolver sem ter gasto nada não cria crédito", async () => {
    const store = createMemoryRoomStore();
    await adjustBudget(store, "b", "ana", -50, DAY);
    expect(await readBudgetUsed(store, "b", "ana", DAY)).toBe(0);
    expect((await reserveBudget(store, "b", "ana", 100, 100, DAY)).ok).toBe(true);
    expect((await reserveBudget(store, "b", "ana", 1, 100, DAY)).ok).toBe(false);
  });

  it("pedidos em paralelo nunca passam do teto juntos", async () => {
    const store = createMemoryRoomStore();
    const results = await Promise.all(
      Array.from({ length: 30 }, () => reserveBudget(store, "b", "ana", 40, 250, DAY)),
    );
    const accepted = results.filter((result) => result.ok).length;
    expect(accepted).toBe(6);
    expect(await readBudgetUsed(store, "b", "ana", DAY)).toBe(240);
  });

  it("a identidade é guardada em hash, nunca em claro", async () => {
    const store = createMemoryRoomStore();
    await reserveBudget(store, "b", "ana@exemplo.com", 10, 100, DAY);
    const snapshot = JSON.stringify(store);
    expect(snapshot).not.toContain("ana@exemplo.com");
  });
});
