import type { OliverArtworkId } from "../data/oliver-tarot";
import { activeArcanaId, useArcanaCatalog } from "../data/arcana-catalog";
import { useTarotMeaning } from "../hooks/use-tarot-meaning";
import { uiText } from "../i18n/runtime";
import { OliverCard } from "./oliver-card";
import { PaperArtInspection } from "./paper-art-inspection";
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
        artwork={<OliverCard id={id} />}
        backArtwork={<OliverCard id={id} back />}
      />
      {!compact && card && (
        <aside className="arcana-interpretation">
          <span className="arcana-eyebrow">
            {uiText(card.group === "major" ? "Arcano maior" : "Arcano menor")}
          </span>
          <h3>{card.title}</h3>
          <p>{card.meaning}</p>
          <p>{card.characters.join(" · ")}</p>
          {meaning?.value ? (
            <>
              <h4>{uiText("Significado")}</h4>
              <p lang="pt-BR">{meaning.value.upright}</p>
              <h4>{uiText("Invertida")}</h4>
              <p lang="pt-BR">{meaning.value.reversed}</p>
              <details>
                <summary>{uiText("Simbolismo tradicional")}</summary>
                {meaning.value.description.split("\n").map((paragraph, index) => (
                  <p lang="pt-BR" key={index}>
                    {paragraph}
                  </p>
                ))}
              </details>
            </>
          ) : (
            <p role="status">
              {uiText(meaning ? "Texto indisponível no momento." : "Carregando significados…")}
            </p>
          )}
          <small>
            {uiText(
              "Fonte: A. E. Waite, The Pictorial Key to the Tarot (1910), via tarot-api. Tradução para o português do Brasil.",
            )}
          </small>
        </aside>
      )}
    </div>
  );
}
