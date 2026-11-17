import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SourceQuiz } from "../domain/source-quiz";
import { uiText } from "../i18n/runtime";
import { createMathSound } from "../data/math-sound";
import { PaperCloseIcon } from "./paper-close-icon";
import "./flashcard-study.css";
import "./source-quiz-study.css";
export function SourceQuizStudy({
  title,
  quiz,
  onClose,
  onComplete,
}: {
  title: string;
  quiz: SourceQuiz;
  onClose(): void;
  onComplete(correct: number, total: number): void;
}) {
  const [queue, setQueue] = useState(() => quiz.questions.map((_, i) => i));
  const [wrong, setWrong] = useState<number[]>([]);
  const [phase, setPhase] = useState<"study" | "retry" | "done">("study");
  const [firstRound, setFirstRound] = useState(true);
  const [showWhy, setShowWhy] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [index, setIndex] = useState(0),
    [selected, setSelected] = useState<number>(),
    [checked, setChecked] = useState(false),
    [correct, setCorrect] = useState(0);
  const done = phase === "done";
  const progress = phase !== "study" ? 100 : Math.round(((index + (checked ? 1 : 0)) / queue.length) * 100);
  const sound = useRef<ReturnType<typeof createMathSound> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const audio = createMathSound();
    sound.current = audio;
    return () => audio.dispose();
  }, []);
  useEffect(() => heading.current?.focus(), [index, phase]);
  const q = quiz.questions[queue[index] ?? -1];
  function verify() {
    if (selected === undefined || checked || !q) return;
    const right = selected === q.answer;
    sound.current?.unlock();
    sound.current?.play(right ? "correct" : "wrong");
    if (firstRound && right) setCorrect((n) => n + 1);
    if (!right) setWrong((list) => [...list, queue[index]!]);
    setChecked(true);
  }
  function next() {
    if (index + 1 === queue.length) {
      if (firstRound) {
        onComplete(correct, quiz.questions.length);
        setElapsed(Date.now() - startedAt);
      }
      if (firstRound && wrong.length) setPhase("retry");
      else setPhase("done");
    } else {
      setIndex((n) => n + 1);
      setSelected(undefined);
      setChecked(false);
      setShowWhy(false);
    }
  }
  function startRound(ids: number[]) {
    setQueue(ids);
    setWrong([]);
    setIndex(0);
    setSelected(undefined);
    setChecked(false);
    setShowWhy(false);
    setPhase("study");
  }
  return createPortal(
    <section className="flashcard-study source-quiz-study" aria-label={title}>
      <header className="flashcard-study__top">
        <button
          type="button"
          className="library-icon"
          aria-label={uiText("Sair do quiz")}
          onClick={onClose}
        >
          <PaperCloseIcon />
        </button>
        <div
          className="flashcard-study__progress"
          role="progressbar"
          aria-label={uiText("Progresso do quiz")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: progress + "%" }} />
        </div>
      </header>
      <div className="flashcard-study__body">
        <h2 ref={heading} tabIndex={-1} className="flashcard-study__title">
          {title}
        </h2>
        {phase === "retry" ? (
          <div className="source-quiz-result">
            <img src="/room-icons/quiz.svg" alt="" width="72" height="72" />
            <h3>{uiText("Vamos rever as perguntas que você errou.")}</h3>
            <button
              type="button"
              className="shelf-wood-button"
              onClick={() => {
                setFirstRound(false);
                startRound(wrong);
              }}
            >
              {uiText("Continuar")}
            </button>
          </div>
        ) : done ? (
          <>
            <img src="/room-icons/quiz.svg" alt="" width="72" height="72" />
            <h3>
              {uiText(
                correct / quiz.questions.length >= 0.8 ? "Excelente trabalho!" : "Não desista!",
              )}
            </h3>
            <span className="visually-hidden">{uiText("Quiz concluído")}</span>
            <dl className="flashcard-study__stats">
              <div>
                <dt>{uiText("Pontuação")}</dt>
                <dd role="status">
                  {correct} / {quiz.questions.length} {uiText("acertos")}
                </dd>
              </div>
              <div>
                <dt>{uiText("Tempo")}</dt>
                <dd>
                  {Math.floor(elapsed / 60000)}:
                  {String(Math.floor(elapsed / 1000) % 60).padStart(2, "0")}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className="shelf-wood-button"
              onClick={() => {
                setFirstRound(true);
                setCorrect(0);
                setStartedAt(Date.now());
                setElapsed(0);
                startRound(quiz.questions.map((_, i) => i));
              }}
            >
              {uiText("Tentar novamente")}
            </button>
            <button type="button" className="shelf-wood-button" onClick={onClose}>
              {uiText("Voltar à pasta")}
            </button>
          </>
        ) : (
          q && (
            <>
              <div className="source-quiz-question" key={index}>
                <img src="/room-icons/quiz.svg" alt="" width="48" height="48" />
                <div>
                  <small>
                    {index + 1} {uiText("de")} {queue.length}
                  </small>
                  <h3>{uiText("Complete a afirmação com a alternativa correta.")}</h3>
                  <p>{q.prompt}</p>
                </div>
              </div>
              <div className="source-quiz-answers" role="group" aria-label={uiText("Alternativas")}>
                {q.options.map((option, i) => (
                  <button
                    type="button"
                    className="shelf-wood-button"
                    key={i}
                    aria-pressed={selected === i}
                    disabled={checked}
                    data-result={
                      checked
                        ? i === q.answer
                          ? "right"
                          : i === selected
                            ? "wrong"
                            : undefined
                        : undefined
                    }
                    onClick={() => setSelected(i)}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {option}
                  </button>
                ))}
              </div>
              {checked && (
                <div
                  className="source-quiz-feedback"
                  data-result={selected === q.answer ? "right" : "wrong"}
                  role="status"
                >
                  <strong>
                    {uiText(selected === q.answer ? "Correto!" : "Não foi dessa vez.")}
                  </strong>
                  {showWhy && (
                    <div className="source-quiz-explanation">
                      <p>{q.explanation}</p>
                      <small>
                        {q.sourceTitle} · {uiText("Página")} {q.page}
                      </small>
                    </div>
                  )}
                  <div className="source-quiz-feedback-actions">
                    <button
                      type="button"
                      className="shelf-wood-button"
                      aria-expanded={showWhy}
                      onClick={() => setShowWhy(!showWhy)}
                    >
                      {uiText("Por quê?")}
                    </button>
                    <button type="button" className="shelf-wood-button" onClick={next}>
                      {uiText("Entendi")}
                    </button>
                  </div>
                </div>
              )}
              {!checked && (
                <button
                  type="button"
                  className="shelf-wood-button source-quiz-verify"
                  disabled={selected === undefined}
                  onClick={verify}
                >
                  {uiText("Verificar")}
                </button>
              )}
            </>
          )
        )}
      </div>
    </section>,
    document.body,
  );
}
