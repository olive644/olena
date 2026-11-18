import { useState } from "react";
import { uiText } from "../i18n/runtime";
import {
  CARD_ORIGINS,
  FEEDBACK_REASONS,
  loadFeedback,
  rejectionRate,
  saveFeedback,
  type CardOrigin,
  type FeedbackReason,
} from "../domain/flashcard-feedback";
import { loadModel, MIN_SAMPLES, resetModel } from "../domain/flashcard-quality";
import "./flashcard-quality-panel.css";

const ORIGIN_LABELS: Record<CardOrigin, () => string> = {
  true: () => uiText("Verdadeiras (frase do texto)"),
  definition: () => uiText("Definição trocada"),
  number: () => uiText("Número ou data trocado"),
  negation: () => uiText("Negação"),
  opposite: () => uiText("Antônimo"),
};
const REASON_LABELS: Record<FeedbackReason, () => string> = {
  nonsense: () => uiText("Sem sentido"),
  obvious: () => uiText("Óbvia demais"),
  "actually-true": () => uiText("Na verdade é verdadeira"),
  grammar: () => uiText("Erro de gramática"),
  loose: () => uiText("Frase solta"),
};

/** Configurações > estudo: como os cartões automáticos estão sendo recebidos neste aparelho. */
export function FlashcardQualityPanel() {
  const [store, setStore] = useState(loadFeedback);
  const [model, setModel] = useState(loadModel);
  const [confirming, setConfirming] = useState(false);
  const rows = CARD_ORIGINS.map((origin) => ({ origin, stats: store[origin] })).filter(
    (row) => row.stats,
  );
  const active = model.samples >= MIN_SAMPLES;

  return (
    <section className="flashcard-quality" aria-labelledby="flashcard-quality-title">
      <h2 id="flashcard-quality-title">{uiText("Qualidade dos flashcards")}</h2>
      <p>
        {uiText(
          "Mostra o que você aceitou, editou e descartou nos flashcards automáticos. Os números ficam só neste aparelho e não guardam nenhum texto.",
        )}
      </p>
      {rows.length === 0 ? (
        <p role="status">
          {uiText("Ainda não há dados. Estude um baralho e use Afirmação ruim ou Editar cartão.")}
        </p>
      ) : (
        <div className="flashcard-quality__scroll">
          <table>
            <caption className="flashcard-quality__caption">
              {uiText("Flashcards por tipo de cartão")}
            </caption>
            <thead>
              <tr>
                <th scope="col">{uiText("Tipo")}</th>
                <th scope="col">{uiText("Aceitos")}</th>
                <th scope="col">{uiText("Editados")}</th>
                <th scope="col">{uiText("Descartados")}</th>
                <th scope="col">{uiText("Rejeição")}</th>
                <th scope="col">{uiText("Motivo mais comum")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ origin, stats }) => {
                const top = FEEDBACK_REASONS.map(
                  (reason) => [reason, stats?.reasons[reason] ?? 0] as const,
                )
                  .sort((a, b) => b[1] - a[1])
                  .find(([, count]) => count > 0);
                return (
                  <tr key={origin}>
                    <th scope="row">{ORIGIN_LABELS[origin]()}</th>
                    <td>{stats?.kept ?? 0}</td>
                    <td>{stats?.edited ?? 0}</td>
                    <td>{stats?.discarded ?? 0}</td>
                    <td>{Math.round(rejectionRate(stats) * 100)}%</td>
                    <td>{top ? REASON_LABELS[top[0]]() : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p role="status">
        {active
          ? uiText(
              "Filtro ativo: cartões parecidos com os que você descarta ficam de fora ({0} avaliações).",
              [String(model.samples)],
            )
          : uiText("Filtro aprendendo: {0} de {1} avaliações para começar a agir.", [
              String(model.samples),
              String(MIN_SAMPLES),
            ])}
      </p>
      {confirming ? (
        <div className="flashcard-quality__actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              saveFeedback({});
              resetModel();
              setStore({});
              setModel(loadModel());
              setConfirming(false);
            }}
          >
            {uiText("Confirmar: zerar contadores e filtro")}
          </button>
          <button type="button" className="secondary-button" onClick={() => setConfirming(false)}>
            {uiText("Cancelar")}
          </button>
        </div>
      ) : (
        <button type="button" className="secondary-button" onClick={() => setConfirming(true)}>
          {uiText("Zerar contadores e filtro")}
        </button>
      )}
    </section>
  );
}
