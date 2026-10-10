import type { OliverCardId } from "./oliver-cards";

export type OliverArtworkId = OliverCardId | "oliver-star-tarot";
export const OLIVER_TAROT = {
  id: "oliver-star-tarot",
  title: "A Estrela",
  arcana: "XVII",
  lore: "O sino encontrou sua terceira nota. Oliver devolveu ao rio a luz que guardava: uma corrente acordou as raízes, a outra mostrou o caminho de volta. Nenhuma estrela precisava ser sua para iluminar alguém.",
} as const;
