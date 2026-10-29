import type { OliverArtworkId } from "./oliver-tarot";
import { activeArcanaId } from "./arcana-ids";
import { localizeResource } from "../i18n/runtime.js";
export const COSMIC_RARITIES = localizeResource([
  { name: "Comum", color: "#6d28d9", shade: "#342044", light: "#dbc6ff" },
  { name: "Rara", color: "#6d28d9", shade: "#342044", light: "#dbc6ff" },
  { name: "Épica", color: "#8b5cf6", shade: "#51259b", light: "#dcc6ff" },
  { name: "Lendária", color: "#facc15", shade: "#59420a", light: "#fff1b7" },
] as const);
export function oliverRarity(id: OliverArtworkId) {
  const active = activeArcanaId(id);
  return active === "major-17" ? 3 : active?.startsWith("major-") ? 2 : 0;
}
