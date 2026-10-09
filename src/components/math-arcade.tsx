import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { arithmeticPoints, createArithmeticQuestion } from "../data/math-arcade";
import { PaperArrow } from "./paper-arrow";
import "./math-arcade.css";

type Round = {
  correct: number;
  streak: number;
  score: number;
  lives: number;
  question: ReturnType<typeof createArithmeticQuestion>;
};
const freshRound = (): Round => ({
  correct: 0,
  streak: 0,
  score: 0,
  lives: 3,
  question: createArithmeticQuestion(0),
});

export function MathArcade({ onBack }: { onBack: () => void }) {
  const [round, setRound] = useState(freshRound);
  const [status, setPhase] = useState<"ready" | "playing">("ready");
  const [remaining, setRemaining] = useState(60);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    text: string;
    choice: number;
  } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerLock = useRef(false);
  const answers = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const phase =
    status === "playing" && (remaining === 0 || round.lives === 0) ? "finished" : status;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  useEffect(() => {
    root.current
      ?.querySelector<HTMLButtonElement>(
        phase === "playing" ? ".math-arcade-answers button" : ".primary-button",
      )
      ?.focus();
  }, [phase]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  function start() {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    answerLock.current = false;
    setFeedback(null);
    setRound(freshRound());
    setRemaining(60);
    setPhase("playing");
  }

  function answer(choice: number) {
    if (phase !== "playing" || answerLock.current || remaining === 0 || round.lives === 0) return;
    answerLock.current = true;
    const correct = choice === round.question.answer;
    const streak = correct ? round.streak + 1 : 0;
    const points = correct ? arithmeticPoints(streak) : 0;
    setFeedback({
      correct,
      choice,
      text: correct ? `BOA! +${points}` : `Resposta: ${round.question.answer}`,
    });
    setRound((previous) => ({
      ...previous,
      streak,
      score: previous.score + points,
      correct: previous.correct + Number(correct),
      lives: previous.lives - Number(!correct),
    }));
    feedbackTimer.current = setTimeout(
      () => {
        setFeedback(null);
        setRound((previous) => ({
          ...previous,
          question: createArithmeticQuestion(previous.correct),
        }));
        answerLock.current = false;
      },
      correct ? 500 : 1100,
    );
  }

  return createPortal(
    <section
      ref={root}
      className="math-arcade"
      aria-label="Laboratório das contas"
      onKeyDown={(event) => {
        if (!event.repeat && /^[1-4]$/.test(event.key) && phase === "playing") {
          event.preventDefault();
          const index = Number(event.key) - 1;
          answers.current?.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
          answer(round.question.choices[index]!);
        }
      }}
    >
      <header className="math-arcade-header">
        <button className="secondary-button math-arcade-back" type="button" onClick={onBack}>
          <PaperArrow back /> Voltar às ilhas
        </button>
        <span>
          MATEMÁTICA BÁSICA <small>Protótipo local</small>
        </span>
      </header>
      <div className="math-arcade-scenery" aria-hidden="true">
        <span>+</span>
        <span>×</span>
        <span>÷</span>
        <span>−</span>
      </div>
      <main className="math-arcade-stage">
        {phase === "ready" ? (
          <div className="math-arcade-intro">
            <div className="math-arcade-crest" aria-hidden="true">
              ×<b>+</b>÷
            </div>
            <p className="math-arcade-eyebrow">PICOS DOS PADRÕES</p>
            <h1>
              Laboratório
              <br />
              das contas
            </h1>
            <p>60 segundos. 3 chances. Quanto maior sua sequência, mais pontos!</p>
            <div className="math-arcade-rules">
              <span>01 · Some</span>
              <span>02 · Subtraia</span>
              <span>03 · Multiplique</span>
              <span>04 · Misture</span>
            </div>
            <button className="primary-button" type="button" onClick={start}>
              Vamos calcular!
            </button>
            <small>
              Toque nas respostas ou use as teclas 1, 2, 3 e 4.
              <br />
              Pontos de demonstração, sem XP ou progresso da conta.
            </small>
          </div>
        ) : phase === "finished" ? (
          <div className="math-arcade-intro" aria-live="polite">
            <div className="math-arcade-crest" aria-hidden="true">
              ★
            </div>
            <p className="math-arcade-eyebrow">RODADA CONCLUÍDA</p>
            <h1 aria-label={`${round.score} pontos`}>
              {round.score}
              <small>pontos</small>
            </h1>
            <p>{round.correct} contas resolvidas. Cada tentativa faz parte do aprendizado.</p>
            <button className="primary-button" type="button" onClick={start}>
              Tentar de novo
            </button>
            <small>Pontuação local deste protótipo. Não concede XP.</small>
          </div>
        ) : (
          <>
            <div className="math-arcade-stats">
              <span>
                <small>PONTOS</small>
                <b>{round.score}</b>
              </span>
              <span>
                <small>TEMPO</small>
                <b>{remaining}s</b>
              </span>
              <span aria-label={`${round.lives} chances restantes`}>
                <small>CHANCES</small>
                <b className="math-arcade-hearts">
                  {"♥".repeat(round.lives)}
                  {"♡".repeat(3 - round.lives)}
                </b>
              </span>
            </div>
            <div
              className="math-arcade-clock"
              role="progressbar"
              aria-label="Tempo restante"
              aria-valuemin={0}
              aria-valuemax={60}
              aria-valuenow={remaining}
            >
              <span style={{ width: `${(remaining / 60) * 100}%` }} />
            </div>
            <div className="math-arcade-equation">
              <p>{round.question.stage}</p>
              <h1 aria-label={`Quanto é ${round.question.expression}?`}>
                {round.question.expression}
                <span>= ?</span>
              </h1>
              <span className="math-arcade-chain">
                {round.streak > 1
                  ? `${round.streak} acertos em sequência!`
                  : "Encontre o resultado"}
              </span>
            </div>
            <div className="math-arcade-answers" ref={answers}>
              {round.question.choices.map((choice, index) => (
                <div className="math-arcade-answer" key={index}>
                  <button
                    type="button"
                    aria-label={`Resposta ${choice}`}
                    aria-disabled={!!feedback}
                    data-tone={index}
                    data-feedback={
                      feedback?.choice === choice
                        ? feedback.correct
                          ? "correct"
                          : "wrong"
                        : undefined
                    }
                    onClick={() => answer(choice)}
                  >
                    <small>{index + 1}</small>
                    <b>{choice}</b>
                    <span aria-hidden="true">✦</span>
                  </button>
                  {feedback?.choice === choice && (
                    <span
                      role="status"
                      className={`math-arcade-reaction ${feedback.correct ? "is-correct" : "is-wrong"}`}
                    >
                      {feedback.text}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="math-arcade-keyboard">Toque no resultado · Teclas 1 a 4</p>
          </>
        )}
      </main>
    </section>,
    document.body,
  );
}
