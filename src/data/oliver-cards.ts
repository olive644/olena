import { localizeResource, uiText } from "../i18n/runtime.js";
export const OLIVER_CARDS = localizeResource([
  {
    id: "first-star",
    title: uiText("A primeira estrela"),
    power: 12,
    life: 64,
    stamina: 88,
    chance: 18,
    color: "#247b9d",
    get lore() {
      return uiText(2110);
    },
  },
  {
    id: "silent-bell",
    title: uiText("Sino sem eco"),
    power: 18,
    life: 78,
    stamina: 62,
    chance: 15,
    color: "#3d5d9e",
    get lore() {
      return uiText(2112);
    },
  },
  {
    id: "chalk-map",
    title: uiText("Mapa de giz"),
    power: 24,
    life: 58,
    stamina: 92,
    chance: 13,
    color: "#258578",
    get lore() {
      return uiText(2113);
    },
  },
  {
    id: "split-compass",
    title: uiText("Compasso partido"),
    power: 32,
    life: 72,
    stamina: 54,
    chance: 12,
    color: "#9a6534",
    get lore() {
      return uiText(2114);
    },
  },
  {
    id: "third-bridge",
    title: uiText("A terceira ponte"),
    power: 36,
    life: 68,
    stamina: 76,
    chance: 10,
    color: "#2863b0",
    get lore() {
      return uiText(2115);
    },
  },
  {
    id: "glass-seed",
    title: uiText("Semente de vidro"),
    power: 16,
    life: 96,
    stamina: 58,
    chance: 9,
    color: "#3b855c",
    get lore() {
      return uiText(2116);
    },
  },
  {
    id: "long-night",
    title: uiText("Vigília azul"),
    power: 28,
    life: 84,
    stamina: 48,
    chance: 8,
    color: "#344974",
    get lore() {
      return uiText(2118);
    },
  },
  {
    id: "river-memory",
    title: uiText("Memória do rio"),
    power: 22,
    life: 70,
    stamina: 94,
    chance: 6,
    color: "#197f94",
    get lore() {
      return uiText(2120);
    },
  },
  {
    id: "last-note",
    title: uiText("A última nota"),
    power: 42,
    life: 82,
    stamina: 66,
    chance: 5,
    color: "#a07929",
    get lore() {
      return uiText(2122);
    },
  },
  {
    id: "homeward",
    title: uiText("Caminho de volta"),
    power: 30,
    life: 90,
    stamina: 80,
    chance: 4,
    color: "#b36c3c",
    get lore() {
      return uiText(2123);
    },
  },
] as const);
export type OliverCardId = (typeof OLIVER_CARDS)[number]["id"];
export function isOliverCard(value: unknown): value is OliverCardId {
  return OLIVER_CARDS.some((card) => card.id === value);
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
export function drawOliverCards(random = randomCardRoll): OliverCardId[] {
  const count = roll(random) < 0.8 ? 1 : 2;
  return Array.from({ length: count }, () => {
    const sample = roll(random) * 100;
    let total = 0;
    for (const card of OLIVER_CARDS) {
      total += card.chance;
      if (sample < total) return card.id;
    }
    return OLIVER_CARDS[OLIVER_CARDS.length - 1]!.id;
  });
}
