import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { uiText } from "../i18n/runtime";
import type { Flashcard, FlashcardRating } from "../domain/workspace";
import { toDateKey } from "../domain/workspace";
import {
  FEEDBACK_REASONS,
  type FeedbackEvent,
  type FeedbackReason,
} from "../domain/flashcard-feedback";
import { PaperArrow } from "./paper-arrow";
import { PaperCloseIcon } from "./paper-close-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import "./flashcard-study.css";

/** Um cartão com intervalo de 21 dias ou mais já está firme na memória. */
export const MASTERED_INTERVAL_DAYS = 21;

type Answer = { id: string; right: boolean };

/** Cartão de verdadeiro ou falso traz o gabarito no começo do verso; outros cartões não têm. */
export function truthOf(back: string): boolean | undefined {
  if (/^(?:Verdadeiro|True)\./.test(back)) return true;
  if (/^(?:Falso|False)\./.test(back)) return false;
  return undefined;
}
type Phase = "study" | "retry" | "done";

const REASON_LABELS: Record<FeedbackReason, () => string> = {
  nonsense: () => uiText("Sem sentido"),
  obvious: () => uiText("Óbvia demais"),
  "actually-true": () => uiText("Na verdade é verdadeira"),
  grammar: () => uiText("Erro de gramática"),
  loose: () => uiText("Frase solta"),
};

const TRUE_LABELS = { pt: "Verdadeiro.", en: "True." } as const;
const FALSE_LABELS = { pt: "Falso. O texto diz:", en: "False. The text says:" } as const;
const LABEL =
  /^(?:Verdadeiro\.|Falso\. O texto diz:|True\.|False\. The text says:|Falso\.|False\.)\s*/;

/** O verso sem o gabarito: só a explicação (a frase do arquivo). */
function explanationOf(back: string): string {
  return back.replace(LABEL, "");
}
function buildBack(truth: boolean, explanation: string, previousBack: string): string {
  const language = /^(?:True|False)\./.test(previousBack) ? "en" : "pt";
  return `${truth ? TRUE_LABELS[language] : FALSE_LABELS[language]} ${explanation.trim()}`;
}

function clock(milliseconds: number): string {
  const total = Math.max(0, Math.round(milliseconds / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Tela de estudo de um baralho. Seta esquerda (vermelha) = errei, seta direita (verde) = acertei.
 * Na primeira rodada cada resposta vira uma revisão espaçada na conta (errei = de novo, acertei =
 * fácil). Depois da rodada, os cartões errados voltam até todos serem acertados; essas repetições
 * não contam de novo na agenda de revisão. Ao sair no meio, as respostas dadas já ficam salvas.
 */
export function FlashcardStudy({
  title,
  cards,
  sourceTitle,
  onReview,
  onDiscard,
  onFeedback,
  onEdit,
  onClose,
}: {
  title: string;
  cards: readonly Flashcard[];
  /** Nome do arquivo de onde os cartões saíram, para citar a fonte. */
  sourceTitle?: string;
  onReview: (id: string, rating: FlashcardRating, reviewedOn: string) => void;
  /** Exclui o cartão do baralho (afirmação ruim). */
  onDiscard: (id: string) => void;
  /** Sinal de qualidade do cartão (aceito, editado ou descartado com motivo). */
  onFeedback?: (id: string, event: FeedbackEvent) => void;
  onEdit: (id: string, front: string, back: string) => void;
  onClose: () => void;
}) {
  // O baralho é fixado ao abrir: salvar uma revisão muda os cartões, mas não a fila desta sessão.
  const [deck] = useState(() =>
    cards.map(({ id, front, back, sourcePage }) => ({ id, front, back, sourcePage })),
  );
  const byId = new Map(deck.map((card) => [card.id, card]));
  const [phase, setPhase] = useState<Phase>("study");
  const [queue, setQueue] = useState<string[]>(() => deck.map(({ id }) => id));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [round, setRound] = useState(1);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [firstRound, setFirstRound] = useState<Answer[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const saved = useRef(new Set<string>());
  const [feedback, setFeedback] = useState<{ right: boolean }>();
  const [discarded, setDiscarded] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, { front: string; back: string }>>({});
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const proceedButton = useRef<HTMLButtonElement>(null);

  useEffect(() => heading.current?.focus({ preventScroll: true }), [phase]);
  useEffect(() => {
    if (feedback) proceedButton.current?.focus({ preventScroll: true });
  }, [feedback]);

  const base = byId.get(queue[position] ?? "");
  const current = base ? { ...base, ...edits[base.id] } : undefined;
  const wrongNow = answers.filter(({ right }) => !right).length;
  const rightNow = answers.length - wrongNow;

  function saveFirstRound(list: readonly Answer[]) {
    const today = toDateKey(new Date());
    for (const answer of list) {
      if (saved.current.has(answer.id)) continue;
      saved.current.add(answer.id);
      onReview(answer.id, answer.right ? "good" : "again", today);
      onFeedback?.(answer.id, { type: "kept" });
    }
  }
  function leave() {
    if (round === 1 && phase === "study") saveFirstRound(answers);
    onClose();
  }
  function finishPass(next: Answer[]) {
    if (round === 1) {
      saveFirstRound(next);
      setFirstRound(next);
    }
    const wrong = next.filter((item) => !item.right).map((item) => item.id);
    if (wrong.length) {
      setQueue(wrong);
      setPhase("retry");
    } else {
      setElapsed(Date.now() - startedAt);
      setPhase("done");
    }
  }
  function advance(next: Answer[]) {
    setFlipped(false);
    setReporting(false);
    if (position + 1 < queue.length) {
      setPosition(position + 1);
      return;
    }
    finishPass(next);
  }
  /** Afirmação ruim: sai do baralho para sempre e a sessão segue sem ela. */
  function discard(reason?: FeedbackReason) {
    if (phase !== "study" || !current) return;
    onFeedback?.(current.id, reason ? { type: "discarded", reason } : { type: "discarded" });
    setReporting(false);
    onDiscard(current.id);
    setDiscarded([...discarded, current.id]);
    // se o cartão já tinha sido respondido nesta tela (gabarito aberto), essa resposta some
    const kept = feedback ? answers.slice(0, -1) : answers;
    const rest = queue.filter((id) => id !== current.id);
    setAnswers(kept);
    setFeedback(undefined);
    setFlipped(false);
    setEditing(false);
    setQueue(rest);
    if (position >= rest.length) finishPass(kept);
  }
  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) return;
    const data = new FormData(event.currentTarget);
    const front = String(data.get("front") ?? "").trim();
    if (!front) return;
    let back: string;
    if (truthOf(current.back) !== undefined) {
      const explanation = String(data.get("explanation") ?? "").trim();
      if (!explanation) return;
      back = buildBack(data.get("truth") === "true", explanation, current.back);
    } else {
      back = String(data.get("back") ?? "").trim();
      if (!back) return;
    }
    onFeedback?.(current.id, { type: "edited" });
    onEdit(current.id, front, back);
    setEdits({ ...edits, [current.id]: { front, back } });
    setEditing(false);
  }
  /** `choice` é o lado da seta: direita (verdadeiro ou acertei) ou esquerda (falso ou errei). */
  function answer(choice: boolean) {
    if (phase !== "study" || !current || feedback || editing) return;
    const truth = truthOf(current.back);
    const right = truth === undefined ? choice : choice === truth;
    const next = [...answers, { id: current.id, right }];
    setAnswers(next);
    if (truth === undefined) {
      advance(next);
      return;
    }
    // Verdadeiro ou falso: mostra o gabarito e a frase do arquivo antes de seguir.
    setFeedback({ right });
    setFlipped(true);
  }
  function proceed() {
    if (!feedback) return;
    setFeedback(undefined);
    advance(answers);
  }
  function undo() {
    if (phase !== "study" || answers.length === 0) return;
    setAnswers(answers.slice(0, -1));
    setFlipped(false);
    if (feedback) setFeedback(undefined);
    else setPosition(Math.max(0, position - 1));
  }
  function begin(ids: string[], nextRound: number) {
    setQueue(ids);
    setPosition(0);
    setAnswers([]);
    setFlipped(false);
    setFeedback(undefined);
    setRound(nextRound);
    setPhase("study");
  }
  function restart(ids: string[]) {
    saved.current.clear();
    setFirstRound([]);
    setStartedAt(Date.now());
    setElapsed(0);
    begin(ids, 1);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)
      )
        return;
      if (event.key === "ArrowLeft") answer(false);
      if (event.key === "ArrowRight") answer(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const total = deck.length - discarded.length;
  const scored = firstRound.length || total;
  const firstRight = firstRound.filter(({ right }) => right).length;
  const live = deck.map(({ id }) => cards.find((card) => card.id === id));
  const mastered = live.filter(
    (card) => card && card.intervalDays >= MASTERED_INTERVAL_DAYS,
  ).length;
  const unseen = live.filter((card) => card && !card.reviews && !card.firstReviewedOn).length;
  const lastStudy = live
    .map((card) => card?.lastReviewedOn ?? "")
    .sort()
    .at(-1);
  const progress =
    phase === "done"
      ? 1
      : phase === "retry"
        ? 0.5
        : (position + (flipped ? 0.5 : 0)) / queue.length;
  const judged = current !== undefined && truthOf(current.back) !== undefined;

  return createPortal(
    <section className="flashcard-study" aria-label={title}>
      <header className="flashcard-study__top">
        <button
          type="button"
          className="library-icon"
          aria-label={uiText("Sair do estudo")}
          onClick={leave}
        >
          <PaperCloseIcon />
        </button>
        <div
          className="flashcard-study__progress"
          role="progressbar"
          aria-label={uiText("Progresso do baralho")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      {phase === "study" && current && (
        <div className="flashcard-study__body">
          <h2 ref={heading} tabIndex={-1} className="flashcard-study__title">
            {title}
          </h2>
          {editing && (
            <form className="flashcard-study__edit" onSubmit={saveEdit}>
              <label>
                {judged ? uiText("Afirmação") : uiText("Frente do cartão")}
                <textarea
                  name="front"
                  required
                  maxLength={600}
                  rows={4}
                  defaultValue={current.front}
                />
              </label>
              {judged ? (
                <>
                  <fieldset>
                    <legend>{uiText("Resposta correta")}</legend>
                    <label>
                      <input
                        type="radio"
                        name="truth"
                        value="true"
                        defaultChecked={truthOf(current.back) === true}
                      />
                      {uiText("Verdadeiro")}
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="truth"
                        value="false"
                        defaultChecked={truthOf(current.back) === false}
                      />
                      {uiText("Falso")}
                    </label>
                  </fieldset>
                  <label>
                    {uiText("Explicação")}
                    <textarea
                      name="explanation"
                      required
                      maxLength={600}
                      rows={3}
                      defaultValue={explanationOf(current.back)}
                    />
                  </label>
                </>
              ) : (
                <label>
                  {uiText("Verso do cartão")}
                  <textarea
                    name="back"
                    required
                    maxLength={600}
                    rows={3}
                    defaultValue={current.back}
                  />
                </label>
              )}
              <div className="flashcard-study__edit-actions">
                <button type="submit" className="flashcard-study__primary">
                  {uiText("Salvar")}
                </button>
                <button type="button" onClick={() => setEditing(false)}>
                  {uiText("Cancelar")}
                </button>
              </div>
            </form>
          )}
          {!editing && (
            <div className="flashcard-study__stage">
              <button
                type="button"
                className="flashcard-study__verdict is-wrong"
                aria-label={judged ? uiText("Falso") : uiText("Errei")}
                disabled={feedback !== undefined}
                onClick={() => answer(false)}
              >
                <PaperArrow back />
                <small>{judged ? uiText("Falso") : uiText("Errei")}</small>
              </button>
              <button
                type="button"
                className="flashcard-study__card"
                data-side={flipped ? "back" : "front"}
                data-result={feedback ? (feedback.right ? "right" : "wrong") : undefined}
                aria-label={uiText("Virar cartão")}
                aria-disabled={judged}
                onClick={() => {
                  if (!judged) setFlipped((value) => !value);
                }}
              >
                <small>
                  {feedback
                    ? feedback.right
                      ? uiText("Correto!")
                      : uiText("Não foi dessa vez.")
                    : flipped
                      ? uiText("Resposta")
                      : judged
                        ? uiText("Afirmação")
                        : uiText("Pergunta")}
                </small>
                <strong aria-live="polite">{flipped ? current.back : current.front}</strong>
                <span>
                  {position + 1} {uiText("de")} {queue.length}
                  {flipped && current.sourcePage
                    ? ` · ${
                        sourceTitle
                          ? uiText("Fonte: {0}, página {1}", [
                              sourceTitle,
                              String(current.sourcePage),
                            ])
                          : uiText("Página {0}", [String(current.sourcePage)])
                      }`
                    : ""}
                </span>
              </button>
              <button
                type="button"
                className="flashcard-study__verdict is-right"
                aria-label={judged ? uiText("Verdadeiro") : uiText("Acertei")}
                disabled={feedback !== undefined}
                onClick={() => answer(true)}
              >
                <PaperArrow />
                <small>{judged ? uiText("Verdadeiro") : uiText("Acertei")}</small>
              </button>
            </div>
          )}
          {editing ? null : feedback ? (
            <button
              type="button"
              ref={proceedButton}
              className="flashcard-study__primary"
              onClick={proceed}
            >
              {uiText("Continuar")}
            </button>
          ) : (
            <p className="flashcard-study__hint">
              {judged
                ? uiText("Esquerda é falso, direita é verdadeiro.")
                : uiText("Toque no cartão para virar")}
            </p>
          )}
          {!editing && !reporting && (
            <div className="flashcard-study__tools">
              <button type="button" onClick={() => setEditing(true)}>
                {uiText("Editar cartão")}
              </button>
              <button type="button" onClick={() => setReporting(true)}>
                {judged ? uiText("Afirmação ruim") : uiText("Cartão ruim")}
              </button>
            </div>
          )}
          {!editing && reporting && (
            <div
              className="flashcard-study__tools"
              role="group"
              aria-label={uiText("Por que está ruim?")}
            >
              {FEEDBACK_REASONS.map((reason) => (
                <button key={reason} type="button" onClick={() => discard(reason)}>
                  {REASON_LABELS[reason]()}
                </button>
              ))}
              <button type="button" onClick={() => discard()}>
                {uiText("Sem motivo")}
              </button>
              <button type="button" onClick={() => setReporting(false)}>
                {uiText("Cancelar")}
              </button>
            </div>
          )}
          <footer className="flashcard-study__foot">
            <button
              type="button"
              className="flashcard-study__undo"
              aria-label={uiText("Desfazer")}
              disabled={answers.length === 0}
              onClick={undo}
            >
              <PaperEditorIcon name="undo" />
            </button>
            <span className="flashcard-study__count is-wrong">
              {uiText("Errei")} {wrongNow}
            </span>
            <span className="flashcard-study__count is-right">
              {uiText("Acertei")} {rightNow}
            </span>
          </footer>
        </div>
      )}

      {phase === "retry" && (
        <div className="flashcard-study__body flashcard-study__center">
          <img src="/room-icons/flashcards.svg" alt="" width="56" height="56" />
          <h2 ref={heading} tabIndex={-1} className="flashcard-study__title">
            {uiText("Vamos rever as perguntas que você errou.")}
          </h2>
          <button
            type="button"
            className="flashcard-study__primary"
            onClick={() => begin(queue, round + 1)}
          >
            {uiText("Continuar")}
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="flashcard-study__body flashcard-study__center">
          <img src="/room-icons/flashcards.svg" alt="" width="56" height="56" />
          <h2 ref={heading} tabIndex={-1} className="flashcard-study__title">
            {firstRound.length && firstRight / scored >= 0.8
              ? uiText("Excelente trabalho!")
              : uiText("Bom estudo!")}
          </h2>
          <p>{uiText("Continue praticando para dominar todos os cartões.")}</p>
          <dl className="flashcard-study__stats">
            <div>
              <dt>{uiText("Acertos na primeira rodada")}</dt>
              <dd>
                {firstRight}/{scored}
              </dd>
            </div>
            <div>
              <dt>{uiText("Tempo")}</dt>
              <dd>{clock(elapsed)}</dd>
            </div>
          </dl>
          <ul className="flashcard-study__levels">
            <li>{uiText("Dominados: {0}", [String(mastered)])}</li>
            <li>{uiText("A aprender: {0}", [String(total - mastered - unseen)])}</li>
            <li>{uiText("Não estudados: {0}", [String(unseen)])}</li>
          </ul>
          {lastStudy && (
            <small>
              {uiText("Último estudo: {0}", [
                new Date(`${lastStudy}T12:00:00`).toLocaleDateString(),
              ])}
            </small>
          )}
          <button type="button" className="flashcard-study__primary" onClick={onClose}>
            {uiText("Continuar")}
          </button>
          <div className="flashcard-study__again">
            <button type="button" onClick={() => restart(deck.map(({ id }) => id))}>
              {uiText("Repetir cartões de estudo")}
            </button>
            {firstRound.some(({ right }) => !right) && (
              <button
                type="button"
                onClick={() =>
                  restart(firstRound.filter(({ right }) => !right).map(({ id }) => id))
                }
              >
                {uiText("Repetir as erradas")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>,
    document.body,
  );
}
