import { activeArcanaId, useArcanaCatalog } from "../data/arcana-catalog";
import type { OliverArtworkId } from "../data/oliver-tarot";
import { ArcanaCardPrototype } from "./arcana-card-prototype";
import { memo, type CSSProperties } from "react";
import { COSMIC_RARITIES, oliverRarity } from "../data/oliver-rarity";
import { ArcanaIcon } from "./arcana-icon";
export const OliverCard = memo(function OliverCard({
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
      lazy={thumbnail}
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
});

export function ArcanaRarity({ id }: { id: OliverArtworkId }) {
  const rank = oliverRarity(id);
  const rarity = COSMIC_RARITIES[rank]!;
  return (
    <span
      className="arcana-rarity"
      data-rarity={rank}
      style={
        {
          "--arcana-rarity-color": rarity.color,
          "--arcana-rarity-shade": rarity.shade,
        } as CSSProperties
      }
    >
      <ArcanaIcon name="rarity" />
      {rarity.name}
    </span>
  );
}
