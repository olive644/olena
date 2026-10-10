import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { MATH_COURSES, type MathCourseId, type MathProgress } from "../data/math-courses";
import {
  mathLearning,
  requestMath,
  saveMathLearning,
  type MathApiResult,
} from "../data/math-learning";
import type { MathChallenge } from "../domain/adaptive-math";
import { isMotionReduced } from "../data/accessibility-preferences";
import { createMathSound } from "../data/math-sound";
import type { RoomXpReward } from "../domain/local-room";
import { RoomRewardNotice } from "./room-reward-notice";
import { PaperArrow } from "./paper-arrow";
import { RoomPointsIcon, RoomClockIcon, RoomSecondsUnit } from "./room-paper-icons";
import { PaperDigits } from "./paper-digits";
import { MathNumber, MathExpression, MathIcon, MathUserAvatar } from "./math-paper-art";
import { HelenaLoading } from "./helena-loading";
import "./math-arcade.css";
import "./math-island-journey.css";
import "../paper-buttons.css";
import "./room-stage.css";

type Round = {
  question: MathChallenge | null;
  progress: MathProgress;
  points: number;
  streak: number;
  lives: number;
  bank: number;
  elapsed: number;
};
export function MathArcade({
  onBack,
  courseId = "foundations",
}: {
  onBack: () => void;
  courseId?: MathCourseId;
}) {
  const course = MATH_COURSES.find((item) => item.id === courseId)!;
  const [round, setRound] = useState<Round>(() => ({
    question: null,
    progress: mathLearning(courseId),
    points: 0,
    streak: 0,
    lives: 3,
    bank: 60,
    elapsed: 0,
  }));
  const [status, setStatus] = useState<"ready" | "countdown" | "playing" | "leaving">("ready");
  const [countdown, setCountdown] = useState(3);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<
    (MathApiResult & { choice: number | null; timedOut: boolean }) | null
  >(null);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [reward, setReward] = useState<RoomXpReward | undefined>();
  const roundId = useRef("");
  const root = useRef<HTMLElement>(null);
  const controller = useRef<AbortController | null>(null);
  const answerLock = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryChoice = useRef<{ choice: number; timedOut: boolean } | null>(null);
  const finished = status === "playing" && !feedback && (round.lives === 0 || round.bank <= 0);
  const question = round.question;
  const clock = question ? Math.max(0, question.budget - round.elapsed * question.drain) : 0;
  const audio = useRef<ReturnType<typeof createMathSound> | null>(null);

  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      controller.current?.abort();
      audio.current?.dispose();
      audio.current = null;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  useEffect(() => {
    root.current
      ?.querySelector<HTMLButtonElement>(
        status === "playing" && !finished ? ".math-answer-button" : ".math-start-button",
      )
      ?.focus();
  }, [status, finished]);
  useEffect(() => {
    if (status !== "countdown" || pending) return;
    audio.current?.play(countdown as 1 | 2 | 3);
    const timer = setTimeout(
      () => (countdown === 1 ? setStatus("playing") : setCountdown((value) => value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [status, countdown, pending]);
  useEffect(() => {
    if (status !== "playing" || pending || feedback || error || finished) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        delta = Math.min(1, (now - previous) / 1000);
      previous = now;
      if (document.hidden) return;
      setRound((value) => ({
        ...value,
        elapsed: value.elapsed + delta,
        bank: Math.max(0, value.bank - delta * (value.question?.drain ?? 1)),
      }));
    }, 100);
    return () => clearInterval(timer);
  }, [status, pending, feedback, error, finished]);
  useEffect(() => {
    if (!finished) return;
    audio.current?.play("finish");
    const rewardTimer = window.setTimeout(() => {
      setReward({
        id: roundId.current,
        place: 1,
        xp: Math.ceil(round.points / 5),
        completedAt: Date.now(),
      });
    }, 0);
    let frame = 0;
    const start = performance.now();
    const animate = () => {
      const ratio = isMotionReduced() ? 1 : Math.min(1, (performance.now() - start) / 1200);
      setDisplayedScore(Math.round(round.points * (1 - (1 - ratio) ** 3)));
      if (ratio < 1) frame = requestAnimationFrame(animate);
      else if (round.points > 0) {
        audio.current?.play("xp");
      }
    };
    frame = requestAnimationFrame(animate);
    return () => {
      window.clearTimeout(rewardTimer);
      cancelAnimationFrame(frame);
    };
  }, [finished, round.points]);

  async function api(input: Parameters<typeof requestMath>[0]) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    return requestMath(input, AbortSignal.any([current.signal, AbortSignal.timeout(10000)]));
  }
  async function start() {
    if (answerLock.current || pending) return;
    audio.current ??= createMathSound();
    audio.current.unlock();
    audio.current.play("start");
    setPending(true);
    setError("");
    retryChoice.current = null;
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    try {
      const progress = mathLearning(courseId);
      const result = await api({ action: "question", course: courseId, progress });
      if (controller.current?.signal.aborted) return;
      setRound({
        question: result.question,
        progress: result.progress,
        points: 0,
        streak: 0,
        lives: 3,
        bank: 60,
        elapsed: 0,
      });
      setFeedback(null);
      setReward(undefined);
      roundId.current = "math:" + courseId + ":" + crypto.randomUUID();
      setCountdown(3);
      setStatus("countdown");
      setDisplayedScore(0);
    } catch (cause) {
      if (!controller.current?.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Não foi possível preparar a conta.");
    } finally {
      setPending(false);
    }
  }
  async function answer(choice: number, timedOut = false) {
    if (!question || status !== "playing" || finished || answerLock.current || feedback) return;
    if (!timedOut) {
      audio.current ??= createMathSound();
      audio.current.unlock();
    }
    answerLock.current = true;
    setPending(true);
    setError("");
    retryChoice.current = { choice, timedOut };
    try {
      const result = await api({
        action: "answer",
        course: courseId,
        progress: round.progress,
        question,
        choice,
        elapsed: Math.min(120, round.elapsed),
        streak: round.streak,
        timedOut,
      });
      if (controller.current?.signal.aborted) return;
      const points = round.points + result.points;
      const progress = { ...result.progress, best: Math.max(result.progress.best, points) };
      setStorageWarning(!saveMathLearning(courseId, progress));
      const missed = result.timedOut;
      audio.current?.play(missed ? "timeout" : result.correct ? "correct" : "wrong");
      setRound((value) => ({
        ...value,
        progress,
        points,
        streak: result.streak,
        lives: value.lives - Number(!result.correct),
        bank: missed
          ? Math.max(0, value.bank - 4)
          : result.correct
            ? Math.min(90, value.bank + (result.fast ? 3 : 2))
            : value.bank,
      }));
      setFeedback({ ...result, choice: missed ? null : choice });
      retryChoice.current = null;
      feedbackTimer.current = setTimeout(
        () => {
          setRound((value) => ({ ...value, question: result.question, elapsed: 0 }));
          setFeedback(null);
          answerLock.current = false;
        },
        result.correct ? 650 : 1300,
      );
    } catch (cause) {
      if (!controller.current?.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Não foi possível avaliar a resposta.");
      answerLock.current = false;
    } finally {
      setPending(false);
    }
  }
  const expire = useEffectEvent(() => {
    if (question)
      void answer(
        question.choices.find((choice) => choice !== question.answer)!,
        true,
      );
  });
  useEffect(() => {
    if (clock > 0 || !question || status !== "playing" || finished || feedback || pending || error)
      return;
    const timer = setTimeout(() => {
      expire();
    }, 0);
    return () => clearTimeout(timer);
  }, [clock, question, status, finished, feedback, pending, error]);
  useEffect(() => {
    if (status !== "leaving") return;
    const timer = setTimeout(onBack, isMotionReduced() ? 0 : 650);
    return () => clearTimeout(timer);
  }, [status, onBack]);

  return createPortal(
    <section
      ref={root}
      className={
        "math-arcade math-arcade--adaptive is-" + status + (finished ? " is-finished" : "")
      }
      aria-label="Laboratório das contas"
      style={
        {
          "--math-color": course.color,
          "--math-shade": course.shade,
          "--math-light": course.light,
        } as CSSProperties
      }
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const buttons =
            root.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
          const first = buttons?.[0],
            last = buttons?.[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
        if (
          !event.repeat &&
          /^[1-4]$/.test(event.key) &&
          status === "playing" &&
          !finished &&
          !pending &&
          !error &&
          !feedback
        ) {
          event.preventDefault();
          const index = Number(event.key) - 1;
          root.current?.querySelectorAll<HTMLButtonElement>(".math-answer-button")[index]?.focus();
          void answer(question!.choices[index]!);
        }
      }}
    >
      <button
        className="secondary-button math-world-back"
        type="button"
        disabled={status === "leaving"}
        onClick={() => {
          controller.current?.abort();
          setStatus("leaving");
        }}
      >
        <PaperArrow back /> Voltar às ilhas
      </button>
      <div className="math-game-landscape" aria-hidden="true">
        <img src={"/math-islands/" + courseId + ".webp"} alt="" />
      </div>
      <div className="math-game-floor" aria-hidden="true" />
      <main className="math-arcade-stage">
        {status === "ready" ? (
          <div className="math-welcome">
            <h1 className="visually-hidden">{course.title}</h1>
            <div className="math-course-emblem">
              <img src={"/math-islands/" + courseId + ".webp"} alt={course.title} />
              <MathUserAvatar />
            </div>
            <button
              className="primary-button math-start-button"
              type="button"
              disabled={pending}
              onClick={() => void start()}
            >
              <MathIcon name="start" /> Vamos calcular!
            </button>
          </div>
        ) : status === "countdown" ? (
          <div className="math-countdown" role="status" aria-live="assertive">
            <MathUserAvatar />
            <span key={countdown}>
              <PaperDigits value={String(countdown)} />
            </span>
          </div>
        ) : finished ? (
          <div className="math-results" aria-live="polite">
            <div className="math-result-burst" aria-hidden="true">
              {Array.from({ length: 16 }, (_, index) => (
                <i key={index} style={{ "--spark-index": index } as CSSProperties} />
              ))}
            </div>
            <MathUserAvatar mood="finished" />
            <h1 className="visually-hidden">{round.points + " pontos"}</h1>
            <div className="math-result-score" aria-hidden="true">
              <RoomPointsIcon />
              <MathNumber value={displayedScore} />
            </div>
            <p>
              {round.points > 0 ? "Você mandou bem!" : "A próxima tentativa é uma nova chance!"}
            </p>
            <span className="math-result-topic">{course.topics[round.progress.level]}</span>
            <button
              className="primary-button math-start-button"
              type="button"
              disabled={pending}
              onClick={() => void start()}
            >
              <MathIcon name="retry" /> Tentar de novo
            </button>
          </div>
        ) : question ? (
          <>
            <div className="math-game-stats">
              <div className="math-score" aria-label={round.points + " pontos"}>
                <RoomPointsIcon />
                <MathNumber value={round.points} />
              </div>
              <div
                className="math-time"
                aria-label={Math.ceil(clock) + " segundos para esta conta"}
              >
                <RoomClockIcon />
                <MathNumber value={Math.ceil(clock)} />
                <RoomSecondsUnit />
              </div>
              <div className="math-hearts" aria-label={round.lives + " chances restantes"}>
                {Array.from({ length: 3 }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index < round.lives
                        ? ""
                        : feedback && !feedback.correct && index === round.lives
                          ? "is-breaking"
                          : "is-empty"
                    }
                  >
                    <MathIcon name="heart" />
                    {feedback && !feedback.correct && index === round.lives && (
                      <MathIcon name="heart" />
                    )}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="math-reserve"
              role="progressbar"
              aria-label="Reserva de tempo"
              aria-valuemin={0}
              aria-valuemax={90}
              aria-valuenow={Math.round(round.bank)}
            >
              <span style={{ width: (round.bank / 90) * 100 + "%" }} />
            </div>
            <div className="math-game-question">
              <MathUserAvatar />
              <span className="math-topic">{question.topic}</span>
              <h1 aria-label={"Quanto é " + question.expression + "?"}>
                <MathExpression value={question.expression} />
                {!question.expression.includes("?") && (
                  <>
                    <span aria-hidden="true" className="math-equals">
                      =
                    </span>
                    <MathIcon name="question" />
                  </>
                )}
              </h1>
              {round.streak > 3 && (
                <div className="math-insane" role="status">
                  <MathIcon name="flame" />
                  <span>
                    VOCÊ ESTÁ INSANO! <b>{round.streak}×</b>
                  </span>
                </div>
              )}
              {feedback?.timedOut && (
                <div className="math-timeout-reaction" role="status">
                  <b>{feedback.message}</b>
                  <span>
                    −<MathNumber value={4} />
                    <RoomSecondsUnit />
                  </span>
                </div>
              )}
            </div>
            <div className="math-answers">
              {question.choices.map((choice, index) => (
                <div className="math-answer-wrap" key={index}>
                  <button
                    className="math-answer-button"
                    type="button"
                    data-tone={index}
                    data-feedback={
                      feedback?.choice === choice
                        ? feedback.correct
                          ? "correct"
                          : "wrong"
                        : undefined
                    }
                    aria-label={"Resposta " + choice}
                    aria-disabled={pending || !!feedback || !!error}
                    onClick={() => {
                      if (!pending && !error) {
                        audio.current?.unlock();
                        void answer(choice);
                      }
                    }}
                  >
                    <span className="math-answer-key" aria-hidden="true">
                      {index + 1}
                    </span>
                    <MathNumber value={choice} />
                    <span className="math-answer-fold" aria-hidden="true" />
                  </button>
                  {feedback?.choice === choice && (
                    <div
                      className={
                        "math-answer-reaction " + (feedback.correct ? "is-correct" : "is-wrong")
                      }
                      role="status"
                    >
                      <MathUserAvatar mood={feedback.correct ? "correct" : "wrong"} />
                      <div>
                        <b>{feedback.message}</b>
                        {feedback.correct ? (
                          <span>
                            <RoomPointsIcon />+<MathNumber value={feedback.points} />
                          </span>
                        ) : (
                          <span>
                            Era <MathNumber value={question.answer} />
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}
        {pending && (
          <div className="math-api-loading">
            <HelenaLoading compact label="Preparando conta" />
            <span className="visually-hidden">Preparando conta com a Olena</span>
          </div>
        )}
        {error && (
          <div role="alert" className="math-api-error">
            <p>{error}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                retryChoice.current === null
                  ? void start()
                  : void answer(retryChoice.current.choice, retryChoice.current.timedOut)
              }
            >
              Tentar novamente
            </button>
          </div>
        )}
        {storageWarning && (
          <p role="alert" className="math-storage-warning">
            Não foi possível salvar seu avanço neste aparelho.
          </p>
        )}
      </main>
      {finished && (
        <RoomRewardNotice
          reward={reward}
          activity="mathematics"
          delayMs={isMotionReduced() ? 0 : 1200}
        />
      )}
    </section>,
    document.body,
  );
}
