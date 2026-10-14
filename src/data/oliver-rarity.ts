import { OLIVER_CARDS } from "./oliver-cards";
import { OLIVER_TAROT, type OliverArtworkId } from "./oliver-tarot";

export const COSMIC_RARITIES = [
  { name: "Comum", color: "#2d8a67", shade: "#174b3b", light: "#a6e6bd" },
  { name: "Rara", color: "#4070c9", shade: "#213f74", light: "#b6d7ff" },
  { name: "Épica", color: "#7c3aed", shade: "#51259b", light: "#dcc6ff" },
  { name: "Lendária", color: "#facc15", shade: "#59420a", light: "#fff1b7" },
] as const;
export function oliverRarity(id: OliverArtworkId) {
  if (id === OLIVER_TAROT.id) return 3;
  const index = OLIVER_CARDS.findIndex((card) => card.id === id);
  return index < 4 ? 0 : index < 7 ? 1 : 2;
}
