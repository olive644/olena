import type { CSSProperties } from "react";
import { OLIVER_CARDS, type OliverCardId } from "../data/oliver-cards";
export function OliverCard({ id, back = false }: { id: OliverCardId; back?: boolean }) {
  const card = OLIVER_CARDS.find((item) => item.id === id)!;
  if (back)
    return (
      <div className="oliver-card-back" aria-hidden="true">
        <div className="oliver-back-orbit">
          <img src="/olena-favicon-180.png" alt="" width="180" height="180" />
        </div>
        <span>OLENA</span>
        <i className="oliver-back-star" />
      </div>
    );
  return (
    <article
      className="oliver-card-front"
      style={{ "--card-accent": card.color } as CSSProperties}
      aria-label={card.title}
    >
      <header>
        <small>Oliver · Comum</small>
        <h2>{card.title}</h2>
      </header>
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
          <dt>Poder</dt>
          <dd>{card.power}</dd>
        </div>
        <div>
          <dt>Vida</dt>
          <dd>{card.life}</dd>
        </div>
        <div>
          <dt>Stamina</dt>
          <dd>{card.stamina}</dd>
        </div>
      </dl>
      <p className="oliver-card-lore">{card.lore}</p>
    </article>
  );
}
