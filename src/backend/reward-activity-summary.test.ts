import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { achievementActivities, cardActivities } from "./reward-activity-summary";

const now = Date.parse("2026-10-20T12:00:00Z");
const at = (day: number) => Date.parse(`2026-10-${day}T10:00:00Z`);
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
      { id: "w", opened: true, cards: ["pentacles-01"], revealed: 1, revealedAt: [null] },
      { id: "v", opened: true, cards: ["pentacles-02"], revealed: 1, revealedAt: [at(25)] },
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
