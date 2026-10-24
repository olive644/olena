import { localizeResource, uiText } from "../i18n/runtime.js";
import type { OliverCardId } from "./oliver-cards";

export type OliverArtworkId = OliverCardId | "oliver-star-tarot";
export const OLIVER_TAROT = localizeResource({
  id: "oliver-star-tarot",
  title: uiText("A Estrela"),
  arcana: "XVII",
  get lore() {
    return uiText(2126);
  },
} as const);
