export const OLIVER_CARDS = [
  {
    id: "first-star",
    title: "A primeira estrela",
    power: 12,
    life: 64,
    stamina: 88,
    chance: 18,
    color: "#247b9d",
    lore: "Oliver encontrou esta estrela no leito seco do rio. Ela vibrou três vezes, como o sino que ainda não conhecia.",
  },
  {
    id: "silent-bell",
    title: "Sino sem eco",
    power: 18,
    life: 78,
    stamina: 62,
    chance: 15,
    color: "#3d5d9e",
    lore: "Na torre, faltava a última batida. O badalo havia caído no rio; o silêncio parecia esperar por uma mão pequena.",
  },
  {
    id: "chalk-map",
    title: "Mapa de giz",
    power: 24,
    life: 58,
    stamina: 92,
    chance: 13,
    color: "#258578",
    lore: "Três pontes, duas margens, um caminho apagado. No mapa de Oliver, a estrela marcou a ponte que ninguém lembrava.",
  },
  {
    id: "split-compass",
    title: "Compasso partido",
    power: 32,
    life: 72,
    stamina: 54,
    chance: 12,
    color: "#9a6534",
    lore: "O compasso do antigo guardião abriu o mapa e se partiu. Uma ponta apontava para a torre; a outra, para o rio.",
  },
  {
    id: "third-bridge",
    title: "A terceira ponte",
    power: 36,
    life: 68,
    stamina: 76,
    chance: 10,
    color: "#2863b0",
    lore: "Oliver atravessou a ponte sem contar os passos. Sob o arco dourado, ouviu a batida perdida seguir a correnteza.",
  },
  {
    id: "glass-seed",
    title: "Semente de vidro",
    power: 16,
    life: 96,
    stamina: 58,
    chance: 9,
    color: "#3b855c",
    lore: "Na outra margem, uma semente guardava a luz da estrela. Oliver a plantou onde a água ainda lembrava o som do sino.",
  },
  {
    id: "long-night",
    title: "Vigília azul",
    power: 28,
    life: 84,
    stamina: 48,
    chance: 8,
    color: "#344974",
    lore: "A lanterna ficou acesa até a última estrela. A pequena árvore de vidro inclinou seus ramos na direção do porto.",
  },
  {
    id: "river-memory",
    title: "Memória do rio",
    power: 22,
    life: 70,
    stamina: 94,
    chance: 6,
    color: "#197f94",
    lore: "Um barco de papel trouxe o badalo. Quem o dobrou deixou apenas três marcas: as mesmas que faltavam no mapa.",
  },
  {
    id: "last-note",
    title: "A última nota",
    power: 42,
    life: 82,
    stamina: 66,
    chance: 5,
    color: "#a07929",
    lore: "Ao voltar à torre, Oliver devolveu o badalo. A terceira batida não veio do sino, mas da estrela em sua mão.",
  },
  {
    id: "homeward",
    title: "Caminho de volta",
    power: 30,
    life: 90,
    stamina: 80,
    chance: 4,
    color: "#b36c3c",
    lore: "O compasso reparado repousa na oficina. À noite, a árvore de vidro soa baixinho. Há uma quarta marca surgindo no mapa.",
  },
] as const;
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
