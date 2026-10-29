import {
  ARCANA_IDS,
  isArcanaId,
  isLegacyCard,
  type ArcanaId,
  type LegacyCardId,
} from "./arcana-ids";
export const OLIVER_CARDS = ARCANA_IDS.filter((id) => id !== "major-17").map((id) => ({
  id,
  chance: 100 / 77,
}));
export type OliverCardId = ArcanaId | LegacyCardId;
export function isOliverCard(value: unknown): value is OliverCardId {
  return isArcanaId(value) || isLegacyCard(value);
}
export function randomCardRoll() {
  const sample = new Uint32Array(1);
  crypto.getRandomValues(sample);
  return sample[0]! / 4294967296;
}
function roll(random: () => number) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Sorteio inválido.");
  return value;
}
export function drawOliverCards(random = randomCardRoll): ArcanaId[] {
  const count = roll(random) < 0.8 ? 1 : 2;
  return Array.from(
    { length: count },
    () => OLIVER_CARDS[Math.floor(roll(random) * OLIVER_CARDS.length)]!.id,
  );
}
