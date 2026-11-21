import { useState } from "react";
import { uiText } from "../i18n/runtime";
import type { EssayLevel, EssayReview } from "../ai/essay-output";
import {
  EssayReviewError,
  estimateEssayCredits,
  requestEssayReview,
  type EssayReviewRequester,
} from "../data/essay-olena-client";
import { essaySubmissionReview } from "../domain/essay-submission-review";
import { useOlenaCredits } from "../views/use-olena-credits";
import { HelenaLoading } from "./helena-loading";
import { PaperCardTitle } from "./paper-card-title";
import "./essay-olena-review.css";

const LEVEL_LABEL: Record<EssayLevel, string> = {
  "needs-work": "Precisa melhorar",
  good: "Bom",
  great: "Muito bom",
};
/** Menos que isso não tem o que avaliar, e o pedido gastaria créditos à toa. */
const MIN_WORDS = 30;

const REPORT_CATEGORIES = [
  "A nota parece errada",
  "A nota mudou muito entre pedidos iguais",
  "Fugiu do tema ou da competência",
  "Texto ofensivo ou inadequado",
  "Outro problema",
] as const;
const REPORT_KEY = "helena.essayReports.v1";

/** Só categoria e data, nunca o texto da redação. Fica neste aparelho: ainda não há envio à equipe. */
function saveReport(category: string): boolean {
  try {
    const previous: unknown = JSON.parse(localStorage.getItem(REPORT_KEY) ?? "[]");
    const list = Array.isArray(previous) ? previous.slice(-49) : [];
    localStorage.setItem(
      REPORT_KEY,
      JSON.stringify([...list, { at: new Date().toISOString(), category }]),
    );
    return true;
  } catch {
    return false;
  }
}

/** Soma das cinco notas, só quando a IA devolveu as cinco (a chave da nota está ligada). */
function totalScore(review: EssayReview): number | undefined {
  const scores = review.competencies.map((item) => item.score);
  return scores.every((score) => score !== undefined)
    ? scores.reduce<number>((total, score) => total + (score ?? 0), 0)
    : undefined;
}

function shareText(review: EssayReview): string {
  const total = totalScore(review);
  const levels = review.competencies
    .map((item) => `${item.id}: ${uiText(LEVEL_LABEL[item.level])}`)
    .join(" · ");
  return [
    uiText(
      "Avaliação da Olena sobre a minha redação (estimativa da IA, não é a nota oficial do Enem)",
    ),
    ...(total === undefined ? [] : [uiText("Nota estimada: {0} de 1000", [total])]),
    levels,
  ].join("\n\n");
}

export function EssayOlenaReview({
  text,
  topicTitle,
  requester = requestEssayReview,
}: {
  text: string;
  topicTitle?: string;
  requester?: EssayReviewRequester;
}) {
  const credits = useOlenaCredits();
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [review, setReview] = useState<{ text: string; value: EssayReview }>();
  const [error, setError] = useState("");
  const [shared, setShared] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0]);
  const [reported, setReported] = useState<"" | "saved" | "failed">("");

  const words = essaySubmissionReview(text).words;
  const tooShort = words < MIN_WORDS;
  const estimate = estimateEssayCredits(text, topicTitle);
  const remaining = credits.usage?.remainingCredits;
  const empty = remaining !== undefined && remaining <= 0;
  const stale = review !== undefined && review.text !== text;

  async function ask() {
    if (state === "loading" || tooShort || empty) return;
    credits.prepare();
    setState("loading");
    setError("");
    setShared("");
    try {
      const value = await requester(text, topicTitle);
      setReview({ text, value });
      setState("ready");
    } catch (failure) {
      setError(
        uiText(
          failure instanceof EssayReviewError
            ? failure.message
            : "A Olena não respondeu agora. Tente de novo; um pedido que falha não gasta créditos.",
        ),
      );
      setState("error");
    } finally {
      credits.reload();
    }
  }

  async function share(value: EssayReview) {
    const content = shareText(value);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text: content });
        return;
      }
      await navigator.clipboard.writeText(content);
      setShared(uiText("Avaliação copiada."));
    } catch {
      setShared(uiText("Não foi possível compartilhar. Tente de novo."));
    }
  }

  const score = review ? totalScore(review.value) : undefined;

  return (
    <section className="essay-olena" aria-label={uiText("Nota da Olena")}>
      <h3>{uiText("Nota da Olena")}</h3>
      <p className="essay-olena-note">
        {uiText(
          "Estimativa da IA por competência. Pode errar e pode variar da correção oficial do Enem.",
        )}
      </p>

      {state !== "loading" && (
        <div className="essay-olena-ask">
          <p>
            {uiText(
              "Ao pedir, o texto da redação e o tema são enviados à Olena (IA) para gerar a nota. Nada é enviado antes do seu toque e nós não guardamos o texto.",
            )}{" "}
            <a href="/politica-de-privacidade.html" target="_blank" rel="noreferrer">
              {uiText("Política de Privacidade")}
            </a>
          </p>
          <p>{uiText("Custo estimado: até {0} créditos.", [estimate])}</p>
          {remaining !== undefined && (
            <p>{uiText("Seu saldo de hoje: {0} créditos.", [remaining])}</p>
          )}
          {tooShort && (
            <p role="status">
              {uiText("Escreva pelo menos {0} palavras para pedir a nota.", [MIN_WORDS])}
            </p>
          )}
          {empty && (
            <p role="alert">{uiText("Sem créditos hoje. Você pode pedir de novo amanhã.")}</p>
          )}
          <button
            type="button"
            className="shelf-wood-button"
            disabled={tooShort || empty}
            onClick={() => void ask()}
          >
            {uiText(review ? "Pedir de novo" : "Pedir nota da Olena")}
          </button>
        </div>
      )}

      {state === "loading" && (
        <HelenaLoading compact label={uiText("A Olena está lendo a sua redação…")} />
      )}
      {state === "error" && <p role="alert">{error}</p>}

      {review && state !== "loading" && (
        <div className="essay-olena-result">
          {stale && (
            <p role="status">
              {uiText("O texto mudou depois desta nota. Ela vale para a versão anterior.")}
            </p>
          )}
          <section className="essay-olena-summary" aria-label={uiText("Resumo da correção")}>
            {score !== undefined ? (
              <p className="essay-olena-total">
                {uiText("Nota estimada pela IA: {0} de 1000. Não é a nota oficial.", [score])}
              </p>
            ) : (
              <p>
                {uiText("A nota geral ainda não está liberada. Veja o nível de cada competência.")}
              </p>
            )}
            <ul className="essay-olena-levels">
              {review.value.competencies.map((item) => (
                <li key={item.id} data-level={item.level}>
                  <strong>{item.id}</strong> {uiText(LEVEL_LABEL[item.level])}
                  {item.score !== undefined && <> · {item.score}</>}
                </li>
              ))}
            </ul>
          </section>
          <section
            className="essay-olena-locked"
            aria-label={uiText("Observações por competência")}
          >
            <p>{uiText("Observações e comentários por competência")}</p>
            <p className="essay-olena-pro">
              <PaperCardTitle value="EM BREVE OLENA PRO" />
            </p>
          </section>
          <div className="essay-olena-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => void share(review.value)}
            >
              {uiText("Compartilhar")}
            </button>
            <button
              type="button"
              className="secondary-button"
              aria-expanded={reportOpen}
              onClick={() => setReportOpen(!reportOpen)}
            >
              {uiText("Reportar um problema")}
            </button>
          </div>
          {shared && <p role="status">{shared}</p>}
          {reportOpen && (
            <fieldset className="essay-olena-report">
              <legend>{uiText("O que aconteceu?")}</legend>
              {REPORT_CATEGORIES.map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="essay-olena-report"
                    value={option}
                    checked={category === option}
                    onChange={() => setCategory(option)}
                  />{" "}
                  {uiText(option)}
                </label>
              ))}
              <p>
                {uiText(
                  "Guardamos só a categoria e a data, neste aparelho. O texto da redação não entra e ainda não há envio à equipe.",
                )}
              </p>
              <button
                type="button"
                className="shelf-wood-button"
                onClick={() => setReported(saveReport(category) ? "saved" : "failed")}
              >
                {uiText("Guardar relato")}
              </button>
              {reported === "saved" && (
                <p role="status">{uiText("Relato guardado neste aparelho.")}</p>
              )}
              {reported === "failed" && (
                <p role="alert">{uiText("Não foi possível guardar o relato neste aparelho.")}</p>
              )}
            </fieldset>
          )}
        </div>
      )}
    </section>
  );
}
