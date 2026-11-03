import { RoomRewardNotice } from "./room-reward-notice";
import { PaperDigits } from "./paper-digits";
import { ArcadeResults } from "./arcade-results";
import { mathPlaceRewards, COMMON_CHEST_POINTS, type MathChest } from "../data/math-place-rewards";
import { ENGLISH_PART_CATALOG } from "../data/english-part-catalog";
import { readEnglishCheckpoint, saveEnglishCheckpoint } from "../data/english-checkpoint";
import { A1_BANK, a1Coverage } from "../domain/english-a1";
import {
  ARCADE_LIVES,
  ARCADE_RESERVE,
  ARCADE_COUNTDOWN,
  arcadeQuestionTiming,
  arcadeReserve,
  arcadeElapsed,
} from "../domain/arcade-clock";
import { RoomPointsIcon, RoomClockIcon, RoomSecondsUnit } from "./room-paper-icons";
import { useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { uiText, useLanguage } from "../i18n/runtime";
import type { PracticeActivity, WorkspaceState } from "../domain/workspace";
import {
  englishProgress,
  englishAttemptOf,
  ENGLISH_BANK,
  ENGLISH_TARGET,
  type LanguageAttempt,
} from "../domain/language-progress";
import {
  englishQuestion,
  englishReplyMeaning,
  selectEnglishQuestion,
  normalizeEnglish,
  loadEnglishCourse,
  englishText,
  type EnglishCourse,
} from "../data/english-journey";
import { settleEnglishRewards } from "../data/english-rewards";
import { ACCOUNT_OWNER_KEY } from "../data/personal-data";
import { createMathSound } from "../data/math-sound";
import { isEnglishVoice, speakEnglish } from "../data/speech-voice";
import { type EnglishArea } from "../domain/english-areas";
import { HelenaLoading } from "./helena-loading";
import { MathUserAvatar, MathNumber, MathIcon } from "./math-paper-art";
import "./math-mistake-review.css";
import { PaperArrow } from "./paper-arrow";
import { LibraryDialog } from "./library-dialog";
import "./math-arcade.css";
import "./english-island-journey.css";

type Round = {
  area: EnglishArea;
  id: string;
  owner: string | null;
  part: number;
  mode: LanguageAttempt["mode"];
  ids: number[];
  correct: number[];
  at: number;
  lives: number;
  bank: number;
  elapsed: number;
  missed: { id: number; choice: string; timedOut: boolean }[];
  ended: boolean;
};
export function EnglishIslandJourney({
  workspace,
  onPractice,
  onBack,
  initialPart = 0,
  onChestReturn,
}: {
  workspace: WorkspaceState;
  initialPart?: number;
  onChestReturn?:
    ((origin: { x: number; y: number; size: number; id: string }) => void) | undefined;
  onPractice: (activity: PracticeActivity) => void;
  onBack: () => void;
}) {
  useLanguage();
  const area: EnglishArea = "english";
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    root.current?.querySelector<HTMLButtonElement>(".math-world-back")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const [loaded, setLoaded] = useState<EnglishCourse>();
  const [contentError, setContentError] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const course = loaded?.area === area ? loaded : undefined;
  const progress = useMemo(
    () => englishProgress(workspace.practiceActivities, area),
    [workspace.practiceActivities, area],
  );
  const part = initialPart;
  const [countdown, setCountdown] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const clockStart = useRef<{ at: number; wallAt: number; bank: number; elapsed: number } | null>(
    null,
  );
  const [round, setRound] = useState<Round>();
  const [feedback, setFeedback] = useState<boolean>();
  const [words, setWords] = useState<number[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [choice, setChoice] = useState<string>();
  const [pending, setPending] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const answerLock = useRef(false);
  const activeRoundId = useRef<string | null>(null);
  const [leave, setLeave] = useState(false);
  const [warning, setWarning] = useState("");
  const [summary, setSummary] = useState<PracticeActivity>();
  const [earnedChest, setEarnedChest] = useState<MathChest>();
  const [settledSummary, setSettledSummary] = useState<string>();
  const audio = useRef<ReturnType<typeof createMathSound> | null>(null);
  const nextFocus = useRef<HTMLButtonElement>(null);
  const data = course?.parts[part];
  const partUnlocked = progress.unlocked && (part === 0 || progress.parts[part - 1]!.confirmed);
  const current = progress.parts[part]!;
  const isA1 = part === 0 && Boolean(course?.a1);
  const bankSize = isA1 ? A1_BANK : ENGLISH_BANK;
  const coverage = a1Coverage(current.solved);
  const canConfirm = current.solved.size >= ENGLISH_TARGET && (!isA1 || coverage.ready);
  const question =
    round && course && round.at < round.ids.length
      ? englishQuestion(
          course,
          round.part,
          reviewing ? round.missed[reviewIndex]!.id : round.ids[round.at]!,
        )
      : undefined;
  const tokens =
    question?.phrase
      .split(" ")
      .map((text, id) => ({ text, id }))
      .reverse() ?? [];
  const timing = arcadeQuestionTiming(
    question?.phrase.length ?? 0,
    round?.mode === "final" ? 3 : Math.min(3, 1 + Math.floor((question?.level ?? 0) / 2)),
  );
  const clock = round
    ? Math.max(0, Math.min(timing.budget - round.elapsed * timing.drain, round.bank))
    : 0;
  useEffect(() => {
    if (!countdown) return;
    audio.current?.play(countdown as 1 | 2 | 3);
    const handle = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(handle);
  }, [countdown]);
  useEffect(() => {
    const controller = new AbortController();
    loadEnglishCourse(area, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setLoaded(value);
          setContentError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setContentError(true);
      });
    return () => controller.abort();
  }, [area, loadRevision]);
  useEffect(() => {
    audio.current = createMathSound();
    return () => {
      audio.current?.dispose();
      window.speechSynthesis?.cancel();
      if (timer.current) clearTimeout(timer.current);
      request.current?.abort();
      activeRoundId.current = null;
    };
  }, []);
  const focusContent = useEffectEvent(() => {
    const target = reviewing
      ? root.current?.querySelector<HTMLElement>(".english-mentor h1")
      : round
        ? nextFocus.current
        : root.current?.querySelector<HTMLElement>(
            summary ? ".math-results h1" : ".math-world-back",
          );
    target?.focus({ preventScroll: true });
    if (root.current) root.current.scrollTop = 0;
  });
  useEffect(() => {
    focusContent();
  }, [round?.at, feedback, summary, reviewing, reviewIndex]);
  // Recover a reward write interrupted after the workspace activity was saved.
  useEffect(() => {
    const owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
    const timer = window.setTimeout(() => {
      if (owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)) return;
      try {
        settleEnglishRewards(progress.accepted);
        if (summary) {
          const saved = mathPlaceRewards("english-english");
          const receipt =
            englishAttemptOf(summary)?.mode === "practice" ? `${summary.id}:completed` : summary.id;
          setEarnedChest(saved.chests.find((chest) => chest.id === receipt));
          setSettledSummary(saved.receipts.includes(receipt) ? summary.id : undefined);
        }
      } catch {
        setWarning(uiText("Não foi possível guardar a recompensa. Tente novamente antes de sair."));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [progress, summary]);
  useEffect(() => {
    if (!round) return;
    const changed = () => {
      if (round.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)) {
        setRound(undefined);
        setCountdown(0);
        setReviewIndex(0);
        setSummary(undefined);
        setFeedback(undefined);
        activeRoundId.current = null;
        setReviewing(false);
        setPending(false);
        if (timer.current) clearTimeout(timer.current);
        request.current?.abort();
        window.speechSynthesis?.cancel();
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [round]);
  useEffect(() => {
    const check = () =>
      setHasVoice(
        Boolean(
          window.speechSynthesis
            ?.getVoices()
            .some((voice) => voice.localService && isEnglishVoice(voice)),
        ),
      );
    check();
    window.speechSynthesis?.addEventListener("voiceschanged", check);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", check);
  }, []);
  function evidence(active?: Round) {
    const history = progress.accepted
      .filter(
        (activity) =>
          englishAttemptOf(activity)?.area === area &&
          englishAttemptOf(activity)?.part === part &&
          (!active || !activity.id.startsWith(`${active.id}:`)),
      )
      .flatMap((activity) =>
        englishAttemptOf(activity)!.questions.map((id) => ({
          id,
          correct: englishAttemptOf(activity)!.correctQuestions.includes(id),
        })),
      );
    const live = active
      ? active.ids.map((id) => ({ id, correct: active.correct.includes(id) }))
      : [];
    return {
      part,
      ...(isA1 ? { curriculum: 5 as const } : {}),
      solved: [...new Set([...current.solved, ...(active?.correct ?? [])])],
      recent: [...history, ...live].slice(-24),
      exclude: active?.ids ?? [],
    };
  }
  function rememberRound(active: Round, clear = false) {
    const saved = saveEnglishCheckpoint(
      {
        owner: active.owner,
        part: active.part,
        mode: active.mode,
        question: clear ? null : active.ids[active.at]!,
        ...(active.mode === "final" && !clear
          ? {
              final: {
                id: active.id,
                ids: active.ids,
                at: active.at,
                correct: active.correct,
                missed: active.missed,
              },
            }
          : {}),
      },
      active.owner,
    );
    if (!saved)
      setWarning(
        uiText("Não foi possível guardar a questão para retomar. Tente novamente antes de sair."),
      );
  }
  async function start(mode: LanguageAttempt["mode"]) {
    if (
      !course ||
      !partUnlocked ||
      pending ||
      (mode === "final" && (!canConfirm || current.review > 0 || current.confirmed))
    )
      return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
    setPending(true);
    try {
      const checkpoint = readEnglishCheckpoint(part, mode);
      const resumedFinal = mode === "final" ? checkpoint?.final : undefined;
      const first =
        mode === "practice"
          ? (checkpoint?.question ?? (await selectEnglishQuestion(evidence(), controller.signal)))
          : 0;
      if (controller.signal.aborted || owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)) return;
      audio.current?.unlock();
      audio.current?.play("start");
      const bank = Array.from({ length: bankSize }, (_, id) => id);
      const offset = progress.accepted.length % bankSize;
      const finalIds = isA1
        ? Array.from(
            { length: 5 },
            (_, i) =>
              120 + ((i + Math.floor(progress.accepted.length / 5)) % 6) * 20 + 16 + (i % 4),
          )
        : bank.slice(offset).concat(bank.slice(0, offset)).slice(0, 5);
      const id = resumedFinal?.id ?? `english:arcade:${crypto.randomUUID()}`;
      activeRoundId.current = id;
      const started: Round = {
        id,
        area,
        owner,
        part,
        mode,
        ids: mode === "final" ? (resumedFinal?.ids ?? finalIds) : [first],
        correct: resumedFinal?.correct ?? [],
        at: resumedFinal?.at ?? 0,
        lives: ARCADE_LIVES,
        bank: ARCADE_RESERVE,
        elapsed: 0,
        missed: resumedFinal?.missed ?? [],
        ended: false,
      };
      setRound(started);
      setCountdown(ARCADE_COUNTDOWN);
      setReviewIndex(0);
      setSummary(undefined);
      setEarnedChest(undefined);
      setSettledSummary(undefined);
      setFeedback(undefined);
      setWords([]);
      setWarning("");
      rememberRound(started);
      setReviewing(false);
      setChoice(undefined);
      answerLock.current = false;
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }
  function activityFor(
    active: Round,
    questions = active.ids.slice(0, active.at + 1),
    correctQuestions = active.correct,
  ): PracticeActivity {
    return {
      id: active.id,
      islandId: "english",
      islandName: uiText("Cais dos Encontros · Inglês"),
      ...(active.mode === "final" && active.correct.length >= 4
        ? { moduleLevel: active.part }
        : {}),
      completedAt: new Date().toISOString(),
      answers: questions.length,
      correct: correctQuestions.length,
      [active.part === 0 ? "englishA1Attempt" : "englishAttempt"]: {
        curriculum: active.part === 0 ? 5 : 4,
        area: active.area,
        part: active.part,
        mode: active.mode,
        questions,
        correctQuestions,
      },
    };
  }
  async function advance(active: Round) {
    if (
      active.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY) ||
      activeRoundId.current !== active.id
    )
      return;
    window.speechSynthesis?.cancel();
    if (!active.ended) {
      setPending(true);
      const controller = new AbortController();
      request.current = controller;
      try {
        const id =
          active.mode === "final"
            ? active.ids[active.at + 1]!
            : await selectEnglishQuestion(evidence(active), controller.signal);
        if (
          controller.signal.aborted ||
          active.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY) ||
          activeRoundId.current !== active.id
        )
          return;
        const next = {
          ...active,
          at: active.at + 1,
          elapsed: 0,
          ids: active.mode === "final" ? active.ids : [...active.ids, id],
        };
        if (active.mode === "practice") rememberRound(next);
        setRound(next);
        setFeedback(undefined);
        setWords([]);
        setChoice(undefined);
        setReviewing(false);
        answerLock.current = false;
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
      return;
    }
    const activity = activityFor(active);
    if (active.mode === "final")
      onPractice(
        activity.answers === 5
          ? activity
          : {
              ...activity,
              ...(active.part === 0
                ? {
                    englishA1FinalFailure: true,
                    englishA1Attempt: { ...activity.englishA1Attempt!, mode: "practice" as const },
                  }
                : {
                    englishFinalFailure: true,
                    englishAttempt: { ...activity.englishAttempt!, mode: "practice" as const },
                  }),
            },
      );
    if (active.mode === "final") {
      rememberRound(active, true);
      if (active.correct.length < 4 && active.missed.length) {
        const lastMiss = active.missed.at(-1)!;
        rememberRound({ ...active, mode: "practice", ids: [lastMiss.id], at: 0 });
      }
    }
    setSummary(activity);
    activeRoundId.current = null;
    setRound(active.missed.length ? { ...active, ended: true } : undefined);
    setFeedback(undefined);
    setReviewIndex(0);
    setReviewing(active.missed.length > 0);
    setChoice(undefined);
    answerLock.current = false;
    audio.current?.play("finish");
  }
  function answer(value: string, timedOut = false) {
    if (
      !round ||
      !question ||
      countdown > 0 ||
      round.ended ||
      answerLock.current ||
      pending ||
      round.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)
    )
      return;
    answerLock.current = true;
    const started = clockStart.current;
    const elapsed = started ? arcadeElapsed(started) : round.elapsed;
    const bank = started
      ? Math.max(0, started.bank - (elapsed - started.elapsed) * timing.drain)
      : round.bank;
    timedOut ||= Math.min(timing.budget - elapsed * timing.drain, bank) <= 0;
    const correct = !timedOut && normalizeEnglish(value) === normalizeEnglish(question.answer);
    const lives = round.lives - Number(!correct);
    const correctIds = correct ? [...round.correct, question.id] : round.correct;
    const ended =
      lives === 0 ||
      (round.mode === "final"
        ? round.at + 1 === 5
        : (new Set([...current.solved, ...correctIds]).size >= ENGLISH_TARGET &&
            (!isA1 || a1Coverage([...current.solved, ...correctIds]).ready)) ||
          round.at + 1 >= bankSize);
    const updated = {
      ...round,
      correct: correctIds,
      lives,
      elapsed,
      ended,
      bank: arcadeReserve(
        bank,
        correct,
        timedOut,
        elapsed <= (timing.budget / timing.drain) * 0.32,
      ),
      missed: correct
        ? round.missed
        : [...round.missed, { id: question.id, choice: value, timedOut }],
    };
    if (round.mode === "practice") rememberRound(updated, correct);
    else if (!ended) rememberRound({ ...updated, at: updated.at + 1 });
    setRound(updated);
    setChoice(value);
    setFeedback(correct);
    audio.current?.unlock();
    audio.current?.play(timedOut ? "timeout" : correct ? "correct" : "wrong");
    if (round.mode === "practice") {
      const entry = activityFor(
        { ...updated, id: `${round.id}:${round.at}${ended ? ":completed" : ""}` },
        [question.id],
        correct ? [question.id] : [],
      );
      onPractice(entry);
    }
    timer.current = setTimeout(
      () => {
        void advance(updated);
      },
      correct ? 650 : 1300,
    );
  }
  const tick = useEffectEvent(() => {
    const start = clockStart.current;
    if (!start || !round) return;
    const elapsed = arcadeElapsed(start);
    const bank = Math.max(0, start.bank - (elapsed - start.elapsed) * timing.drain);
    setRound((value) => (value ? { ...value, elapsed, bank } : value));
    if (Math.min(timing.budget - elapsed * timing.drain, bank) <= 0) answer("", true);
  });
  const startClock = useEffectEvent(() =>
    round
      ? { at: performance.now(), wallAt: Date.now(), elapsed: round.elapsed, bank: round.bank }
      : null,
  );
  const playing = Boolean(round && !round.ended);
  const activeAt = round?.at;
  useEffect(() => {
    if (!playing || countdown || feedback !== undefined || pending || leave) return;
    clockStart.current = startClock();
    const handle = setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      clearInterval(handle);
      clockStart.current = null;
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, [activeAt, playing, countdown, feedback, pending, leave]);
  function listen() {
    if (!question) return;
    const voice = window.speechSynthesis
      ?.getVoices()
      .find((item) => item.localService && isEnglishVoice(item));
    if (voice)
      speakEnglish(question.phrase, { voice, rate: 0.86, onUnavailable: () => setHasVoice(false) });
  }
  function back() {
    if (round) {
      setLeave(true);
      return;
    }
    onBack();
  }
  return createPortal(
    <section
      ref={root}
      className={`english-journey english-island-interior math-arcade${round ? " is-practicing" : summary ? " is-finished" : " is-ready"}`}
      aria-label={uiText("Cais dos Encontros · Inglês")}
      style={
        {
          "--math-color": "#16869a",
          "--math-shade": "#123f52",
          "--math-light": "#64d0d5",
        } as CSSProperties
      }
      onKeyDown={(event) => {
        if (event.target instanceof Element && event.target.closest("dialog[open]")) return;
        if (event.key === "Escape") {
          event.preventDefault();
          back();
        }
        if (event.key === "Tab") {
          const controls = Array.from(
              root.current?.querySelectorAll<HTMLElement>(
                "button:not([disabled]),a[href],input:not([disabled]),summary",
              ) ?? [],
            ).filter((el) => el.getClientRects().length > 0),
            first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <button type="button" className="secondary-button math-world-back" onClick={back}>
        <PaperArrow back />
        {uiText("Voltar")}
      </button>
      <div className="math-game-floor" aria-hidden="true" />
      <div className="english-interior-content">
        {!course || !data ? (
          contentError ? (
            <div className="english-part-detail" role="alert">
              <p>{uiText("Não foi possível carregar os materiais desta parte.")}</p>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setContentError(false);
                  setLoadRevision((value) => value + 1);
                }}
              >
                {uiText("Tentar novamente")}
              </button>
            </div>
          ) : (
            <HelenaLoading />
          )
        ) : countdown > 0 ? (
          <div className="math-countdown" role="status" aria-live="assertive">
            <MathUserAvatar />
            <span key={countdown}>
              <PaperDigits value={String(countdown)} />
            </span>
          </div>
        ) : round && question ? (
          reviewing ? (
            <section
              className="oliver-review english-mentor"
              aria-label={uiText("Revisão com a Olena")}
            >
              <section className="oliver-review__lesson">
                <div className="oliver-review__character">
                  <img
                    src="/languages/characters/olena-english-v2.webp"
                    alt={uiText("Olena")}
                    width="330"
                    height="330"
                  />
                </div>
                <div className="oliver-review__speech" data-state="explain">
                  <span className="oliver-review__speaker">{uiText("Olena")}</span>
                  <h1 tabIndex={-1}>{uiText("Vamos entender juntos?")}</h1>
                  <p className="oliver-review__reason">
                    {uiText("Sua resposta: {0}", [
                      round.missed[reviewIndex]!.timedOut
                        ? uiText("Tempo esgotado")
                        : round.missed[reviewIndex]!.choice,
                    ])}
                  </p>
                  <p>{uiText("Nesta conversa, a fala significa: {0}", [question.meaning])}</p>
                  <blockquote lang="en">{question.phrase}</blockquote>
                  <p className="english-specific-explanation">
                    <strong lang="en">{question.focus}</strong>: {question.explanation}
                  </p>
                  {question.kind === "reply" &&
                    !round.missed[reviewIndex]!.timedOut &&
                    englishReplyMeaning(course, part, round.missed[reviewIndex]!.choice) && (
                      <p>
                        {uiText("A resposta escolhida significa: {0}", [
                          englishReplyMeaning(course, part, round.missed[reviewIndex]!.choice)!,
                        ])}
                      </p>
                    )}
                  {question.kind === "gap" && (
                    <p>
                      {uiText("Nesta lacuna, {0} mantém o sentido da fala: {1}", [
                        question.answer,
                        question.meaning,
                      ])}
                    </p>
                  )}
                  <p>
                    {question.kind === "reply"
                      ? uiText("Você precisa comunicar: {0}", [question.replyMeaning])
                      : question.kind === "order"
                        ? uiText("Leia a frase por blocos e observe a posição de cada palavra.")
                        : uiText(
                            "Compare a resposta com a fala inteira antes de escolher uma palavra isolada.",
                          )}
                  </p>
                  <p className="english-review-answer">
                    <strong>{uiText("Resposta explicada")}</strong>
                    <br />
                    <span lang={question.kind === "meaning" ? undefined : "en"}>
                      {question.answer}
                    </span>
                  </p>
                  <button
                    ref={nextFocus}
                    className="primary-button"
                    disabled={pending}
                    type="button"
                    onClick={() => {
                      if (reviewIndex + 1 < round.missed.length) setReviewIndex(reviewIndex + 1);
                      else {
                        setReviewing(false);
                        setRound(undefined);
                      }
                    }}
                  >
                    {reviewIndex + 1 < round.missed.length
                      ? uiText("Próxima explicação")
                      : uiText("Ver resultado")}
                    <PaperArrow />
                  </button>
                </div>
              </section>
            </section>
          ) : (
            <div className="english-lesson" data-question-id={question.id}>
              <div className="math-game-stats">
                <div className="math-score" aria-label={round.correct.length * 20 + uiText(2292)}>
                  <RoomPointsIcon />
                  <MathNumber value={round.correct.length * 20} />
                </div>
                <div
                  className={`math-time${clock <= 5 ? " is-ending" : ""}`}
                  aria-label={Math.ceil(clock) + uiText(612)}
                >
                  <RoomClockIcon />
                  <MathNumber value={Math.ceil(clock)} />
                  <RoomSecondsUnit />
                </div>
                <div className="math-hearts" aria-label={round.lives + uiText(2293)}>
                  {Array.from({ length: ARCADE_LIVES }, (_, index) => (
                    <span
                      key={index}
                      className={
                        index < round.lives
                          ? ""
                          : feedback === false && index === round.lives
                            ? "is-breaking"
                            : "is-empty"
                      }
                    >
                      <MathIcon name="heart" />
                      {feedback === false && index === round.lives && <MathIcon name="heart" />}
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
              {feedback === false && round.missed.at(-1)?.timedOut && (
                <div className="math-timeout-reaction" role="status">
                  <b>{uiText("Tempo esgotado")}</b>
                  <span>
                    −<MathNumber value={4} />
                    <RoomSecondsUnit />
                  </span>
                </div>
              )}
              <div className="english-scene">
                <div className="english-dialogue">
                  <span className="english-eyebrow">{uiText("Olena")}</span>
                  <p lang={question.kind === "order" ? undefined : "en"}>
                    {question.kind === "gap"
                      ? question.phrase.replace(new RegExp(`\\b${question.answer}\\b`), "____")
                      : question.kind === "order"
                        ? question.meaning
                        : question.phrase}
                  </p>
                  {hasVoice && (
                    <button className="secondary-button" type="button" onClick={listen}>
                      {uiText("Ouvir a fala")}
                    </button>
                  )}
                </div>
              </div>
              <h1>{question.prompt}</h1>
              {question.kind === "gap" && (
                <p className="english-reply-intent">
                  {uiText("A fala quer dizer: {0}", [question.meaning])}
                </p>
              )}
              {question.kind === "reply" && (
                <p className="english-reply-intent">
                  {uiText("Você quer dizer: {0}", [question.replyMeaning])}
                </p>
              )}
              {question.kind === "order" && (
                <div className="english-word-answer" aria-live="polite" lang="en">
                  {words.map((id) => question.phrase.split(" ")[id]).join(" ") ||
                    uiText("Escolha as palavras na ordem.")}
                </div>
              )}
              <div
                className={
                  question.kind === "order"
                    ? "english-word-bank math-answers"
                    : "english-options math-answers"
                }
              >
                {(question.kind === "order"
                  ? tokens.map((token) => token.text)
                  : question.options
                ).map((option, index) => {
                  const token = tokens[index];
                  const picked =
                    question.kind === "order" ? feedback !== undefined : choice === option;
                  return (
                    <div className="math-answer-wrap" key={index}>
                      <button
                        ref={index === 0 ? nextFocus : undefined}
                        className="math-answer-button"
                        data-tone={index % 4}
                        data-feedback={
                          picked && feedback !== undefined
                            ? feedback
                              ? "correct"
                              : "wrong"
                            : undefined
                        }
                        aria-disabled={
                          feedback !== undefined ||
                          pending ||
                          (question.kind === "order" && words.includes(token!.id))
                        }
                        aria-pressed={picked}
                        type="button"
                        lang={question.kind === "meaning" ? undefined : "en"}
                        onClick={() => {
                          if (feedback !== undefined || pending) return;
                          if (question.kind !== "order") {
                            answer(option);
                            return;
                          }
                          if (!token || words.includes(token.id)) return;
                          const selected = [...words, token.id];
                          setWords(selected);
                          if (selected.length === tokens.length)
                            answer(selected.map((id) => question.phrase.split(" ")[id]).join(" "));
                        }}
                      >
                        <span>{option}</span>
                        <span className="math-answer-fold" aria-hidden="true" />
                      </button>
                      {picked &&
                        feedback !== undefined &&
                        (question.kind !== "order" || index === 0) && (
                          <div
                            className={`math-answer-reaction ${feedback ? "is-correct" : "is-wrong"}`}
                            role="status"
                          >
                            <MathUserAvatar mood={feedback ? "correct" : "wrong"} />
                            <div>
                              <b>
                                {feedback ? uiText("Muito bem!") : uiText("Vamos entender juntos?")}
                              </b>
                              {feedback && (
                                <span>
                                  +<MathNumber value={20} />
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
              {question.kind === "order" && feedback === undefined && (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={words.length === 0 || pending}
                  onClick={() => setWords(words.slice(0, -1))}
                >
                  {uiText("Desfazer")}
                </button>
              )}
              {pending && <HelenaLoading compact />}
            </div>
          )
        ) : summary ? (
          <ArcadeResults
            key={summary.id}
            points={summary.correct * 20}
            topic={englishText(ENGLISH_PART_CATALOG[part]!.title)}
            message={
              englishAttemptOf(summary)?.mode === "final"
                ? summary.correct >= 4
                  ? uiText("Parte confirmada! O próximo caminho está aberto.")
                  : uiText(
                      "Revise quatro respostas corretas antes de tentar a confirmação novamente.",
                    )
                : undefined
            }
            dust={Boolean(earnedChest)}
            blockedDust={
              settledSummary === summary.id &&
              summary.correct * 20 >= COMMON_CHEST_POINTS &&
              !warning
            }
            pending={pending}
            onRetry={() => void start("practice")}
            onScoreComplete={() => audio.current?.play("xp")}
            onCollectDust={(event) => {
              if (!earnedChest) return;
              const rect = event.currentTarget.getBoundingClientRect();
              audio.current?.play("chestUnlock");
              if (onChestReturn)
                onChestReturn({
                  x: rect.x + rect.width / 2,
                  y: rect.y + rect.height / 2,
                  size: 110,
                  id: earnedChest.id,
                });
              else onBack();
            }}
          >
            {canConfirm && current.review === 0 && !current.confirmed && (
              <button
                className="secondary-button"
                type="button"
                disabled={pending}
                onClick={() => void start("final")}
              >
                {uiText("Confirmar esta parte")}
                <PaperArrow />
              </button>
            )}
          </ArcadeResults>
        ) : (
          <div className="english-entry math-welcome">
            <h1 className="visually-hidden">{englishText(ENGLISH_PART_CATALOG[part]!.title)}</h1>
            <MathUserAvatar />
            {!partUnlocked && (
              <p>{uiText("Confirme a parte anterior para liberar esta prática.")}</p>
            )}
            <button
              className="primary-button math-start-button"
              type="button"
              disabled={!partUnlocked || pending}
              onClick={() => void start("practice")}
            >
              <MathIcon name="start" />
              {uiText("Praticar")}
            </button>
            {canConfirm && current.review === 0 && !current.confirmed && (
              <button
                className="secondary-button"
                type="button"
                disabled={!partUnlocked || pending}
                onClick={() => void start("final")}
              >
                {uiText("Confirmar esta parte")}
                <PaperArrow />
              </button>
            )}
          </div>
        )}
        {summary && settledSummary === summary.id && (
          <RoomRewardNotice
            reward={{
              id: summary.id,
              place: 1,
              xp: summary.correct * 4,
              completedAt: Date.parse(summary.completedAt),
            }}
            activity="english"
            presentationOnly
            deferPresentation={reviewing}
          />
        )}
        {warning && <p role="alert">{warning}</p>}
        {leave && (
          <LibraryDialog title={uiText("Sair desta rodada?")} onClose={() => setLeave(false)}>
            <p>{uiText("Seus acertos ficam salvos. Ao voltar, você retoma a questão pendente.")}</p>
            <div className="english-actions">
              <button className="secondary-button" onClick={() => setLeave(false)} type="button">
                {uiText("Continuar praticando")}
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  activeRoundId.current = null;
                  if (timer.current) clearTimeout(timer.current);
                  request.current?.abort();
                  setPending(false);
                  setCountdown(0);
                  setRound(undefined);
                  setFeedback(undefined);
                  setLeave(false);
                  window.speechSynthesis?.cancel();
                }}
              >
                {uiText("Sair da rodada")}
              </button>
            </div>
          </LibraryDialog>
        )}
      </div>
    </section>,
    document.body,
  );
}
