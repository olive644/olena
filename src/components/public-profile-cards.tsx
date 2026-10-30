import { useState } from "react";
import type { SocialProfile } from "../domain/profile-social";
import { activeArcanaId, useArcanaCatalog, type ArcanaId } from "../data/arcana-catalog";
import { effectiveCardFavorites } from "../domain/arcana-profile";
import { uiText } from "../i18n/runtime";
import { OliverCard, ArcanaRarity } from "./oliver-card";
import { OliverCardInspection } from "./oliver-card-inspection";
import { LibraryDialog } from "./library-dialog";
import { RewardDate } from "./reward-date";
import { HelenaLoading } from "./helena-loading";
import "./profile-cards.css";

export function PublicProfileCards({
  person,
}: {
  person: Pick<SocialProfile, "cards" | "cardDates" | "cardFavorites">;
}) {
  const { cards, error, retry } = useArcanaCatalog();
  const [selected, setSelected] = useState<ArcanaId>();
  const visible = effectiveCardFavorites(
    person.cardFavorites,
    new Set(person.cards ?? []),
    person.cards ?? [],
  ).flatMap((id) => activeArcanaId(id) ?? []);
  if (!visible.length) return null;
  const current = cards.find((card) => card.id === selected);
  return (
    <section
      className="profile-cards public-profile-cards"
      aria-label={uiText("Cartas destacadas")}
    >
      <header>
        <h2>{uiText("Arcano")}</h2>
      </header>
      {!cards.length && !error && <HelenaLoading compact />}
      {error && (
        <p role="alert">
          {uiText("Não foi possível carregar o baralho.")}{" "}
          <button onClick={retry}>{uiText("Tentar novamente")}</button>
        </p>
      )}
      <div className="profile-cards__featured">
        {visible.map((id) => {
          const card = cards.find((item) => item.id === id);
          return (
            card && (
              <button
                className="profile-cards__tile"
                key={id}
                onClick={() => setSelected(id)}
                aria-label={uiText("Inspecionar carta {0}", [card.title])}
              >
                <span className="profile-cards__miniature">
                  <OliverCard id={id} thumbnail />
                </span>
                <strong>{card.title}</strong>
                <ArcanaRarity id={id} />
              </button>
            )
          );
        })}
      </div>
      {selected && current && (
        <LibraryDialog title={current.title} onClose={() => setSelected(undefined)}>
          <OliverCardInspection id={selected} />
          <p className="profile-cards__date">
            <span>{uiText("Obtida em")}</span>
            <RewardDate at={person.cardDates?.[selected]} />
          </p>
        </LibraryDialog>
      )}
    </section>
  );
}
