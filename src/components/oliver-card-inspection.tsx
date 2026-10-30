import type { OliverArtworkId } from "../data/oliver-tarot";
import { activeArcanaId, useArcanaCatalog } from "../data/arcana-catalog";
import { useTarotMeaning } from "../hooks/use-tarot-meaning";
import { uiText } from "../i18n/runtime";
import { OliverCard, ArcanaRarity } from "./oliver-card";
import { PaperArtInspection } from "./paper-art-inspection";
import { ArcanaIcon } from "./arcana-icon";
import { ArcanaRadiance } from "./arcana-radiance";
import { HelenaLoading } from "./helena-loading";
export function OliverCardInspection({
  id,
  compact = false,
}: {
  id: OliverArtworkId;
  compact?: boolean;
}) {
  const { cards: catalog } = useArcanaCatalog();
  const card = catalog.find((c) => c.id === activeArcanaId(id));
  const meaning = useTarotMeaning(compact ? undefined : card?.apiId);
  return (
    <div className={compact ? "arcana-inspection is-compact" : "arcana-inspection"}>
      <PaperArtInspection
        compact={compact}
        artwork={
          <ArcanaRadiance key={id} id={id}>
            <OliverCard id={id} />
          </ArcanaRadiance>
        }
        backArtwork={<OliverCard id={id} back />}
      />
      {!compact && card && (
        <aside className="arcana-interpretation">
          <header className="arcana-interpretation__heading">
            <span className="arcana-eyebrow">
              <ArcanaIcon name={card.group === "major" ? "major" : "minor"} />
              {uiText(card.group === "major" ? "Arcano maior" : "Arcano menor")}
            </span>
            <h3>{card.title}</h3>
            <ArcanaRarity id={card.id} />
          </header>
          <p>{card.meaning}</p>
          <p className="arcana-interpretation__characters">
            <ArcanaIcon name="characters" />
            <span>
              <span className="visually-hidden">{uiText("Personagens")}: </span>
              {card.characters.join(" · ")}
            </span>
          </p>
          {meaning?.value ? (
            <>
              <section className="arcana-interpretation__topic">
                <h4>
                  <ArcanaIcon name="meaning" />
                  {uiText("Significado")}
                </h4>
                <p lang="pt-BR">{meaning.value.upright}</p>
              </section>
              <section className="arcana-interpretation__topic">
                <h4>
                  <ArcanaIcon name="reversed" />
                  {uiText("Invertida")}
                </h4>
                <p lang="pt-BR">{meaning.value.reversed}</p>
              </section>
              <details>
                <summary>
                  <ArcanaIcon name="symbolism" />
                  {uiText("Simbolismo tradicional")}
                </summary>
                {meaning.value.description.split("\n").map((paragraph, index) => (
                  <p lang="pt-BR" key={index}>
                    {paragraph}
                  </p>
                ))}
              </details>
            </>
          ) : (
            <div role="status">
              {meaning ? (
                uiText("Texto indisponível no momento.")
              ) : (
                <HelenaLoading compact label={uiText("Carregando significados…")} />
              )}
            </div>
          )}
          <small className="arcana-interpretation__source">
            <ArcanaIcon name="source" />
            <span>
              {uiText(
                "Fonte: A. E. Waite, The Pictorial Key to the Tarot (1910), via tarot-api. Tradução para o português do Brasil.",
              )}
            </span>
          </small>
        </aside>
      )}
    </div>
  );
}
