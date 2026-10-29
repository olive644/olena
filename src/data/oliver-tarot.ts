import type { ArcanaId, LegacyCardId } from "./arcana-ids";
import { uiText } from "../i18n/runtime";
export type OliverArtworkId = ArcanaId | LegacyCardId | "oliver-star-tarot";
export const OLIVER_TAROT = {
  id: "major-17" as const,
  get title() {
    return uiText("A Estrela");
  },
  arcana: "XVII",
};
