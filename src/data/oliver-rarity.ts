import type { OliverArtworkId } from "./oliver-tarot";
import { activeArcanaId } from "./arcana-ids";
import { localizeResource } from "../i18n/runtime.js";
export const COSMIC_RARITIES = localizeResource([
  { name: "Comum", color: "#57a87c", shade: "#174b3b", light: "#c2ead2" },
  { name: "Rara", color: "#6e9fe8", shade: "#213f74", light: "#c9ddff" },
  { name: "Épica", color: "#8b5cf6", shade: "#51259b", light: "#dcc6ff" },
  { name: "Lendária", color: "#facc15", shade: "#59420a", light: "#fff1b7" },
] as const);
export function oliverRarity(id: OliverArtworkId) {
  const active = activeArcanaId(id);
  return active === "major-17" ? 3 : active?.startsWith("major-") ? 2 : 0;
}
