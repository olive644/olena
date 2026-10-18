import { uiText, useLanguage, localizeLabels, uiLocale } from "../i18n/runtime";
import { Gauge, Headphones, Play, RotateCcw, Square, Volume2, X } from "lucide-react";
import { PaperCheckIcon } from "./paper-check-icon";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Flashcard } from "../domain/workspace";
import {
  buildListeningDeck,
  createListeningRound,
  isListeningAnswerCorrect,
  type ListeningCard,
} from "../domain/listening-quiz";
import { classifyWordDifficulty, type WordDifficulty } from "../data/word-difficulty";
import {
  selectFallbackEnglishVoice,
  SPEECH_RATE_OPTIONS,
  speakEnglish,
} from "../data/speech-voice";
import { NaturalVoicePlayer, type NaturalVoiceState } from "../data/listening-audio";
import { useListeningOnline } from "../hooks/use-listening-online";
import { ListeningOnlineNotice } from "./listening-online-notice";

type RoundState = "ready" | "countdown" | "answering" | "feedback" | "finished";
type DifficultyFilter = "mixed" | WordDifficulty;
type RoundLimit = 5 | 10 | 15 | "all";

const DIFFICULTY_LABELS: Record<DifficultyFilter, string> = localizeLabels(() => ({
  mixed: uiText(1719),
  easy: uiText(418),
  medium: uiText(419),
  hard: uiText(420),
}));

export function ListeningQuiz({
  flashcards,
  onComplete,
}: {
  flashcards: readonly Flashcard[];
  onComplete?: () => void;
}) {
  const currentUiLanguage = useLanguage();

  const initialDeck = useMemo(
    () => buildListeningDeck(flashcards),
    [flashcards, currentUiLanguage],
  );
  const [deck, setDeck] = useState(initialDeck);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<RoundState>("ready");
  const [countdown, setCountdown] = useState(5);
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<ListeningCard[]>([]);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("mixed");
  const [difficultyById, setDifficultyById] = useState<Record<string, WordDifficulty>>({});
  const [classifying, setClassifying] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.86);
  const [roundLimit, setRoundLimit] = useState<RoundLimit>(10);
  const [naturalState, setNaturalState] = useState<NaturalVoiceState>({ status: "idle" });
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const answerRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | undefined>(undefined);
  const naturalPlayerRef = useRef<NaturalVoicePlayer | undefined>(undefined);
  const card = deck[index];

  useEffect(() => {
    if (state === "finished") onComplete?.();
  }, [onComplete, state]);

  useEffect(() => {
    if (state !== "countdown") return;
    const timer = window.setTimeout(() => {
      if (countdown <= 1) setState("answering");
      else setCountdown((value) => value - 1);
    }, 1_000);
    return () => window.clearTimeout(timer);
  }, [countdown, state]);

  useEffect(() => {
    if (state === "answering") answerRef.current?.focus();
  }, [state]);

  const online = useListeningOnline();
  const onlineAllowed = online.allowed;
  const isAllowed = online.isAllowed;

  useEffect(() => {
    // O texto das frases só vai à empresa de voz se a pessoa tiver aceitado.
    const player = new NaturalVoicePlayer(setNaturalState, isAllowed);
    naturalPlayerRef.current = player;
    return () => player.dispose();
  }, [isAllowed]);

  useEffect(() => {
    let active = true;
    Promise.all(
      initialDeck.map(
        async (item) =>
          [
            item.id,
            // Cada palavra só é consultada online com o aceite; sem ele, a dificuldade é estimada aqui.
            (await classifyWordDifficulty(item.front, window.localStorage, onlineAllowed))
              .difficulty,
          ] as const,
      ),
    ).then((entries) => {
      if (!active) return;
      setDifficultyById(Object.fromEntries(entries));
      setClassifying(false);
    });
    return () => {
      active = false;
    };
  }, [initialDeck, onlineAllowed]);

  const playAudio = useCallback(() => {
    if (!card) return;
    void naturalPlayerRef.current?.generate(card.front, speechRate, () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      const voice = selectFallbackEnglishVoice(voices);
      utteranceRef.current = speakEnglish(card.front, {
        voice,
        rate: speechRate,
        onUnavailable: () => setNaturalState({ status: "error", message: uiText(421) }),
      });
    });
  }, [card, speechRate]);

  useEffect(() => {
    if (state !== "answering") return;
    const timer = window.setTimeout(playAudio, 0);
    return () => window.clearTimeout(timer);
  }, [playAudio, state]);

  function beginRound() {
    const filtered =
      difficultyFilter === "mixed"
        ? initialDeck
        : initialDeck.filter(
            (item) => (item.difficulty ?? difficultyById[item.id]) === difficultyFilter,
          );
    const nextDeck = createListeningRound(filtered, roundLimit);
    if (nextDeck.length === 0) return;
    setDeck(nextDeck);
    setIndex(0);
    setCorrect(0);
    setMissed([]);
    setAnswer("");
    setSubmittedAnswer("");
    setWasCorrect(false);
    submittedRef.current = false;
    naturalPlayerRef.current?.preload(nextDeck[0]!.front, speechRate);
    setCountdown(5);
    setState("countdown");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card || !answer.trim() || submittedRef.current || state !== "answering") return;
    submittedRef.current = true;
    const accepted = isListeningAnswerCorrect(card, answer);
    setSubmittedAnswer(answer.trim());
    setWasCorrect(accepted);
    if (accepted) setCorrect((value) => value + 1);
    else
      setMissed((items) => (items.some((item) => item.id === card.id) ? items : [...items, card]));
    setState("feedback");
  }

  function nextRound() {
    if (index + 1 >= deck.length) {
      setState("finished");
      return;
    }
    setIndex((value) => value + 1);
    setAnswer("");
    setSubmittedAnswer("");
    submittedRef.current = false;
    naturalPlayerRef.current?.preload(deck[index + 1]!.front, speechRate);
    setCountdown(5);
    setState("countdown");
  }

  function restart(cards = initialDeck) {
    setDeck(cards);
    setIndex(0);
    setCorrect(0);
    setMissed([]);
    setAnswer("");
    setSubmittedAnswer("");
    submittedRef.current = false;
    setState("ready");
  }

  function selectDifficulty(filter: DifficultyFilter) {
    const cards =
      filter === "mixed"
        ? initialDeck
        : initialDeck.filter((item) => (item.difficulty ?? difficultyById[item.id]) === filter);
    if (cards.length === 0) return;
    setDifficultyFilter(filter);
    restart(cards);
  }

  function countDifficulty(filter: WordDifficulty): number {
    return initialDeck.filter((item) => (item.difficulty ?? difficultyById[item.id]) === filter)
      .length;
  }

  function stopAudio() {
    window.speechSynthesis?.cancel();
    naturalPlayerRef.current?.stop();
    setNaturalState((current) =>
      current.status === "playing" || current.status === "generating"
        ? { status: "ready" }
        : current,
    );
  }

  if (!card) return null;

  if (state === "finished") {
    return (
      <div className="listening-finish" role="status">
        <span className="listening-finish__score">
          {correct}/{deck.length}
        </span>
        <div>
          <span className="section-label">{uiText(422)}</span>
          <h3>{missed.length === 0 ? uiText(423) : uiText(424)}</h3>
          <p>
            {missed.length === 0
              ? uiText(425)
              : uiText(1722, [missed.length, missed.length === 1 ? uiText(1720) : uiText(1721)])}
          </p>
        </div>
        <div className="listening-finish__actions">
          {missed.length > 0 && (
            <button className="primary-button" type="button" onClick={() => restart(missed)}>
              <RotateCcw size={17} /> {uiText(426)}
            </button>
          )}
          <button className="secondary-button" type="button" onClick={() => restart()}>
            {uiText(427)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`listening-quiz is-${state}`}>
      <div className="listening-topline">
        <span>
          {uiText(428)} {index + 1} {uiText(72)} {deck.length}
        </span>
        <span>
          {correct} {uiText(429)}
        </span>
      </div>

      {state === "ready" && (
        <div className="listening-setup">
          <section aria-labelledby="listening-level-title">
            <div className="listening-setting-heading">
              <h3 id="listening-level-title">{uiText(430)}</h3>
              <span>
                {deck.length} {uiText(431)}
              </span>
            </div>
            <div className="listening-difficulty" aria-label={uiText(432)}>
              {(Object.keys(DIFFICULTY_LABELS) as DifficultyFilter[]).map((filter) => {
                const count = filter === "mixed" ? initialDeck.length : countDifficulty(filter);
                return (
                  <button
                    className={difficultyFilter === filter ? "is-active" : undefined}
                    type="button"
                    disabled={classifying || count === 0}
                    aria-pressed={difficultyFilter === filter}
                    onClick={() => selectDifficulty(filter)}
                    key={filter}
                  >
                    <span>{DIFFICULTY_LABELS[filter]}</span>
                    <small>{classifying ? "…" : uiText(1723, [count])}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="listening-session-settings" aria-labelledby="listening-session-title">
            <h3 id="listening-session-title">{uiText(433)}</h3>
            <div className="listening-limit" role="group" aria-label={uiText(434)}>
              {([5, 10, 15, "all"] as const).map((limit) => (
                <button
                  type="button"
                  className={roundLimit === limit ? "is-active" : undefined}
                  aria-pressed={roundLimit === limit}
                  onClick={() => setRoundLimit(limit)}
                  key={limit}
                >
                  {limit === "all" ? uiText(1724) : limit}
                </button>
              ))}
            </div>
          </section>

          {online.choice === null && (
            <ListeningOnlineNotice choice={online.choice} onChoose={online.choose} />
          )}

          <details className="listening-audio-settings">
            <summary>
              <Headphones size={18} /> {uiText(435)}
            </summary>
            {online.choice !== null && (
              <ListeningOnlineNotice
                choice={online.choice}
                onChoose={online.choose}
                variant="compact"
              />
            )}
            <p className="listening-model-state" role="status">
              {naturalState.status === "idle"
                ? uiText(436)
                : naturalState.status === "error"
                  ? naturalState.message
                  : naturalState.status === "generating"
                    ? (naturalState.message ?? uiText(2059))
                    : naturalState.status === "playing"
                      ? uiText(1725)
                      : uiText(437)}
            </p>
            <div className="listening-voice-controls">
              <label>
                <Gauge size={16} aria-hidden="true" />
                <span>{uiText(438)}</span>
                <select
                  value={speechRate}
                  onChange={(event) => setSpeechRate(Number(event.target.value))}
                >
                  {SPEECH_RATE_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary-button listening-test-voice"
                type="button"
                onClick={playAudio}
                disabled={naturalState.status === "generating"}
              >
                <Play size={16} /> {uiText(439)}
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={stopAudio}
                aria-label={uiText(440)}
              >
                <Square size={16} />
              </button>
            </div>
          </details>
        </div>
      )}

      {state === "countdown" ? (
        <div className="listening-stage listening-stage--countdown" aria-live="polite">
          <span className="listening-digital">{countdown || "•"}</span>
          <small>{countdown ? uiText(441) : uiText(1726)}</small>
        </div>
      ) : state === "feedback" ? (
        <div
          className={`listening-stage listening-stage--feedback ${wasCorrect ? "is-correct" : "is-wrong"}`}
          aria-live="polite"
        >
          <span className="listening-result-icon">
            {wasCorrect ? <PaperCheckIcon size={30} /> : <X size={30} />}
          </span>
          <small>{wasCorrect ? uiText(1727) : uiText(442)}</small>
          {!wasCorrect && (
            <p className="listening-user-answer">
              {uiText(443)} <strong>{submittedAnswer}</strong>
            </p>
          )}
          {!wasCorrect && <span className="listening-correct-label">{uiText(444)}</span>}
          <strong>{card.front}</strong>
          <p>{card.back}</p>
          <div className="listening-feedback-actions">
            <button className="secondary-button" type="button" onClick={playAudio}>
              <Volume2 size={17} /> {uiText(445)}
            </button>
            <button className="listening-next" type="button" onClick={nextRound}>
              {index + 1 === deck.length ? uiText(1728) : uiText(446)}
            </button>
          </div>
        </div>
      ) : (
        <div className="listening-stage">
          <button
            className="listening-speaker"
            type="button"
            onClick={playAudio}
            aria-label={uiText(445)}
          >
            <Volume2 size={30} />
          </button>
          {state === "ready" ? (
            <>
              <span className="section-label">{uiText(447)}</span>
              <h3>{uiText(448)}</h3>
              <p>
                {uiText(449)} {DIFFICULTY_LABELS[difficultyFilter].toLocaleLowerCase(uiLocale())}
                {uiText(2528)}
              </p>
              <small className="listening-privacy-note">{uiText(450)}</small>
              <button className="primary-button" type="button" onClick={beginRound}>
                <Play size={17} /> {uiText(451)}
              </button>
            </>
          ) : (
            <form className="listening-answer" onSubmit={submit}>
              <label htmlFor="listening-answer">{uiText(452)}</label>
              <div>
                <input
                  ref={answerRef}
                  id="listening-answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  autoComplete="off"
                  required
                />
                <button type="submit">{uiText(453)}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
