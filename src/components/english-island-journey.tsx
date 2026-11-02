import { useEffect, useMemo, useRef, useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import type { PracticeActivity, WorkspaceState } from "../domain/workspace";
import { englishProgress, type LanguageAttempt } from "../domain/language-progress";
import { ENGLISH_JOURNEY, englishQuestion, normalizeEnglish } from "../data/english-journey";
import { finishMathPlace } from "../data/math-place-rewards";
import { recordRoomXp } from "../data/room-xp";
import { ACCOUNT_OWNER_KEY } from "../data/personal-data";
import { createMathSound } from "../data/math-sound";
import { isEnglishVoice, speakEnglish } from "../data/speech-voice";
import { MathPlaceTreasure } from "./math-place-treasure";
import { PaperArrow } from "./paper-arrow";
import { PaperDigits } from "./paper-digits";
import { LibraryDialog } from "./library-dialog";
import "./english-island-journey.css";

type Round = {
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
}: {
  workspace: WorkspaceState;
  onPractice: (activity: PracticeActivity) => void;
  onBack: () => void;
}) {
  useLanguage();
  const progress = useMemo(
    () => englishProgress(workspace.practiceActivities),
    [workspace.practiceActivities],
  );
  const [inside, setInside] = useState(false);
  const [part, setPart] = useState(0);
  const [round, setRound] = useState<Round>();
  const [feedback, setFeedback] = useState<boolean>();
  const [words, setWords] = useState<number[]>([]);
  const [transcript, setTranscript] = useState(false);
  const [leave, setLeave] = useState(false);
  const [warning, setWarning] = useState("");
  const [summary, setSummary] = useState<PracticeActivity>();
  const [rewardRevision, setRewardRevision] = useState(0);
  const audio = useRef<ReturnType<typeof createMathSound> | null>(null);
  const nextFocus = useRef<HTMLButtonElement>(null);
  const data = ENGLISH_JOURNEY[part]!;
  const current = progress.parts[part]!;
  const question =
    round && round.at < round.ids.length
      ? englishQuestion(round.part, round.ids[round.at]!)
      : undefined;
  const tokens =
    question?.phrase
      .split(" ")
      .map((text, id) => ({ text, id }))
      .reverse() ?? [];
  useEffect(() => {
    audio.current = createMathSound();
    return () => {
      audio.current?.dispose();
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    nextFocus.current?.focus();
  }, [round?.at, feedback, summary]);
  // Recover a reward write interrupted after the workspace activity was saved.
  useEffect(() => {
    const owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
    const timer = window.setTimeout(() => {
      if (owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)) return;
      try {
        for (const activity of progress.accepted) {
          if (activity.correct <= 0) continue;
          finishMathPlace("english-a1", activity.id, activity.correct * 20);
          recordRoomXp({
            id: activity.id,
            place: 1,
            xp: activity.correct * 4,
            completedAt: Date.parse(activity.completedAt),
          });
        }
        setRewardRevision((value) => value + 1);
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
        window.speechSynthesis?.cancel();
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [round]);
  function start(mode: LanguageAttempt["mode"]) {
    audio.current?.unlock();
    audio.current?.play("start");
    const bank = Array.from({ length: 24 }, (_, id) => id);
    const unsolved = bank.filter((id) => !current.solved.has(id));
    const order =
      mode === "practice"
        ? [...unsolved, ...bank.filter((id) => current.solved.has(id))]
        : bank
            .slice(progress.accepted.length % 19)
            .concat(bank.slice(0, progress.accepted.length % 19));
    setRound({
      id: `english:${crypto.randomUUID()}`,
      owner: localStorage.getItem(ACCOUNT_OWNER_KEY),
      part,
      mode,
      ids: order.slice(0, mode === "final" ? 5 : 6),
      correct: [],
      at: 0,
    });
    setSummary(undefined);
    setFeedback(undefined);
    setWords([]);
    setTranscript(false);
    setWarning("");
  }
  function answer(value: string) {
    if (
      !round ||
      !question ||
      feedback !== undefined ||
      round.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY)
    )
      return;
    const correct = normalizeEnglish(value) === normalizeEnglish(question.answer);
    audio.current?.unlock();
    audio.current?.play(correct ? "correct" : "wrong");
    setFeedback(correct);
    if (correct) setRound({ ...round, correct: [...round.correct, question.id] });
  }
  function next() {
    if (!round || feedback === undefined || round.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY))
      return;
    window.speechSynthesis?.cancel();
    if (round.at + 1 < round.ids.length) {
      setRound({ ...round, at: round.at + 1 });
      setFeedback(undefined);
      setWords([]);
      setTranscript(false);
      return;
    }
    const activity: PracticeActivity = {
      id: round.id,
      islandId: "languages",
      islandName: uiText("Porto das Vozes · Inglês"),
      ...(round.mode === "final" && round.correct.length >= 4 ? { moduleLevel: round.part } : {}),
      completedAt: new Date().toISOString(),
      answers: round.ids.length,
      correct: round.correct.length,
      languageAttempt: {
        part: round.part,
        mode: round.mode,
        questions: round.ids,
        correctQuestions: round.correct,
      },
    };
    onPractice(activity);
    setSummary(activity);
    setRound(undefined);
    setFeedback(undefined);
    audio.current?.play("finish");
  }
  function listen() {
    if (!question) return;
    const voice = window.speechSynthesis
      ?.getVoices()
      .find((item) => item.localService && isEnglishVoice(item));
    if (!voice) {
      setWarning(
        uiText("Não há uma voz inglesa local disponível neste aparelho. Use o texto da fala."),
      );
      setTranscript(true);
      return;
    }
    speakEnglish(question.phrase, {
      voice,
      rate: 0.86,
      onUnavailable: () => {
        setTranscript(true);
        setWarning(uiText("Não foi possível reproduzir a fala. O texto continua disponível."));
      },
    });
  }
  function back() {
    if (round) {
      setLeave(true);
      return;
    }
    if (inside) {
      setInside(false);
      setSummary(undefined);
    } else onBack();
  }
  return (
    <section className="english-journey" aria-label={uiText("Porto das Vozes · Inglês")}>
      <header className="english-journey-header">
        <button type="button" className="secondary-button" onClick={back}>
          <PaperArrow back />
          {uiText("Voltar")}
        </button>
        <p>
          {uiText("Porto das Vozes")} <span> / {uiText("Inglês")}</span>
        </p>
        <strong>
          <PaperDigits value={String(progress.percent)} />%
        </strong>
      </header>
      {!inside ? (
        <>
          <div className="english-port-intro">
            <img src="/practice-islands/languages.webp" width="800" height="800" alt="" />
            <div>
              <p className="english-eyebrow">
                {uiText("Uma nova língua, uma descoberta de cada vez")}
              </p>
              <h1>{uiText("Ilha de Inglês")}</h1>
              <p>
                {uiText(
                  "Olena e Oliver esperam por você no porto. Entenda as falas, escolha respostas e construa suas primeiras conversas.",
                )}
              </p>
              <p>{uiText("Percurso introdutório A1 · 6 partes · No seu ritmo")}</p>
              <button className="primary-button" type="button" onClick={() => setInside(true)}>
                {uiText("Explorar Inglês")}
                <PaperArrow />
              </button>
            </div>
          </div>
          <MathPlaceTreasure key={rewardRevision} course="english-a1" />
        </>
      ) : round && question ? (
        <div className="english-lesson">
          <div className="english-lesson-top">
            <span>{uiText(data.title)}</span>
            <span>{uiText("Questão {0} de {1}", [round.at + 1, round.ids.length])}</span>
          </div>
          <progress
            max={round.ids.length}
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
              <p lang="en">
                {question.kind === "gap"
                  ? question.phrase.replace(question.answer, "____")
                  : question.kind === "order"
                    ? question.meaning
                    : question.phrase}
              </p>
              <button className="secondary-button" type="button" onClick={listen}>
                {uiText("Ouvir a fala")}
              </button>
              <button
                className="text-button"
                type="button"
                aria-expanded={transcript}
                onClick={() => setTranscript(!transcript)}
              >
                {uiText("Ver texto da fala")}
              </button>
              {transcript && <p lang="en">{question.phrase}</p>}
            </div>
            <img
              src="/profile-avatars/oliver.webp"
              alt={uiText("Oliver")}
              width="150"
              height="150"
            />
          </div>
          <h1>{question.prompt}</h1>
          {question.kind === "reply" && (
            <p className="english-reply-intent">
              {uiText("Oliver quer dizer: {0}", [question.replyMeaning])}
            </p>
          )}
          {question.kind === "order" ? (
            <>
              <div className="english-word-answer" aria-live="polite" lang="en">
                {words.map((id) => question.phrase.split(" ")[id]).join(" ") ||
                  uiText("Escolha as palavras na ordem.")}
              </div>
              <div className="english-word-bank">
                {tokens.map(({ text, id }) => (
                  <button
                    type="button"
                    key={id}
                    className="secondary-button"
                    lang="en"
                    disabled={feedback !== undefined || words.includes(id)}
                    onClick={() => setWords([...words, id])}
                  >
                    {text}
                  </button>
                ))}
              </div>
              <div className="english-actions">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={feedback !== undefined || words.length === 0}
                  onClick={() => setWords(words.slice(0, -1))}
                >
                  {uiText("Desfazer")}
                </button>
                <button
                  ref={nextFocus}
                  className="primary-button"
                  type="button"
                  disabled={feedback !== undefined || words.length !== tokens.length}
                  onClick={() =>
                    answer(words.map((id) => question.phrase.split(" ")[id]).join(" "))
                  }
                >
                  {uiText("Conferir resposta")}
                </button>
              </div>
            </>
          ) : (
            <div className="english-options">
              {question.options.map((option, index) => (
                <button
                  ref={index === 0 ? nextFocus : undefined}
                  className="secondary-button"
                  type="button"
                  key={option}
                  lang={question.kind === "meaning" ? undefined : "en"}
                  disabled={feedback !== undefined}
                  onClick={() => answer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          {feedback !== undefined && (
            <div
              className={`english-feedback ${feedback ? "is-correct" : "is-wrong"}`}
              role="status"
            >
              <strong>{feedback ? uiText("Muito bem!") : uiText("Vamos entender juntos?")}</strong>
              <p lang="en">{question.answer}</p>
              <p>{question.kind === "reply" ? question.replyMeaning : question.meaning}</p>
              <button ref={nextFocus} type="button" className="primary-button" onClick={next}>
                {uiText("Continuar")}
                <PaperArrow />
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="english-course-heading">
            <img src="/profile-avatars/oliver.webp" width="96" height="96" alt={uiText("Oliver")} />
            <div>
              <p className="english-eyebrow">{uiText("Ilha de Inglês · Primeiras conversas")}</p>
              <h1>{uiText(data.title)}</h1>
              <p>{uiText(data.objective)}</p>
            </div>
          </div>
          {summary && (
            <div className="english-summary" role="status">
              <h2>{uiText("Rodada concluída")}</h2>
              <p>
                {uiText("Acertos: {0} · Erros: {1} · Pontos: {2}", [
                  summary.correct,
                  summary.answers - summary.correct,
                  summary.correct * 20,
                ])}
              </p>
              <p>
                {summary.languageAttempt?.mode === "final"
                  ? summary.correct >= 4
                    ? uiText("Parte confirmada! O próximo caminho está aberto.")
                    : uiText(
                        "Revise quatro respostas corretas antes de tentar a confirmação novamente.",
                      )
                  : uiText("Cada resposta correta aproxima você da confirmação desta parte.")}
              </p>
            </div>
          )}
          <nav className="english-parts" aria-label={uiText("Partes do percurso de inglês")}>
            {ENGLISH_JOURNEY.map((item, index) => (
              <button
                type="button"
                className={`secondary-button ${part === index ? "is-selected" : ""}`}
                key={item.title}
                aria-current={part === index ? "step" : undefined}
                disabled={index > 0 && !progress.parts[index - 1]!.confirmed}
                onClick={() => {
                  setPart(index);
                  setSummary(undefined);
                }}
              >
                <PaperDigits value={String(index + 1)} />
                <span>
                  {uiText(item.title)}
                  <small>
                    {progress.parts[index]!.confirmed
                      ? uiText("Confirmada")
                      : `${Math.min(20, progress.parts[index]!.solved.size)}/20`}
                  </small>
                </span>
              </button>
            ))}
          </nav>
          <section className="english-part-detail">
            <h2>{uiText("Parte {0} de 6", [part + 1])}</h2>
            <p>
              {uiText(
                "Domine 20 questões diferentes e confirme a parte com pelo menos 4 acertos em 5. Errar faz parte: você recebe uma explicação e pode praticar novamente.",
              )}
            </p>
            <progress
              max={20}
              value={current.confirmed ? 20 : Math.min(19, current.solved.size)}
              aria-label={uiText("Domínio da parte")}
            />
            <p>{uiText("Acertos: {0} · Erros: {1}", [current.correct, current.errors])}</p>
            {current.review > 0 && (
              <p>{uiText("Faltam {0} respostas corretas de revisão.", [current.review])}</p>
            )}
            <div className="english-actions">
              <button className="primary-button" type="button" onClick={() => start("practice")}>
                {uiText("Praticar")}
                <PaperArrow />
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={current.solved.size < 20 || current.review > 0 || current.confirmed}
                onClick={() => start("final")}
              >
                {uiText("Confirmar esta parte")}
              </button>
            </div>
          </section>
          <MathPlaceTreasure key={rewardRevision} course="english-a1" />
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
    </section>
  );
}
