import { EssayReviewPanel } from "./essay-review-panel";
import { ESSAY_COMPETENCIES, essaySubmissionReview } from "../domain/essay-submission-review";
import { uiText } from "../i18n/runtime";
import { PaperDigits } from "./paper-digits";
import type { ReactNode } from "react";
import { FocusPaperArrow } from "./focus-paper-arrow";

export function EssaySubmissionReport({
  text,
  elapsedSeconds,
  children,
}: {
  text: string;
  elapsedSeconds: number;
  children?: ReactNode;
}) {
  const review = essaySubmissionReview(text);
  const seconds = Math.max(0, Math.floor(elapsedSeconds));
  return (
    <section className="essay-submission-report" aria-label={uiText("Balanço da entrega")}>
      <div className="essay-submission-metrics">
        <div className="essay-submission-score">
          <small>{uiText("Pontuação")}</small>
          <strong>{uiText("Em breve")}</strong>
        </div>
        <div className="essay-submission-time">
          <small>{uiText("Tempo de escrita")}</small>
          <PaperDigits
            value={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
          />
        </div>
      </div>

      <EssayReviewPanel>
        <section className="essay-markings" aria-label={uiText("Marcações")}>
          <h2>{uiText("Marcações")}</h2>
          {review.observations.map((observation) => (
            <p className="essay-submission-observation" key={observation}>
              {uiText(observation)}
            </p>
          ))}
          {review.structuralObservations.length > 0 && (
            <section aria-label={uiText("Organização do texto")}>
              <h3>{uiText("Organização do texto")}</h3>
              <ul className="essay-marking-list">
                {review.structuralObservations.map((observation) => (
                  <li key={observation}>{uiText(observation)}</li>
                ))}
              </ul>
            </section>
          )}
          {children}
          <details className="essay-disclosure">
            <summary>
              <FocusPaperArrow />
              <span>{uiText("Critérios de correção")}</span>
              <small className="essay-coming-soon">{uiText("Em breve")}</small>
            </summary>
            <ol className="essay-competencies">
              {ESSAY_COMPETENCIES.map((competency) => (
                <li key={competency.id}>
                  <strong>
                    {competency.id} · {uiText(competency.title)}
                  </strong>
                  <p>{uiText(competency.description)}</p>
                  <small>
                    {uiText(
                      review.insufficient
                        ? "Não avaliada: texto insuficiente."
                        : "Aguardando análise pedagógica. Nenhuma nota atribuída.",
                    )}
                  </small>
                </li>
              ))}
            </ol>
          </details>
        </section>
      </EssayReviewPanel>
    </section>
  );
}
