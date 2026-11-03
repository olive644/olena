import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { ENGLISH_AREAS, type EnglishArea } from "../domain/english-areas";
import { ENGLISH_PART_CATALOG } from "../data/english-part-catalog";
import { ENGLISH_ISLAND_CATALOG } from "../data/english-island-catalog";
import { HelenaLoading } from "./helena-loading";
import { MathUserAvatar, MathNumber } from "./math-paper-art";
import "./math-mistake-review.css";
import { PaperArrow } from "./paper-arrow";
import { PaperDigits } from "./paper-digits";
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
};
export function EnglishIslandJourney({
  workspace,
  onPractice,
  onBack,
  initialPart = 0,
}: {
  workspace: WorkspaceState;
  initialPart?: number;
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
    root.current?.querySelector<HTMLButtonElement>(".english-journey-header button")?.focus();
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
  const audio = useRef<ReturnType<typeof createMathSound> | null>(null);
  const nextFocus = useRef<HTMLButtonElement>(null);
  const data = course?.parts[part];
  const partUnlocked = progress.unlocked && (part === 0 || progress.parts[part - 1]!.confirmed);
  const current = progress.parts[part]!;
  const question =
    round && course && round.at < round.ids.length
      ? englishQuestion(course, round.part, round.ids[round.at]!)
      : undefined;
  const tokens =
    question?.phrase
      .split(" ")
      .map((text, id) => ({ text, id }))
      .reverse() ?? [];
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
  useEffect(() => {
    const target = reviewing
      ? root.current?.querySelector<HTMLElement>(".english-mentor h1")
      : round
        ? nextFocus.current
        : root.current?.querySelector<HTMLElement>(
            summary ? ".english-summary h2" : ".english-journey-header button",
          );
    target?.focus({ preventScroll: true });
    if (root.current) root.current.scrollTop = 0;
  }, [round, feedback, summary, reviewing]);
  // Recover a reward write interrupted after the workspace activity was saved.
  useEffect(() => {
    const owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
    const timer = window.setTimeout(() => {
      if (owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)) return;
      try {
        settleEnglishRewards(progress.accepted);
      } catch {
        setWarning(uiText("Não foi possível guardar a recompensa. Tente novamente antes de sair."));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [progress]);
  useEffect(() => {
    if (!round) return;
    const changed = () => {
      if (round.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)) {
        setRound(undefined);
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
      solved: [...new Set([...current.solved, ...(active?.correct ?? [])])],
      recent: [...history, ...live].slice(-24),
      exclude: active?.ids ?? [],
    };
  }
  async function start(mode: LanguageAttempt["mode"]) {
    if (
      !course ||
      !partUnlocked ||
      pending ||
      (mode === "final" &&
        (current.solved.size < ENGLISH_TARGET || current.review > 0 || current.confirmed))
    )
      return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
    setPending(true);
    try {
      const first = await selectEnglishQuestion(evidence(), controller.signal);
      if (controller.signal.aborted || owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)) return;
      audio.current?.unlock();
      audio.current?.play("start");
      const bank = Array.from({ length: ENGLISH_BANK }, (_, id) => id);
      const offset = progress.accepted.length % ENGLISH_BANK;
      const id = `english:${crypto.randomUUID()}`;
      activeRoundId.current = id;
      setRound({
        id,
        area,
        owner,
        part,
        mode,
        ids:
          mode === "final" ? bank.slice(offset).concat(bank.slice(0, offset)).slice(0, 5) : [first],
        correct: [],
        at: 0,
      });
      setSummary(undefined);
      setFeedback(undefined);
      setWords([]);
      setWarning("");
      setReviewing(false);
      setChoice(undefined);
      answerLock.current = false;
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }
  function activityFor(
    active: Round,
    questions = active.ids,
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
      englishAttempt: {
        curriculum: 4,
        area: active.area,
        part: active.part,
        mode: active.mode,
        questions,
        correctQuestions,
      },
    };
  }
  function answer(value: string) {
    if (
      !round ||
      !question ||
      answerLock.current ||
      pending ||
      round.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)
    )
      return;
    answerLock.current = true;
    const correct = normalizeEnglish(value) === normalizeEnglish(question.answer);
    const updated = {
      ...round,
      correct: correct ? [...round.correct, question.id] : round.correct,
    };
    setRound(updated);
    setChoice(value);
    setFeedback(correct);
    audio.current?.unlock();
    audio.current?.play(correct ? "correct" : "wrong");
    if (round.mode === "practice") {
      const entry = activityFor(
        { ...updated, id: `${round.id}:${round.at}` },
        [question.id],
        correct ? [question.id] : [],
      );
      onPractice(entry);
    }
    timer.current = setTimeout(
      () => {
        if (correct) void advance(updated);
        else setReviewing(true);
      },
      correct ? 650 : 1300,
    );
  }
  async function advance(active: Round) {
    if (
      active.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY) ||
      activeRoundId.current !== active.id
    )
      return;
    window.speechSynthesis?.cancel();
    const size = active.mode === "final" ? 5 : 6;
    if (active.at + 1 < size) {
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
        setRound({
          ...active,
          at: active.at + 1,
          ids: active.mode === "final" ? active.ids : [...active.ids, id],
        });
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
    if (active.mode === "final") onPractice(activity);
    setSummary(activity);
    activeRoundId.current = null;
    setRound(undefined);
    setFeedback(undefined);
    setReviewing(false);
    setChoice(undefined);
    answerLock.current = false;
    audio.current?.play("finish");
  }
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
      className={`english-journey english-island-interior math-arcade${round ? " is-practicing" : ""}`}
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
      <div className="math-game-landscape" aria-hidden="true">
        <img
          src={`/languages/english-parts/${ENGLISH_PART_CATALOG[part]!.art}.webp`}
          width="800"
          height="800"
          alt=""
        />
      </div>
      <div className="math-game-floor" aria-hidden="true" />
      <div className="english-interior-content">
        {!round && (
          <header className="english-journey-header">
            <button type="button" className="secondary-button" onClick={back}>
              <PaperArrow back />
              {uiText("Voltar")}
            </button>
            <p>
              {uiText("Cais dos Encontros")}{" "}
              <span> / {englishText(ENGLISH_PART_CATALOG[part]!.title)}</span>
            </p>
            <strong aria-label={uiText("Progresso geral de Inglês")}>
              <small>{uiText("Geral")}</small>
              <PaperDigits value={String(progress.overall)} />%
            </strong>
          </header>
        )}
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
        ) : round && question ? (
          reviewing ? (
            <section
              className="oliver-review english-mentor"
              aria-label={uiText("Revisão com a Olena")}
            >
              <section className="oliver-review__lesson">
                <div className="oliver-review__character">
                  <img
                    src="/helena-onboarding-step-3-cutout.webp"
                    alt={uiText("Olena")}
                    width="330"
                    height="330"
                  />
                </div>
                <div className="oliver-review__speech" data-state="explain">
                  <span className="oliver-review__speaker">{uiText("Olena")}</span>
                  <h1 tabIndex={-1}>{uiText("Vamos entender juntos?")}</h1>
                  <p className="oliver-review__reason">
                    {uiText("Sua resposta: {0}", [choice ?? ""])}
                  </p>
                  <p>{uiText("Nesta conversa, a fala significa: {0}", [question.meaning])}</p>
                  <blockquote lang="en">{question.phrase}</blockquote>
                  <p>
                    {englishText(
                      data.guide[
                        question.kind === "meaning"
                          ? 0
                          : question.kind === "gap"
                            ? 1
                            : question.kind === "reply"
                              ? 3
                              : 2
                      ]!.text,
                    )}
                  </p>
                  <p>
                    {question.kind === "reply"
                      ? uiText("Oliver precisa comunicar: {0}", [question.replyMeaning])
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
                    onClick={() => void advance(round)}
                  >
                    {uiText("Agora é sua vez")}
                    <PaperArrow />
                  </button>
                </div>
              </section>
            </section>
          ) : (
            <div className="english-lesson" data-question-id={question.id}>
              <div className="english-lesson-top">
                <span>
                  {uiText("Questão {0} de {1}", [round.at + 1, round.mode === "final" ? 5 : 6])}
                </span>
              </div>
              <progress
                max={round.mode === "final" ? 5 : 6}
                value={round.at}
                aria-label={uiText("Progresso da rodada")}
              />
              <div className="english-scene">
                <img
                  src="/helena-onboarding-step-3-cutout.webp"
                  alt={uiText("Olena")}
                  width="190"
                  height="190"
                />
                <div className="english-dialogue">
                  <span className="english-eyebrow">{uiText("Olena")}</span>
                  <p lang={question.kind === "order" ? undefined : "en"}>
                    {question.kind === "gap"
                      ? question.phrase.replace(question.answer, "____")
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
                <img
                  src="/profile-avatars/oliver.webp"
                  alt={uiText("Oliver")}
                  width="150"
                  height="150"
                />
              </div>
              <h1>{question.prompt}</h1>
              {question.kind === "gap" && (
                <p className="english-reply-intent">
                  {uiText("A fala quer dizer: {0}", [question.meaning])}
                </p>
              )}
              {question.kind === "reply" && (
                <p className="english-reply-intent">
                  {uiText("Oliver quer dizer: {0}", [question.replyMeaning])}
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
        ) : (
          <>
            <div className="english-course-heading">
              <div className="english-interior-emblem">
                <img
                  src={`/languages/english-parts/${ENGLISH_PART_CATALOG[part]!.art}.webp`}
                  width="800"
                  height="800"
                  alt=""
                />
              </div>
              <div>
                <p className="english-eyebrow">
                  {englishText(ENGLISH_ISLAND_CATALOG[ENGLISH_AREAS.indexOf(area)]!.subject)}
                </p>
                <h1>{englishText(data.title)}</h1>
                <p>{englishText(data.objective)}</p>
                <small className="english-proficiency">
                  {uiText("Referência de dificuldade: {0}", [data.proficiency])}
                </small>
              </div>
            </div>
            {summary && (
              <div className="english-summary" role="status">
                <h2 tabIndex={-1}>{uiText("Rodada concluída")}</h2>
                <p>
                  {uiText("Acertos: {0} · Erros: {1} · Pontos: {2}", [
                    summary.correct,
                    summary.answers - summary.correct,
                    summary.correct * 20,
                  ])}
                </p>
                <p>
                  {englishAttemptOf(summary)?.mode === "final"
                    ? summary.correct >= 4
                      ? uiText("Parte confirmada! O próximo caminho está aberto.")
                      : uiText(
                          "Revise quatro respostas corretas antes de tentar a confirmação novamente.",
                        )
                    : uiText("Cada resposta correta aproxima você da confirmação desta parte.")}
                </p>
              </div>
            )}
            <section className="english-part-detail">
              <details className="english-mini-lesson" key={`${area}:${part}`} open>
                <summary>{uiText("Antes de praticar")}</summary>
                <p>{englishText(data.lesson)}</p>
                <div className="english-guide">
                  {data.guide.map((step, index) => (
                    <section key={index}>
                      <span className="english-guide-step">
                        <PaperDigits value={String(index + 1)} />
                      </span>
                      <h3>{englishText(step.title)}</h3>
                      <p>{englishText(step.text)}</p>
                      <blockquote lang="en">{step.example}</blockquote>
                      <p className="english-example-meaning">{englishText(step.meaning)}</p>
                    </section>
                  ))}
                </div>
              </details>
              {!partUnlocked && (
                <p className="english-locked-note">
                  {progress.unlocked
                    ? uiText("Confirme a parte anterior para liberar esta prática.")
                    : uiText("Conclua {0} para liberar esta prática.", [
                        englishText(ENGLISH_ISLAND_CATALOG[ENGLISH_AREAS.indexOf(area) - 1]!.title),
                      ])}
                </p>
              )}
              <h2>{uiText("Parte {0} de 6", [part + 1])}</h2>
              <p>
                {uiText(
                  "Domine 100 questões diferentes e confirme a parte com pelo menos 4 acertos em 5. Errar faz parte: você recebe uma explicação e pode praticar novamente.",
                )}
              </p>
              <progress
                max={ENGLISH_TARGET}
                value={
                  current.confirmed
                    ? ENGLISH_TARGET
                    : Math.min(ENGLISH_TARGET - 1, current.solved.size)
                }
                aria-label={uiText("Domínio da parte")}
              />
              <p>{uiText("Acertos: {0} · Erros: {1}", [current.correct, current.errors])}</p>
              {current.review > 0 && (
                <p>{uiText("Faltam {0} respostas corretas de revisão.", [current.review])}</p>
              )}
              <div className="english-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!partUnlocked || pending}
                  onClick={() => start("practice")}
                >
                  {uiText("Praticar")}
                  <PaperArrow />
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    !partUnlocked ||
                    current.solved.size < ENGLISH_TARGET ||
                    current.review > 0 ||
                    current.confirmed
                  }
                  onClick={() => start("final")}
                >
                  {uiText("Confirmar esta parte")}
                </button>
              </div>
            </section>
          </>
        )}
        {warning && <p role="alert">{warning}</p>}
        {leave && (
          <LibraryDialog title={uiText("Sair desta rodada?")} onClose={() => setLeave(false)}>
            <p>
              {uiText(
                "As partes já concluídas ficam salvas. Esta rodada ainda não terminou e será reiniciada.",
              )}
            </p>
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
