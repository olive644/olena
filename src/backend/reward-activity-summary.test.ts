import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { achievementActivities, cardActivities } from "./reward-activity-summary";

const now = Date.parse("2026-10-20T12:00:00Z");
const at = (day: number) => Date.parse(`2026-10-${String(day).padStart(2, "0")}T10:00:00Z`);
const ledger = (chests: unknown[]) =>
  JSON.stringify({ school: { points: 0, receipts: [], chests } });

it("gera um evento por carta na primeira obtenção, sem cópias nem datas inventadas", () => {
  const events = cardActivities(
    ledger([
      {
        id: "x",
        opened: true,
        cards: ["cups-01", "wands-02"],
        revealed: 2,
        revealedAt: [at(12), at(13)],
      },
      {
        id: "y",
        opened: true,
        cards: ["cups-01"],
        revealed: 1,
        revealedAt: [at(10)],
        nota: "segredo",
      },
      {
        id: "z",
        opened: true,
        cards: ["swords-01", "swords-02"],
        revealed: 1,
        revealedAt: [at(11)],
      },
      {
        id: "s",
        opened: true,
        kind: "arcane",
        arcana: "oliver-star-tarot",
        revealed: 1,
        revealedAt: [at(14)],
      },
      { id: "u", opened: false, cards: ["major-01"], revealed: 0 },
      { id: "t", opened: true, cards: ["first-star"], revealed: 1, revealedAt: [at(11)] },
    ]),
    now,
  );
  expect(events.map((e) => [e.ref, e.at]).sort()).toEqual(
    [
      ["cups-01", at(10)],
      ["major-17", at(14)],
      ["swords-01", at(11)],
      ["wands-02", at(13)],
    ].sort(),
  );
  expect(events.find((e) => e.ref === "major-17")).toMatchObject({
    kind: "card",
    value: 1,
    id: createHash("sha256").update("card:major-17").digest("hex").slice(0, 32),
  });
  expect(JSON.stringify(events)).not.toContain("segredo");
  expect(cardActivities("{", now)).toEqual([]);
  expect(cardActivities(null, now)).toEqual([]);
  expect(cardActivities(JSON.stringify({ hacker: { chests: [] } }), now)).toEqual([]);
});
it("com mais de 1000 baús preserva a data realmente mais antiga", () => {
  const filler = Array.from({ length: 1200 }, (_, i) => ({
    id: String(i),
    opened: true,
    cards: ["wands-03"],
    revealed: 1,
    revealedAt: [at(15) + i],
  }));
  const chests = [
    { id: "old", opened: true, cards: ["cups-05"], revealed: 1, revealedAt: [at(1)] },
    ...filler,
    { id: "new", opened: true, cards: ["cups-05"], revealed: 1, revealedAt: [at(18)] },
  ];
  expect(cardActivities(ledger(chests), now).find((e) => e.ref === "cups-05")?.at).toBe(at(1));
  // Acima do teto explícito de baús não há eventos, em vez de inventar uma primeira data.
  expect(cardActivities(ledger(Array.from({ length: 5001 }, () => chests[1])), now)).toEqual([]);
  expect(cardActivities(" ".repeat(5_000_001), now)).toEqual([]);
});
it("carta com alguma cópia sem data conhecida não vira evento", () => {
  const events = cardActivities(
    ledger([
      {
        id: "a",
        opened: true,
        cards: ["cups-01", "cups-02"],
        revealed: 2,
        revealedAt: [null, at(12)],
      },
      { id: "b", opened: true, cards: ["cups-01"], revealed: 1, revealedAt: [at(13)] },
    ]),
    now,
  );
  expect(events.map((e) => e.ref)).toEqual(["cups-02"]);
});
it("revealed fora de 0..tamanho ou baú incoerente não expõe carta nem gera evento", () => {
  const good = { id: "g", opened: true, cards: ["cups-01"], revealed: 1, revealedAt: [at(10)] };
  for (const bad of [
    {
      id: "n",
      opened: true,
      cards: ["wands-01", "wands-02"],
      revealed: -1,
      revealedAt: [at(1), at(2)],
    },
    { id: "e", opened: true, cards: ["wands-01"], revealed: 2, revealedAt: [at(1), at(2)] },
    { id: "f", opened: true, cards: ["wands-01"], revealed: 0.5, revealedAt: [at(1)] },
    {
      id: "k",
      opened: true,
      cards: ["wands-01"],
      arcana: "major-17",
      revealed: 1,
      revealedAt: [at(1)],
    },
    { id: "m", opened: true, kind: "arcane", arcana: "major-05", revealed: 1, revealedAt: [at(1)] },
    {
      id: "c",
      opened: true,
      kind: "arcane",
      cards: ["wands-01"],
      revealed: 1,
      revealedAt: [at(1)],
    },
    {
      id: "l",
      opened: true,
      cards: ["wands-01", "wands-02", "wands-03"],
      revealed: 3,
      revealedAt: [at(1)],
    },
    { id: "q", opened: true, cards: ["inexistente"], revealed: 1, revealedAt: [at(1)] },
  ])
    expect(cardActivities(ledger([good, bad]), now)).toEqual([]);
  expect(cardActivities(ledger([good]), now).map((e) => e.ref)).toEqual(["cups-01"]);
});
it("conquistas só geram evento com data comprovada e ID conhecido", () => {
  const events = achievementActivities(
    { "correct-1": true, "correct-10": true, desconhecida: true } as Record<string, true>,
    { "correct-1": "2026-10-10T10:00:00Z", desconhecida: "2026-10-10T10:00:00Z" },
    now,
  );
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ kind: "achievement", ref: "correct-1", value: 1 });
  expect(
    achievementActivities({ "correct-1": true }, { "correct-1": "2099-01-01T00:00:00Z" }, now),
  ).toEqual([]);
  expect(achievementActivities(undefined, undefined, now)).toEqual([]);
});
