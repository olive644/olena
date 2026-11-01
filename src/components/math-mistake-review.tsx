import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { MathCourseId } from "../data/math-courses";
import type { MasteryQuestion } from "../domain/math-mastery-engine";
import { mathReviewExplanation } from "../domain/math-review-explanation";
import { uiText, useLanguage } from "../i18n/runtime";
import { MathExpression, MathNumber } from "./math-paper-art";
import { OliverReviewArt } from "./oliver-review-art";
import { PaperArrow } from "./paper-arrow";
import { PaperDigits } from "./paper-digits";
import { PaperSpeech } from "./paper-speech";
import "./math-mistake-review.css";

export type MissedMathQuestion = {
  id: string;
  question: MasteryQuestion;
  choice: number | null;
};

export function MathMistakeReview({
  course,
  items,
  onDone,
  onSound,
}: {
  course: MathCourseId;
  items: readonly MissedMathQuestion[];
  onDone: () => void;
  onSound: (cue: "start" | "correct" | "wrong" | "mastery") => void;
}) {
  useLanguage();
  const [position, setPosition] = useState(0);
  const [phase, setPhase] = useState<"explanation" | "question" | "complete">("explanation");
  const [choice, setChoice] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [word, setWord] = useState<{ index: number; word: string; durationMs: number }>();
  const root = useRef<HTMLElement>(null);
  const item = items[position]!;
  const correct = choice === item.question.answer;
  const reaction =
    phase === "complete" || correct ? "correct" : choice !== null ? "retry" : "explain";
  const onWord = useCallback(
    (event: { index: number; word: string; durationMs: number }) => setWord(event),
    [],
  );
  const explanation = useMemo(() => {
    try {
      return { text: mathReviewExplanation(course, item.question).join("\n"), failed: false };
    } catch {
      return { text: uiText(3359, [item.question.review]), failed: true };
    }
  }, [course, item]);
  useEffect(() => {
    root.current?.scrollIntoView?.({ block: "start" });
    root.current
      ?.querySelector<HTMLButtonElement>(
        phase === "question"
          ? correct
            ? ".oliver-review__feedback button"
            : ".oliver-review__answers button"
          : ".primary-button",
      )
      ?.focus();
  }, [position, phase, correct]);
  function next() {
    if (!correct) return;
    setChoice(null);
    setAttempt(0);
    if (position + 1 === items.length) {
      setPhase("complete");
      onSound("mastery");
    } else {
      setPosition(position + 1);
      setPhase("explanation");
      onSound("start");
    }
  }
  return (
    <section ref={root} className="oliver-review" aria-label={uiText(3343)}>
      <header className="oliver-review__header">
        <span>{uiText(3360)}</span>
        <span className="oliver-review__count">{uiText(3344, [position + 1, items.length])}</span>
      </header>
      <div className="oliver-review__trail" aria-hidden="true">
        {items.map((entry, index) => (
          <span
            key={entry.id}
            className={
              phase === "complete" || index < position
                ? "is-done"
                : index === position
                  ? "is-current"
                  : ""
            }
          />
        ))}
      </div>
      <section className="oliver-review__lesson">
        <div className="oliver-review__character">
          <OliverReviewArt
            key={item.id}
            cue={`${item.id}:${attempt}:${phase}`}
            reaction={reaction}
            speaking={speaking}
            word={word}
            variant={attempt % 2}
            label={uiText(3357)}
          />
        </div>
        <div
          key={`${item.id}:${phase === "complete"}`}
          className="oliver-review__speech"
          data-state={reaction}
        >
          <span className="oliver-review__speaker">{uiText(3362)}</span>
          <h1>{uiText(phase === "complete" ? 3354 : 3345)}</h1>
          {phase === "complete" ? (
            <>
              <PaperSpeech
                text={uiText(3355)}
                onWord={onWord}
                onSpeakingChange={setSpeaking}
                skipLabel={uiText(3361)}
              />
              <button type="button" className="primary-button" onClick={onDone}>
                {uiText(3356)}
                <PaperArrow />
              </button>
            </>
          ) : (
            <>
              <p className="oliver-review__reason">
                {item.choice === null ? uiText(3364) : uiText(3363, [item.choice])}
              </p>
              {explanation.failed && <p role="alert">{uiText(3358)}</p>}
              <div lang="pt-BR">
                <PaperSpeech
                  text={explanation.text}
                  immediate={phase === "question"}
                  onWord={onWord}
                  onSpeakingChange={setSpeaking}
                  skipLabel={uiText(3361)}
                  className="oliver-review__explanation"
                />
              </div>
              <div className="oliver-review__calculation" aria-label={item.question.expression}>
                <MathExpression value={item.question.expression} />
              </div>
              {phase === "explanation" && (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setPhase("question");
                    onSound("start");
                  }}
                >
                  {uiText(3348)}
                  <PaperArrow />
                </button>
              )}
            </>
          )}
        </div>
      </section>
      {phase === "question" && (
        <section className="oliver-review__practice">
          {choice !== null && (
            <div key={attempt} className={`oliver-review__fx is-${reaction}`} aria-hidden="true">
              {Array.from({ length: correct ? 12 : 4 }, (_, i) => (
                <i key={i} style={{ "--particle": i } as CSSProperties} />
              ))}
            </div>
          )}
          <div className="oliver-review__practice-heading">
            <h2 aria-label={item.question.expression}>
              <MathExpression value={item.question.expression} />
            </h2>
            <p>{uiText(3349)}</p>
          </div>
          <div className="oliver-review__answers">
            {item.question.choices.map((value, index) => (
              <button
                key={index}
                type="button"
                disabled={correct}
                data-tone={index}
                data-result={choice === value ? (correct ? "correct" : "wrong") : undefined}
                aria-label={uiText(2294) + value}
                aria-pressed={choice === value}
                onClick={() => {
                  setChoice(value);
                  setAttempt(attempt + 1);
                  onSound(value === item.question.answer ? "correct" : "wrong");
                }}
              >
                <span className="oliver-review__key">
                  <PaperDigits value={String(index + 1)} />
                </span>
                <MathNumber value={value} />
              </button>
            ))}
          </div>
          <div className="oliver-review__feedback" role="status" aria-live="polite">
            {choice !== null && (
              <>
                <p>{uiText(correct ? 3350 : 3351)}</p>
                {correct && (
                  <button className="primary-button" type="button" onClick={next}>
                    {uiText(position + 1 === items.length ? 3353 : 3352)}
                    <PaperArrow />
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
