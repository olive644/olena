import { useEffect, useState } from "react";
import {
  loadQuestionReviewBundle,
  validateQuestionReview,
  type SavedQuestionReview,
} from "../data/enem-question-review";
import { uiText } from "../i18n/runtime";
import { HelenaLoading } from "./helena-loading";
import { PaperDigits } from "./paper-digits";

export function EnemQuestionExplanation({
  variantId,
  paperUrl,
  questionKey,
  officialAnswer,
  selected,
}: {
  variantId: string;
  paperUrl: string;
  questionKey: string;
  officialAnswer: string | undefined;
  selected: string | undefined;
}) {
  const [saved, setSaved] = useState<SavedQuestionReview | null>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void loadQuestionReviewBundle(variantId, paperUrl)
      .then((bundle) => {
        const item = bundle?.questions[questionKey];
        if (active)
          setSaved(officialAnswer && validateQuestionReview(item, officialAnswer) ? item : null);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [variantId, paperUrl, questionKey, officialAnswer, revision]);
  const solution = saved?.solution;
  const stats = saved?.statistics;
  const rate =
    stats && officialAnswer && /^[A-E]$/.test(officialAnswer)
      ? Math.round((1000 * stats.counts[officialAnswer]!) / stats.population) / 10
      : undefined;
  return (
    <div className="enem-question-analysis">
      {saved === undefined && !failed && (
        <HelenaLoading compact label={uiText("Carregando revisão salva")} />
      )}
      {failed && (
        <div role="alert">
          <p>{uiText("Não foi possível carregar o conteúdo salvo.")}</p>
          <button
            className="shelf-wood-button"
            onClick={() => {
              setFailed(false);
              setRevision((value) => value + 1);
            }}
          >
            {uiText("Tentar novamente")}
          </button>
        </div>
      )}
      <h3>{uiText("Resolução da questão")}</h3>
      {solution ? (
        <>
          <details className="enem-saved-solution" open>
            <summary>{uiText("Ver resolução comentada")}</summary>
            {solution.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </details>
        </>
      ) : (
        <p>{uiText("Esta questão ainda não possui uma resolução conferida na base salva.")}</p>
      )}
      <h3>{uiText("Análise das alternativas")}</h3>
      <div className="enem-question-alternatives">
        {["A", "B", "C", "D", "E"].map((letter) => (
          <div key={letter}>
            <strong
              className={`enem-review-option${officialAnswer === letter ? " is-correct" : selected === letter && officialAnswer !== "ANULADA" ? " is-wrong" : ""}`}
            >
              {letter}
            </strong>
            <div>
              <strong>
                {uiText(
                  !officialAnswer
                    ? "Aguardando gabarito"
                    : officialAnswer === "ANULADA"
                      ? "Questão anulada"
                      : officialAnswer === letter
                        ? "Correta"
                        : selected === letter
                          ? "Sua resposta · incorreta"
                          : "Incorreta",
                )}
              </strong>
              {solution ? (
                <p>{solution.alternatives[letter]}</p>
              ) : (
                <p>{uiText("Justificativa ainda não cadastrada.")}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <section className="enem-question-statistics">
        <h3>{uiText("Estatísticas dos estudantes nesta questão")}</h3>
        {stats ? (
          <>
            {rate !== undefined ? (
              <>
                <div
                  className="enem-success-gauge"
                  role="img"
                  aria-label={`${rate}% ${uiText("de acerto entre os participantes analisados")}`}
                >
                  <svg viewBox="0 0 220 120" aria-hidden="true">
                    <path
                      d="M20 110a90 90 0 0 1 180 0"
                      pathLength="100"
                      className="enem-gauge-track"
                    />
                    <path
                      d="M20 110a90 90 0 0 1 180 0"
                      pathLength="100"
                      className="enem-gauge-fill"
                      strokeDasharray={`${rate} 100`}
                    />
                  </svg>
                  <div>
                    <strong>
                      <PaperDigits value={String(Math.round(rate))} />
                      <span>%</span>
                    </strong>
                    <small>{uiText("Taxa de acerto")}</small>
                  </div>
                </div>
                <p className="enem-observed-difficulty">
                  {uiText("Dificuldade observada:")}{" "}
                  <strong>{uiText(rate >= 65 ? "Fácil" : rate >= 35 ? "Média" : "Difícil")}</strong>
                </p>
                <small>
                  {uiText(
                    "Faixas por acerto: fácil a partir de 65%, média de 35% a menos de 65%, difícil abaixo de 35%. Não é a dificuldade da TRI.",
                  )}
                </small>
              </>
            ) : (
              <p>{uiText("Questão anulada. Taxa de acerto e dificuldade não se aplicam.")}</p>
            )}
            <h3>{uiText("Distribuição das respostas")}</h3>
            <div
              className="enem-distribution"
              role="img"
              aria-label={`${uiText("Distribuição das respostas")}: ${["A", "B", "C", "D", "E"].map((letter) => `${letter}: ${stats.counts[letter]}`).join(", ")}`}
            >
              {["A", "B", "C", "D", "E"].map((letter) => {
                const percent = Math.round((1000 * stats.counts[letter]!) / stats.population) / 10;
                return (
                  <div key={letter}>
                    <span>{percent}%</span>
                    <div className="enem-distribution-track">
                      <i
                        className={
                          letter === officialAnswer
                            ? "is-correct"
                            : letter === selected && officialAnswer !== "ANULADA"
                              ? "is-wrong"
                              : ""
                        }
                        style={{ height: `${percent}%` }}
                      />
                    </div>
                    <strong>{letter}</strong>
                    <small>{stats.counts[letter]!.toLocaleString("pt-BR")}</small>
                  </div>
                );
              })}
            </div>
            <p>
              {uiText("Em branco ou marcação inválida:")}{" "}
              {stats.counts["blank"]!.toLocaleString("pt-BR")}.{" "}
              {uiText("Participantes analisados:")} {stats.population.toLocaleString("pt-BR")}.
            </p>
            <small className="enem-review-provenance">
              {stats.source.scope}
              <a href={stats.source.url} target="_blank" rel="noopener noreferrer">
                {stats.source.title}
              </a>
              {uiText("Processado em")} {stats.source.processedAt.split("-").reverse().join("/")}.
            </small>
          </>
        ) : (
          <>
            <p>{uiText("Esta questão ainda não possui estatísticas oficiais processadas.")}</p>
            <h3>{uiText("Distribuição das respostas")}</h3>
            <p>
              {uiText(
                "Será exibida quando a base correspondente ao caderno e idioma estiver disponível.",
              )}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
