import { activeArcanaId, useArcanaCatalog } from "../data/arcana-catalog";
import type { OliverArtworkId } from "../data/oliver-tarot";
import { ArcanaCardPrototype } from "./arcana-card-prototype";
export function OliverCard({
  id,
  back = false,
  thumbnail = false,
}: {
  id: OliverArtworkId;
  back?: boolean;
  thumbnail?: boolean;
}) {
  const { cards: catalog } = useArcanaCatalog();
  const card = catalog.find((c) => c.id === activeArcanaId(id));
  return (
    <ArcanaCardPrototype
      back={back || !card}
      {...(card
        ? {
            title: card.title,
            mark: card.mark,
            art: thumbnail ? card.asset.replace(".webp", "-small.webp") : card.asset,
            description: card.title,
          }
        : {})}
    />
  );
}
