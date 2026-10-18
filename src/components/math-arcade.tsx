import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { MATH_COURSES, type MathCourseId } from "../data/math-courses";
import {
  mathGameLearning as mathLearning,
  saveMathGame as saveMathLearning,
  readMathGame,
} from "../data/math-game-learning";
import {
  requestMastery as requestMath,
  type MasteryResult as MathApiResult,
} from "../domain/math-mastery-engine";
import {
  unlockedMasteryCourse as unlockedMathCourse,
  masteryCompletion,
  type MasteryProgress as MathProgress,
} from "../domain/math-mastery-progress";
import type { MasteryQuestion as MathChallenge } from "../domain/math-mastery-engine";
import type { PracticeActivity } from "../domain/workspace";
import { isMotionReduced } from "../data/accessibility-preferences";
import { createMathSound } from "../data/math-sound";
import type { RoomXpReward } from "../domain/local-room";
import { RoomRewardNotice } from "./room-reward-notice";
import { PaperArrow } from "./paper-arrow";
import { RoomPointsIcon, RoomClockIcon, RoomSecondsUnit } from "./room-paper-icons";
import { PaperDigits, PaperDigitsSource } from "./paper-digits";
import paperDigitsSvg from "../../public/paper-digits.svg?raw";
import { MathNumber, MathExpression, MathIcon, MathUserAvatar } from "./math-paper-art";
import { formatMathNotation } from "../domain/math-notation";
import { HelenaLoading } from "./helena-loading";
import { MathPlaceScene } from "./math-place-scene";
import { COMMON_CHEST_POINTS, finishMathPlace, type MathChest } from "../data/math-place-rewards";
import { ACCOUNT_OWNER_KEY } from "../data/personal-data";
import { SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";
import { CommonMathChest } from "./math-place-treasure";
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
// Arte estática do repositório, nunca HTML fornecido pelo usuário.
const mathDigitsSvg = paperDigitsSvg
  .replaceAll('id="', 'id="math-')
  .replaceAll("url(#", "url(#math-");
export function MathArcade({
  onBack,
  courseId = "foundations",
  onChestReturn,
  onPractice,
  onNextCourse,
}: {
  onBack: () => void;
  onPractice?: ((activity: PracticeActivity) => void) | undefined;
  onNextCourse?: ((course: MathCourseId) => void) | undefined;
  courseId?: MathCourseId;
  onChestReturn?:
    ((origin: { x: number; y: number; size: number; id: string }) => void) | undefined;
}) {
  useLanguage();

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
  const [milestone, setMilestone] = useState<MathApiResult["milestone"]>(null);
  const [completedCourse, setCompletedCourse] = useState(false);
  const nextCourse = MATH_COURSES[MATH_COURSES.findIndex((item) => item.id === courseId) + 1];
  const [storageWarning, setStorageWarning] = useState(false);
  const [earnedChest, setEarnedChest] = useState<MathChest | undefined>();
  const [displayedScore, setDisplayedScore] = useState(0);
  const [reward, setReward] = useState<RoomXpReward | undefined>();
  const roundId = useRef("");
  const answerSequence = useRef(0);
  const roundOwner = useRef<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const controller = useRef<AbortController | null>(null);
  const answerLock = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryChoice = useRef<{ choice: number; timedOut: boolean } | null>(null);
  const finished =
    status === "playing" && !feedback && (round.lives === 0 || round.bank <= 0 || completedCourse);
  const question = round.question;
  const expression = question ? formatMathNotation(question.expression) : "";
  const questionClock = question
    ? Math.max(0, question.budget - round.elapsed * question.drain)
    : 0;
  // A rodada pode acabar antes do prazo individual. Mostrar sempre o prazo real.
  const clock = Math.min(questionClock, round.bank);
  const audio = useRef<ReturnType<typeof createMathSound> | null>(null);
  const exitChangedAccount = useEffectEvent(onBack);
  useEffect(() => {
    const owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
    function checkOwner() {
      if (owner === localStorage.getItem(ACCOUNT_OWNER_KEY)) return;
      controller.current?.abort();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      exitChangedAccount();
    }
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, checkOwner);
    window.addEventListener("storage", checkOwner);
    return () => {
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, checkOwner);
      window.removeEventListener("storage", checkOwner);
    };
  }, []);

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
  }, [status, finished, milestone]);
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
    if (status !== "playing" || pending || feedback || milestone || error || finished) return;
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
  }, [status, pending, feedback, milestone, error, finished]);
  useEffect(() => {
    if (!finished) return;
    audio.current?.play("finish");
    const settlementTimer = window.setTimeout(() => {
      if (roundOwner.current !== localStorage.getItem(ACCOUNT_OWNER_KEY)) return;
      try {
        const saved = finishMathPlace(courseId, roundId.current, round.points);
        setEarnedChest(saved.chests.find((chest) => chest.id === roundId.current));
      } catch {
        setStorageWarning(true);
      }
    }, 0);
    const rewardTimer = window.setTimeout(() => {
      if (roundOwner.current !== localStorage.getItem(ACCOUNT_OWNER_KEY)) return;
      if (round.points === 0) return;
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
      window.clearTimeout(settlementTimer);
      cancelAnimationFrame(frame);
    };
  }, [finished, round.points, courseId]);

  async function api(input: Parameters<typeof requestMath>[0]) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    return requestMath(input, AbortSignal.any([current.signal, AbortSignal.timeout(10000)]));
  }
  async function start() {
    if (!unlockedMathCourse(courseId, readMathGame())) {
      setError(uiText(594));
      return;
    }
    setEarnedChest(undefined);
    if (answerLock.current || pending) return;
    audio.current ??= createMathSound();
    audio.current.unlock();
    audio.current.play("start");
    setPending(true);
    roundOwner.current = localStorage.getItem(ACCOUNT_OWNER_KEY);
    setError("");
    setMilestone(null);
    setCompletedCourse(false);
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
      answerSequence.current = 0;
      setCountdown(3);
      setStatus("countdown");
      setDisplayedScore(0);
    } catch (cause) {
      if (!controller.current?.signal.aborted)
        setError(cause instanceof Error ? cause.message : uiText(595));
    } finally {
      setPending(false);
    }
  }
  async function answer(choice: number, timedOut = false) {
    if (
      !question ||
      status !== "playing" ||
      finished ||
      answerLock.current ||
      feedback ||
      milestone
    )
      return;
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
      onPractice?.({
        id: `${roundId.current}:${question.seed}:${++answerSequence.current}`,
        islandId: `mathematics:${courseId}`,
        islandName: uiText(1782, [course.subject]),
        completedAt: new Date().toISOString(),
        answers: 1,
        correct: Number(result.correct),
      });
      const missed = result.timedOut;
      audio.current?.play(missed ? "timeout" : result.correct ? "correct" : "wrong");
      setRound((value) => ({
        ...value,
        progress,
        points,
        streak: result.streak,
        lives: value.lives - Number(!result.correct),
        bank:
          result.question.phase === "final" && question.phase !== "final"
            ? Math.max(60, value.bank)
            : missed
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
          if (result.question.phase === "final" && question.phase !== "final")
            audio.current?.play("start");
          if (result.milestone) {
            setMilestone(result.milestone);
            setCompletedCourse(result.milestone.courseComplete);
            audio.current?.play("mastery");
          }
          answerLock.current = false;
        },
        result.correct ? 650 : 1300,
      );
    } catch {
      if (!controller.current?.signal.aborted) setError(uiText(596));
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
    if (
      questionClock > 0 ||
      !question ||
      status !== "playing" ||
      finished ||
      feedback ||
      milestone ||
      pending ||
      error
    )
      return;
    const timer = setTimeout(() => {
      expire();
    }, 0);
    return () => clearTimeout(timer);
  }, [questionClock, question, status, finished, feedback, milestone, pending, error]);
  useEffect(() => {
    if (milestone)
      root.current?.querySelector<HTMLButtonElement>(".math-mastery-continue")?.focus();
  }, [milestone]);
  useEffect(() => {
    if (status !== "leaving") return;
    const timer = setTimeout(onBack, isMotionReduced() ? 0 : 650);
    return () => clearTimeout(timer);
  }, [status, onBack]);

  return createPortal(
    <PaperDigitsSource source="#math-">
      <section
        ref={root}
        className={
          "math-arcade math-arcade--adaptive is-" + status + (finished ? " is-finished" : "")
        }
        aria-label={uiText(597)}
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
            !feedback &&
            !milestone
          ) {
            event.preventDefault();
            const index = Number(event.key) - 1;
            root.current
              ?.querySelectorAll<HTMLButtonElement>(".math-answer-button")
              [index]?.focus();
            void answer(question!.choices[index]!);
          }
        }}
      >
        <div
          className="math-digit-definitions"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: mathDigitsSvg }}
        />
        <button
          className="secondary-button math-world-back"
          type="button"
          disabled={status === "leaving"}
          onClick={() => {
            controller.current?.abort();
            setStatus("leaving");
          }}
        >
          <PaperArrow back /> {uiText(598)}
        </button>
        <div className="math-game-landscape" aria-hidden="true">
          <MathPlaceScene course={courseId} />
        </div>
        <div className="math-background-symbols" aria-hidden="true">
          {["+", "−", uiText(289), uiText(1783), "=", "%", "π", "√", "∑", "∞", "±", "∫"].map(
            (symbol, index) => (
              <span key={symbol} style={{ "--symbol": index } as CSSProperties}>
                {symbol}
              </span>
            ),
          )}
        </div>
        <div className="math-game-floor" aria-hidden="true" />
        <main className="math-arcade-stage" aria-busy={pending} data-question-seed={question?.seed}>
          {status === "ready" ? (
            <div className="math-welcome">
              <h1 className="visually-hidden">{course.title}</h1>
              <div className="math-course-emblem">
                <MathPlaceScene course={courseId} animate />
                <MathUserAvatar />
              </div>
              <button
                className="primary-button math-start-button"
                type="button"
                disabled={pending}
                onClick={() => void start()}
              >
                <MathIcon name="start" /> {uiText(599)}
              </button>
            </div>
          ) : status === "countdown" ? (
            <div className="math-countdown" role="status" aria-live="assertive">
              <MathUserAvatar />
              <span key={countdown}>
                <PaperDigits value={String(countdown)} />
              </span>
            </div>
          ) : milestone ? (
            <div className="math-mastery" role="status">
              <div className="math-result-burst" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => (
                  <i key={index} style={{ "--spark-index": index } as CSSProperties} />
                ))}
              </div>
              <MathUserAvatar mood="correct" />
              <div className="math-mastery-seal" aria-hidden="true">
                <RoomPointsIcon />
                <MathNumber value={100} />%
              </div>
              <h1>{uiText(600)}</h1>
              <strong>{milestone.topic}</strong>
              <p>{uiText(601)}</p>
              {milestone.courseComplete ? (
                <p>
                  {uiText(602)} {nextCourse ? uiText(1784, [nextCourse.title]) : uiText(603)}
                </p>
              ) : (
                <p>
                  {uiText(604)} {course.topics[masteryCompletion(round.progress).level]}.
                </p>
              )}
              <button
                type="button"
                className="primary-button math-mastery-continue"
                onClick={() => {
                  audio.current?.unlock();
                  setMilestone(null);
                }}
              >
                {milestone.courseComplete ? uiText(1785) : uiText(1786)}
                <PaperArrow />
              </button>
            </div>
          ) : finished ? (
            <div className="math-results" aria-live="polite">
              <div className="math-result-burst" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => (
                  <i key={index} style={{ "--spark-index": index } as CSSProperties} />
                ))}
              </div>
              <MathUserAvatar mood="finished" />
              <h1 className="visually-hidden">{round.points + uiText(2292)}</h1>
              <div className="math-result-score" aria-hidden="true">
                <RoomPointsIcon />
                <MathNumber value={displayedScore} />
              </div>
              <p>{round.points > 0 ? uiText(605) : uiText(606)}</p>
              <span className="math-result-topic">
                {course.topics[masteryCompletion(round.progress).level]}
              </span>
              {completedCourse && nextCourse && onNextCourse && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onNextCourse(nextCourse.id)}
                >
                  {uiText(607)} {nextCourse.title}
                  <PaperArrow />
                </button>
              )}
              {earnedChest && (
                <button
                  type="button"
                  className="math-earned-chest"
                  aria-label={uiText(608)}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    audio.current?.play("chestUnlock");
                    if (onChestReturn)
                      onChestReturn({
                        x: rect.x + rect.width / 2,
                        y: rect.y + rect.height / 2,
                        size: 110,
                        id: roundId.current,
                      });
                    else setStatus("leaving");
                  }}
                >
                  <CommonMathChest />
                  <span>{uiText(609)}</span>
                </button>
              )}
              {!earnedChest && round.points >= COMMON_CHEST_POINTS && !storageWarning && (
                <p className="math-result-topic">{uiText(610)}</p>
              )}
              <button
                className="primary-button math-start-button"
                type="button"
                disabled={pending}
                onClick={() => void start()}
              >
                <MathIcon name="retry" /> {uiText(611)}
              </button>
            </div>
          ) : question ? (
            <>
              <div className="math-game-stats">
                <div className="math-score" aria-label={round.points + uiText(2292)}>
                  <RoomPointsIcon />
                  <MathNumber value={round.points} />
                </div>
                <div
                  className="math-time"
                  aria-label={
                    Math.ceil(clock) + (round.bank < questionClock ? uiText(1787) : uiText(612))
                  }
                >
                  <RoomClockIcon />
                  <MathNumber value={Math.ceil(clock)} />
                  <RoomSecondsUnit />
                </div>
                <div className="math-hearts" aria-label={round.lives + uiText(2293)}>
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
                aria-label={uiText(613)}
                aria-valuemin={0}
                aria-valuemax={60}
                aria-valuenow={Math.min(60, Math.round(round.bank))}
              >
                <span style={{ width: Math.min(100, (round.bank / 60) * 100) + "%" }} />
              </div>
              <div className="math-game-question">
                <MathUserAvatar />
                <span className="math-topic">{uiText(question.topic)}</span>
                {question.phase !== "practice" && (
                  <div
                    className="math-challenge-phase"
                    role="status"
                    aria-label={
                      question.phase === "final"
                        ? uiText(1788, [question.position! + 1])
                        : uiText(614)
                    }
                  >
                    <span>{question.phase === "final" ? uiText(1789) : uiText(1790)}</span>
                    {question.phase === "final" && (
                      <span className="math-final-pieces" aria-hidden="true">
                        {Array.from({ length: 5 }, (_, i) => (
                          <i
                            key={i}
                            className={
                              i < question.position!
                                ? ((round.progress.final?.correct ?? 0) & (1 << i)) !== 0
                                  ? "is-complete"
                                  : "is-missed"
                                : i === question.position
                                  ? "is-current"
                                  : ""
                            }
                          />
                        ))}
                      </span>
                    )}
                  </div>
                )}
                <h1
                  className={expression.length > 24 ? "math-question-prompt" : undefined}
                  aria-label={expression}
                >
                  <MathExpression value={expression} />
                  {!question.expression.includes("?") &&
                    !/[a-zA-ZÀ-ÿ]/.test(question.expression) && (
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
                      {uiText(615)}{" "}
                      <b>
                        {round.streak}
                        {uiText(289)}
                      </b>
                    </span>
                  </div>
                )}
                {feedback?.timedOut && (
                  <div className="math-timeout-reaction" role="status">
                    <b>{uiText(feedback.message)}</b>
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
                      data-long-answer={String(choice).length > 4 || undefined}
                      data-feedback={
                        feedback?.choice === choice
                          ? feedback.correct
                            ? "correct"
                            : "wrong"
                          : undefined
                      }
                      aria-label={uiText(2294) + choice}
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
                        <div>
                          <b>{uiText(feedback.message)}</b>
                          {feedback.correct ? (
                            <span>
                              <RoomPointsIcon />+<MathNumber value={feedback.points} />
                            </span>
                          ) : (
                            <span>
                              {uiText(616)} <MathNumber value={question.answer} />
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
          {pending && status === "ready" && (
            <div className="math-api-loading">
              <HelenaLoading compact label={uiText(617)} />
              <span className="visually-hidden">{uiText(618)}</span>
            </div>
          )}
          {error && (
            <div role="alert" className="math-api-error">
              <p>{uiText(error)}</p>
              <button
                className="secondary-button"
                type="button"
                disabled={pending}
                onClick={() =>
                  retryChoice.current === null
                    ? void start()
                    : void answer(retryChoice.current.choice, retryChoice.current.timedOut)
                }
              >
                {uiText(498)}
              </button>
            </div>
          )}
          {storageWarning && (
            <p role="alert" className="math-storage-warning">
              {uiText(619)}
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
      </section>
    </PaperDigitsSource>,
    document.body,
  );
}
