import { expect, it } from "vitest";
import { checkRateLimit, refundRateLimit } from "./rate-limit";
import { createMemoryRoomStore } from "./room-transaction";

it("permite ate o limite e bloqueia a partir dele, por identidade", async () => {
  const store = createMemoryRoomStore();
  for (let i = 0; i < 3; i++) {
    expect(await checkRateLimit(store, "test-limit", "1.2.3.4", 3, 60)).toBe(true);
  }
  expect(await checkRateLimit(store, "test-limit", "1.2.3.4", 3, 60)).toBe(false);

  expect(await checkRateLimit(store, "test-limit", "5.6.7.8", 3, 60)).toBe(true);
});

it("nao mistura contadores de namespaces diferentes", async () => {
  const store = createMemoryRoomStore();
  for (let i = 0; i < 2; i++) {
    expect(await checkRateLimit(store, "namespace-a", "1.2.3.4", 2, 60)).toBe(true);
  }
  expect(await checkRateLimit(store, "namespace-b", "1.2.3.4", 2, 60)).toBe(true);
});

it("devolve um uso gasto, sem passar de zero e sem tocar em outra pessoa", async () => {
  const store = createMemoryRoomStore();
  expect(await checkRateLimit(store, "dia", "ana", 2, 60)).toBe(true);
  expect(await checkRateLimit(store, "dia", "ana", 2, 60)).toBe(true);
  expect(await checkRateLimit(store, "dia", "ana", 2, 60)).toBe(false);
  await refundRateLimit(store, "dia", "ana", 60);
  // Voltou um uso: cabe mais um, e só um.
  expect(await checkRateLimit(store, "dia", "ana", 2, 60)).toBe(true);
  expect(await checkRateLimit(store, "dia", "ana", 2, 60)).toBe(false);
  // Devolver sem ter gasto nada não cria crédito.
  await refundRateLimit(store, "dia", "bia", 60);
  await refundRateLimit(store, "dia", "bia", 60);
  expect(await checkRateLimit(store, "dia", "bia", 1, 60)).toBe(true);
  expect(await checkRateLimit(store, "dia", "bia", 1, 60)).toBe(false);
});
