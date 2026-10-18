export const XP_LEDGER_KEY = "helena.room-xp.v1";
export type XpLedger = {
  total: number;
  receipts: string[];
  legacy: number;
  legacyReceipts: string[];
  rewards: Record<string, number>;
};
export function parseXpLedger(raw: string | null | undefined): XpLedger | undefined {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || !("total" in value) || !("receipts" in value))
      return;
    if (
      typeof value.total !== "number" ||
      !Number.isSafeInteger(value.total) ||
      value.total < 0 ||
      !Array.isArray(value.receipts) ||
      !value.receipts.every((id) => typeof id === "string")
    )
      return;
    const receipts: string[] = value.receipts;
    const rewards: Record<string, number> = {};
    if ("rewards" in value) {
      if (!value.rewards || typeof value.rewards !== "object" || Array.isArray(value.rewards))
        return;
      for (const [id, amount] of Object.entries(value.rewards)) {
        if (
          !value.receipts.includes(id) ||
          typeof amount !== "number" ||
          !Number.isSafeInteger(amount) ||
          amount < 0 ||
          amount > 10000
        )
          return;
        rewards[id] = amount;
      }
    }
    const sum = Object.values(rewards).reduce((a, b) => a + b, 0);
    if (!Number.isSafeInteger(sum) || sum > value.total) return;
    const legacyReceipts = "legacyReceipts" in value ? value.legacyReceipts : value.receipts;
    if (
      !Array.isArray(legacyReceipts) ||
      !legacyReceipts.every((id) => typeof id === "string" && receipts.includes(id))
    )
      return;
    return {
      total: value.total,
      receipts: [...new Set(value.receipts)],
      legacy: value.total - sum,
      legacyReceipts,
      rewards,
    };
  } catch {
    return;
  }
}
export function mergeXpLedgers(...values: (string | null | undefined)[]): string | undefined {
  const ledgers = values.map(parseXpLedger).filter((value): value is XpLedger => Boolean(value));
  if (!ledgers.length) return;
  const legacyReceipts = [...new Set(ledgers.flatMap((ledger) => ledger.legacyReceipts))].sort();
  const rewards: Record<string, number> = {};
  for (const ledger of ledgers)
    for (const [id, amount] of Object.entries(ledger.rewards))
      if (!legacyReceipts.includes(id)) rewards[id] = Math.max(rewards[id] ?? 0, amount);
  const sum = Object.values(rewards).reduce((a, b) => a + b, 0);
  const total = Math.min(
    Number.MAX_SAFE_INTEGER,
    Math.max(
      ...ledgers.map((ledger) => ledger.total),
      Math.max(...ledgers.map((ledger) => ledger.legacy)) + sum,
    ),
  );
  return JSON.stringify({
    total,
    receipts: [...new Set(ledgers.flatMap((ledger) => ledger.receipts))].sort(),
    legacy: total - sum,
    legacyReceipts,
    rewards: Object.fromEntries(Object.entries(rewards).sort(([a], [b]) => a.localeCompare(b))),
  });
}
