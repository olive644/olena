import { expect, it } from "vitest";
import { mergeXpLedgers } from "./xp-ledger";
import { recordRoomXp } from "../data/room-xp";
function awarded(initial: string | null, id: string, xp: number) {
  let raw = initial;
  recordRoomXp(
    { id, xp, place: 1, completedAt: 1 },
    {
      getItem: () => raw,
      setItem: (_key, value) => {
        raw = value;
      },
    },
  );
  return raw!;
}
it("mescla ganhos concorrentes por recibo sem duplicar nem diminuir o total", () => {
  const base = JSON.stringify({ total: 100, receipts: ["old"] });
  const left = awarded(base, "left", 20);
  const right = awarded(base, "right", 30);
  const merged = mergeXpLedgers(base, left, right)!;
  expect(JSON.parse(merged).total).toBe(150);
  expect(JSON.parse(mergeXpLedgers(merged, left, right)!).total).toBe(150);
  expect(JSON.parse(mergeXpLedgers(merged, undefined, undefined)!).total).toBe(150);
  expect(JSON.parse(mergeXpLedgers(merged, undefined, base)!).total).toBe(150);
  expect(mergeXpLedgers(left, right)).toBe(mergeXpLedgers(right, left));
});
it("migra histórico legado sem creditar a mesma recompensa duas vezes", () => {
  const old = JSON.stringify({ total: 100, receipts: ["same"] });
  const modern = awarded(null, "same", 100);
  const merged = mergeXpLedgers(old, modern)!;
  expect(JSON.parse(merged).total).toBe(100);
  expect(JSON.parse(awarded(merged, "same", 100)).total).toBe(100);
  expect(JSON.parse(awarded(merged, "next", 50)).total).toBe(150);
});
