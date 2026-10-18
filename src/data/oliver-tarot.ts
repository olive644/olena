import { localizeResource, uiText } from "../i18n/runtime.js";
import type { OliverCardId } from "./oliver-cards";

export type OliverArtworkId = OliverCardId | "oliver-star-tarot";
export const OLIVER_TAROT = localizeResource({
  id: "oliver-star-tarot",
  title: uiText("A Estrela"),
  arcana: "XVII",
  lore: "O sino encontrou sua terceira nota. Oliver devolveu ao rio a luz que guardava: uma corrente acordou as raízes, a outra mostrou o caminho de volta. Nenhuma estrela precisava ser sua para iluminar alguém.",
} as const);
