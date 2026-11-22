import { lazy, Suspense, useEffect, useState } from "react";
import { loadEnemAnswerKey, scoreEnemAnswers } from "../data/enem-answer-key";
import { calculateEnemTri, loadEnemTriBundle, type EnemLanguage } from "../data/enem-tri";
import type { EnemSection } from "../data/enem-sections";
import { uiText } from "../i18n/runtime";
import { answerRows } from "../data/enem-answer-rows";
import { PaperDigits } from "./paper-digits";
import { PaperCloseIcon } from "./paper-close-icon";
import { EnemQuestionExplanation } from "./enem-question-explanation";
import { FocusPaperArrow } from "./focus-paper-arrow";
import "./essay-proofreading.css";

const ReviewPdf = lazy(() => import("./library-pdf-reader"));

export function EnemSubmissionResult({
  title,
  section,
  seconds,
  answers,
  onClose,
  answerUrl,
  variantId,
  paperUrl,
  language,
}: {
  title: string;
  section: EnemSection;
  seconds: number;
  answers: Record<string, string>;
  onClose(): void;
  answerUrl?: string;
  variantId: string;
  paperUrl: string;
  language: EnemLanguage;
}) {
  const [filter, setFilter] = useState("all");
  const [officialKey, setOfficialKey] = useState<Record<string, string>>({});
  const [reviewIndex, setReviewIndex] = useState<number>();
  const rows = answerRows(section, language);
  const [tri, setTri] = useState<number | "loading" | "unavailable" | "error">("loading");
  const [triRevision, setTriRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void loadEnemTriBundle(variantId, section.id)
      .then((bundle) => {
        const value = bundle
          ? calculateEnemTri(bundle, section.id, answers, language).score
          : "unavailable";
        if (active) setTri(value);
      })
      .catch(() => {
        if (active) setTri("error");
      });
    return () => {
      active = false;
    };
  }, [variantId, section.id, answers, language, triRevision]);
  const filled = rows.filter((row) => answers[`${section.id}:${row.key}`]);
  const [grading, setGrading] = useState<
    { percentage: number; correct: number; total: number } | "loading" | "error"
  >(answerUrl ? "loading" : "error");
  useEffect(() => {
    let active = true;
    if (!answerUrl) {
      return;
    }
    void loadEnemAnswerKey(answerUrl)
      .then((key) => {
        const score = scoreEnemAnswers(answerRows(section, language), section.id, answers, key);
        if (active) {
          setGrading(score);
          setOfficialKey(key);
        }
      })
      .catch(() => {
        if (active) setGrading("error");
      });
    return () => {
      active = false;
    };
  }, [answerUrl, section, answers, language]);
  return (
    <section className="enem-submission-screen">
      <button
        type="button"
        className="library-icon essay-results-close"
        aria-label={uiText("Fechar resultado da prova")}
        onClick={onClose}
      >
        <PaperCloseIcon />
      </button>
      {reviewIndex !== undefined && rows[reviewIndex] && (
        <div
          className="enem-question-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={uiText("Revisão da questão")}
          onKeyDown={(event) => {
            if (event.key === "Escape") setReviewIndex(undefined);
          }}
        >
          <div className="enem-question-document">
            <Suspense fallback={<p>{uiText("Carregando prova…")}</p>}>
              <ReviewPdf
                key={rows[reviewIndex]!.key}
                sourceUrl={paperUrl}
                continuous
                questionOnly
                questionKey={rows[reviewIndex]!.key}
                indexVariantId={variantId}
                startSection={{ ...section, question: rows[reviewIndex]!.number }}
                startLanguage={rows[reviewIndex]!.key.startsWith("q:") ? "english" : language}
                scope="enem-review"
                material={{
                  id: variantId,
                  subjectId: "enem",
                  title,
                  kind: "pdf",
                  content: paperUrl,
                  createdAt: "",
                  page: 1,
                  bookmarks: [],
                }}
                onChange={() => {}}
                onExcerpt={() => {}}
              />
            </Suspense>
          </div>
          <div className="enem-question-detail">
            <button
              type="button"
              className="library-icon enem-question-close"
              aria-label={uiText("Fechar revisão")}
              onClick={() => setReviewIndex(undefined)}
            >
              <PaperCloseIcon />
            </button>
            <div className="enem-question-comparison">
              <h2>
                {uiText("Questão")} {rows[reviewIndex]!.number}
              </h2>
              <span>
                {uiText("Sua resposta")}{" "}
                <strong>
                  {answers[`${section.id}:${rows[reviewIndex]!.key}`] || uiText("Em branco")}
                </strong>
              </span>
              <span>
                {uiText("Resposta correta")}{" "}
                <strong>{officialKey[rows[reviewIndex]!.key] || uiText("Indisponível")}</strong>
              </span>
            </div>
            <EnemQuestionExplanation
              key={rows[reviewIndex]!.key}
              variantId={variantId}
              paperUrl={paperUrl}
              questionKey={rows[reviewIndex]!.key}
              officialAnswer={officialKey[rows[reviewIndex]!.key]}
              selected={answers[`${section.id}:${rows[reviewIndex]!.key}`]}
            />
            <nav className="enem-question-navigation">
              <button
                className="shelf-wood-button"
                disabled={reviewIndex === 0}
                onClick={() => setReviewIndex(reviewIndex - 1)}
              >
                {uiText("Anterior")}
              </button>
              <label>
                {uiText("Ir para")}{" "}
                <input
                  aria-label={uiText("Ir para questão")}
                  type="number"
                  min={1}
                  max={rows.length}
                  value={reviewIndex + 1}
                  onChange={(event) => {
                    const index = Number(event.target.value) - 1;
                    if (Number.isInteger(index) && index >= 0 && index < rows.length)
                      setReviewIndex(index);
                  }}
                />
              </label>
              <button
                className="shelf-wood-button"
                disabled={reviewIndex === rows.length - 1}
                onClick={() => setReviewIndex(reviewIndex + 1)}
              >
                {uiText("Próxima")}
              </button>
            </nav>
          </div>
        </div>
      )}
      <div className="essay-results-page">
        <header className="essay-results-hero">
          <img
            src="/essay-art/poliana-teaching-olena-v2.webp"
            alt={uiText("Poliana ensinando Olena")}
            width={240}
            height={124}
          />
          <h1>{uiText("Prova entregue!")}</h1>
          <p>{title}</p>
        </header>
        <div className="essay-results-content">
          <div className="essay-submission-metrics enem-result-metrics">
            <div className="essay-submission-score">
              <small>{uiText("Respostas corretas")}</small>
              {typeof grading === "object" ? (
                <strong className="enem-correct-percentage">
                  <PaperDigits value={String(grading.percentage)} />
                  <span>%</span>
                </strong>
              ) : (
                <strong role="status">
                  {uiText(grading === "loading" ? "Conferindo…" : "Gabarito indisponível")}
                </strong>
              )}
            </div>
            <div className="enem-result-answered">
              <small>{uiText("Respostas enviadas")}</small>
              <PaperDigits value={`${filled.length}/${rows.length}`} />
            </div>
            <div className="essay-submission-time">
              <small>{uiText("Tempo de prova")}</small>
              <PaperDigits
                value={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
              />
            </div>
          </div>
          <details className="essay-disclosure enem-result-review" open>
            <summary>
              <FocusPaperArrow />
              <span className="enem-result-area">
                <strong>{uiText(section.label)}</strong>
                {typeof grading === "object" && (
                  <small>
                    <strong>
                      {grading.correct}/{grading.total}
                    </strong>{" "}
                    {uiText("Respostas corretas")}
                  </small>
                )}
              </span>
              <span className="enem-estimated-score">
                {typeof tri === "number" ? (
                  <PaperDigits value={String(Math.round(tri))} />
                ) : (
                  <span>
                    {uiText(
                      tri === "loading"
                        ? "Calculando…"
                        : tri === "unavailable"
                          ? "Indisponível nesta edição"
                          : "Falha ao carregar",
                    )}
                  </span>
                )}
                <small>{uiText("Pontuação estimada")}</small>
              </span>
            </summary>
            <details className="enem-score-explanation">
              <summary aria-label={uiText("Sobre a pontuação estimada")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M6 2h12l4 4v12l-4 4H6l-4-4V6Zm5 7h3V6h-3Zm0 3v7h3v-7Z"
                  />
                </svg>
                {uiText("Como é calculada?")}
              </summary>
              <p>
                {uiText(
                  "Estimativa feita com o modelo da TRI e os parâmetros dos itens desta prova, publicados pelo Inep. Vale para a área escolhida e pode diferir da nota real.",
                )}
              </p>
              {tri === "error" && (
                <button
                  type="button"
                  className="shelf-wood-button"
                  onClick={() => {
                    setTri("loading");
                    setTriRevision((value) => value + 1);
                  }}
                >
                  {uiText("Tentar novamente")}
                </button>
              )}
            </details>
            <div
              className="enem-result-filters"
              role="group"
              aria-label={uiText("Filtrar respostas")}
            >
              {[
                ["all", "Todas"],
                ["wrong", "Erradas"],
                ["empty", "Em branco"],
              ].map(([id, label]) => (
                <button
                  type="button"
                  className="shelf-wood-button"
                  key={id}
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id!)}
                >
                  {uiText(label!)}
                  {id !== "all" &&
                    ` ${rows.filter((row) => (id === "empty" ? !answers[`${section.id}:${row.key}`] : !!answers[`${section.id}:${row.key}`] && !!officialKey[row.key] && officialKey[row.key] !== "ANULADA" && answers[`${section.id}:${row.key}`] !== officialKey[row.key])).length}`}
                </button>
              ))}
            </div>
            {rows
              .filter(
                (row) =>
                  filter === "all" ||
                  (filter === "empty"
                    ? !answers[`${section.id}:${row.key}`]
                    : !!answers[`${section.id}:${row.key}`] &&
                      !!officialKey[row.key] &&
                      officialKey[row.key] !== "ANULADA" &&
                      answers[`${section.id}:${row.key}`] !== officialKey[row.key]),
              )
              .map((row) => {
                const selected = answers[`${section.id}:${row.key}`];
                const correct = officialKey[row.key];
                const status =
                  correct === "ANULADA"
                    ? "cancelled"
                    : !selected
                      ? "empty"
                      : !correct
                        ? "pending"
                        : selected === correct
                          ? "correct"
                          : "wrong";
                return (
                  <button
                    type="button"
                    className={`enem-result-row is-${status}`}
                    key={row.key}
                    onClick={() => setReviewIndex(rows.indexOf(row))}
                    aria-label={`${uiText("Revisar questão")} ${row.number}`}
                  >
                    <span className="enem-review-number">
                      <span
                        aria-label={uiText(
                          status === "correct"
                            ? "Correta"
                            : status === "wrong"
                              ? "Errada"
                              : status === "cancelled"
                                ? "Anulada"
                                : "Em branco",
                        )}
                      >
                        {status === "correct" ? "✓" : status === "wrong" ? "×" : "›"}
                      </span>
                      {row.number}
                    </span>
                    <span className="enem-review-options">
                      {["A", "B", "C", "D", "E"].map((letter) => (
                        <span
                          key={letter}
                          className={`enem-review-option${correct === letter ? " is-correct" : selected === letter ? " is-wrong" : ""}`}
                        >
                          {letter}
                        </span>
                      ))}
                    </span>
                    <span aria-hidden="true">›</span>
                  </button>
                );
              })}
          </details>
        </div>
        <nav className="essay-results-navigation">
          <button type="button" className="shelf-wood-button enem-section-start" onClick={onClose}>
            {uiText("Continuar")}
          </button>
        </nav>
      </div>
    </section>
  );
}
