import type { CSSProperties } from "react";
import { OLIVER_CARDS } from "../data/oliver-cards";
import { OLIVER_TAROT, type OliverArtworkId } from "../data/oliver-tarot";
import { OliverAttributeIcon } from "./oliver-card-icons";
import { PaperDigits } from "./paper-digits";
import { PaperCardTitle } from "./paper-card-title";
export function OliverCard({ id, back = false }: { id: OliverArtworkId; back?: boolean }) {
  const card = OLIVER_CARDS.find((item) => item.id === id)!;
  if (back)
    return (
      <div
        className={`oliver-card-back${id === OLIVER_TAROT.id ? " oliver-tarot-back" : ""}`}
        aria-hidden="true"
      >
        <div className="oliver-back-orbit">
          <img src="/olena-favicon-180.png" alt="" width="180" height="180" />
        </div>
        <span>OLENA</span>
        <i className="oliver-back-star" />
      </div>
    );
  if (id === OLIVER_TAROT.id)
    return (
      <article className="oliver-card-front oliver-tarot-front" aria-label="XVII, A Estrela">
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
          alt="Oliver devolve a luz ao rio sob oito estrelas de papel"
          width="720"
          height="1080"
          decoding="async"
        />
        <h2>
          <PaperCardTitle value={OLIVER_TAROT.title} />
        </h2>
        <p className="oliver-card-lore">{OLIVER_TAROT.lore}</p>
        <span className="oliver-tarot-seal">OLENA · ARCANO XVII</span>
      </article>
    );
  return (
    <article
      className="oliver-card-front"
      style={{ "--card-accent": card.color } as CSSProperties}
      aria-label={card.title}
    >
      <span className="oliver-card-rarity" aria-label="Raridade comum">
        COMUM
      </span>
      <img
        className="oliver-card-art"
        src={`/oliver-cards/${id}.webp`}
        srcSet={`/oliver-cards/${id}-small.webp 480w, /oliver-cards/${id}.webp 720w`}
        sizes="330px"
        alt={`Oliver em ${card.title}`}
        width="720"
        height="1080"
        decoding="async"
      />
      <dl className="oliver-card-stats">
        <div>
          <OliverAttributeIcon kind="power" />
          <dt>Poder</dt>
          <dd>
            <PaperDigits value={String(card.power)} />
          </dd>
        </div>
        <div>
          <OliverAttributeIcon kind="life" />
          <dt>Vida</dt>
          <dd>
            <PaperDigits value={String(card.life)} />
          </dd>
        </div>
        <div>
          <OliverAttributeIcon kind="stamina" />
          <dt>Stamina</dt>
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
