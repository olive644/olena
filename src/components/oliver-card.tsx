import { uiText, useLanguage } from "../i18n/runtime";
import type { CSSProperties } from "react";
import { OLIVER_CARDS } from "../data/oliver-cards";
import { OLIVER_TAROT, type OliverArtworkId } from "../data/oliver-tarot";
import { OliverAttributeIcon } from "./oliver-card-icons";
import { PaperDigits } from "./paper-digits";
import { PaperCardTitle } from "./paper-card-title";
import { COSMIC_RARITIES, oliverRarity } from "../data/oliver-rarity";
export function OliverCard({ id, back = false }: { id: OliverArtworkId; back?: boolean }) {
  useLanguage();

  const card = OLIVER_CARDS.find((item) => item.id === id)!;
  const rarity = COSMIC_RARITIES[oliverRarity(id)]!;
  if (back)
    return (
      <div
        className={`oliver-card-back${id === OLIVER_TAROT.id ? " oliver-tarot-back" : ""}`}
        aria-hidden="true"
        onDragStart={(event) => event.preventDefault()}
      >
        <div className="oliver-back-orbit">
          <img src="/olena-favicon-180.png" alt="" width="180" height="180" draggable={false} />
        </div>
        <span>{uiText(784)}</span>
        <i className="oliver-back-star" />
      </div>
    );
  if (id === OLIVER_TAROT.id)
    return (
      <article
        className="oliver-card-front oliver-tarot-front"
        aria-label={uiText(785)}
        onDragStart={(event) => event.preventDefault()}
      >
        <div className="oliver-tarot-crown">
          <span aria-hidden="true">✦</span>
          <PaperCardTitle value={OLIVER_TAROT.arcana} />
          <span aria-hidden="true">✦</span>
        </div>
        <img
          className="oliver-card-art"
          src="/oliver-cards/oliver-star-tarot.webp"
          srcSet="/oliver-cards/oliver-star-tarot-small.webp 480w, /oliver-cards/oliver-star-tarot.webp 720w"
          sizes="330px"
          alt={uiText(786)}
          width="720"
          height="1080"
          decoding="async"
          draggable={false}
        />
        <h2>
          <PaperCardTitle value={OLIVER_TAROT.title} />
        </h2>
        <p className="oliver-card-lore">{OLIVER_TAROT.lore}</p>
        <span className="oliver-tarot-seal">{uiText(787)}</span>
      </article>
    );
  return (
    <article
      className="oliver-card-front"
      style={
        {
          "--card-accent": card.color,
          "--card-rarity": rarity.color,
          "--card-rarity-light": rarity.light,
        } as CSSProperties
      }
      aria-label={card.title}
      onDragStart={(event) => event.preventDefault()}
    >
      <span className="oliver-card-rarity" aria-label={uiText(1877, [rarity.name.toLowerCase()])}>
        {rarity.name.toUpperCase()}
      </span>
      <span className="oliver-card-edition">
        {uiText(788)} {String(OLIVER_CARDS.indexOf(card) + 1).padStart(2, "0")}
      </span>
      <img
        className="oliver-card-art"
        src={`/oliver-cards/${id}.webp`}
        srcSet={`/oliver-cards/${id}-small.webp 480w, /oliver-cards/${id}.webp 720w`}
        sizes="330px"
        alt={uiText(1878, [card.title])}
        width="720"
        height="1080"
        decoding="async"
        draggable={false}
      />
      <dl className="oliver-card-stats">
        <div>
          <OliverAttributeIcon kind="power" />
          <dt>{uiText(789)}</dt>
          <dd>
            <PaperDigits value={String(card.power)} />
          </dd>
        </div>
        <div>
          <OliverAttributeIcon kind="life" />
          <dt>{uiText(790)}</dt>
          <dd>
            <PaperDigits value={String(card.life)} />
          </dd>
        </div>
        <div>
          <OliverAttributeIcon kind="stamina" />
          <dt>{uiText(791)}</dt>
          <dd>
            <PaperDigits value={String(card.stamina)} />
          </dd>
        </div>
      </dl>
      <h2>
        <PaperCardTitle value={card.title} />
      </h2>
      <p className="oliver-card-lore">{card.lore}</p>
    </article>
  );
}
