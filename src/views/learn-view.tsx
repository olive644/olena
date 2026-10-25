import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { isMathCourse } from "../data/math-courses";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { useCallback, useEffect, useState, type Dispatch, type FormEvent } from "react";
import { HelenaRoomIcon } from "../components/helena-room-icon";
import { PageHeader } from "../components/app-navigation";
import { ListeningQuiz } from "../components/listening-quiz";
import { writeSyncedStorage } from "../data/synced-storage";
import "../solo-journey.css";
import { PRACTICE_ISLANDS } from "../data/practice-islands";
import { PracticeIslandCarousel } from "../components/practice-island-carousel";
import { MathIslandJourney } from "../components/math-island-journey";
import { useStoredProfile } from "../hooks/use-stored-profile";
import "../practice-islands.css";
import {
  buildBingoLabels,
  dueFlashcards,
  hasBingo,
  toDateKey,
  type FlashcardRating,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";

type LearnViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

type SoloMode = "review" | "quiz" | "listening" | "bingo";

const SOLO_LEVELS: Array<{
  mode: SoloMode;
  level: number;
  title: string;
  description: string;
  icon: "learn" | "library" | "xp";
}> = localizeLabels(() => [
  {
    mode: "listening",
    level: 1,
    title: uiText(428),
    description: uiText(1247),
    icon: "learn",
  },
  {
    mode: "review",
    level: 2,
    title: uiText(1273),
    description: uiText(1248),
    icon: "library",
  },
  {
    mode: "quiz",
    level: 3,
    title: uiText(1968),
    description: uiText(1969),
    icon: "xp",
  },
  {
    mode: "bingo",
    level: 4,
    title: uiText(1275),
    description: uiText(1249),
    icon: "learn",
  },
]);

const SOLO_WORLDS = PRACTICE_ISLANDS;

const SOLO_PROGRESS_KEY = "helena.soloProgress";

function PracticeHub({ dispatch, workspace }: LearnViewProps) {
  useLanguage();

  const [worldIndex, setWorldIndex] = useState(() => {
    try {
      const entry = sessionStorage.getItem("olena:enter-mathematics");
      if (entry === "1" || isMathCourse(entry)) return 4;
    } catch {
      /* Preferência do workspace continua disponível sem sessionStorage. */
    }
    const index = PRACTICE_ISLANDS.findIndex(
      (island) => island.id === workspace.studyPreferences.initialIslandId,
    );
    return index < 0 ? 4 : index;
  });
  const [entryCourse] = useState(() => {
    try {
      const value = sessionStorage.getItem("olena:enter-mathematics");
      return value === "1" ? "foundations" : isMathCourse(value) ? value : undefined;
    } catch {
      return undefined;
    }
  });
  const [insideWorld, setInsideWorld] = useState(Boolean(entryCourse));
  useEffect(() => {
    try {
      sessionStorage.removeItem("olena:enter-mathematics");
    } catch {
      /* Sem armazenamento, manter o hub normal. */
    }
  }, []);
  const [entryOrigin, setEntryOrigin] = useState<{ x: number; y: number; size: number }>();
  const [profile] = useStoredProfile();
  const world = SOLO_WORLDS[worldIndex]!;
  const available = world.id === "mathematics";

  function enterMath() {
    if (!available) return;
    const rect = document.querySelector(".practice-island-avatar")?.getBoundingClientRect();
    if (rect)
      setEntryOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        size: rect.width,
      });
    setInsideWorld(true);
  }
  if (insideWorld && available)
    return (
      <MathIslandJourney
        {...(entryCourse ? { initialCourse: entryCourse } : {})}
        entryOrigin={entryOrigin}
        onBack={() => setInsideWorld(false)}
        onPractice={(activity) => dispatch({ type: "practice/recorded", activity })}
      />
    );
  return (
    <div className="practice-hub practice-hub--carousel">
      <PracticeIslandCarousel
        index={worldIndex}
        onVisit={(index) => {
          if (index >= 0 && index < SOLO_WORLDS.length) setWorldIndex(index);
        }}
        profile={profile}
        onEnter={enterMath}
      />
      <div className="solo-world-card" aria-live="polite">
        <span className="section-label">{world.subject}</span>
        <h3>{world.title}</h3>
        <p>{world.description}</p>
        <button className="primary-button" type="button" disabled={!available} onClick={enterMath}>
          {available ? (
            <HelenaRoomIcon name="play" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 10V7a6 6 0 0 1 12 0v3h-3V7a3 3 0 0 0-6 0v3Z" fill="#facc15" />
              <path d="m3 10 18 0v11H3Z" fill="#e8c275" />
              <path d="m3 10 18 0-3 3H6v8H3Z" fill="#fff1c2" />
              <path d="M11 14h2v4h-2Z" fill="#333142" />
            </svg>
          )}
          {available ? uiText(1250) : uiText(1970)}
        </button>
      </div>
    </div>
  );
}
function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ReviewSession({
  workspace,
  dispatch,
  subjectId,
  onComplete,
}: LearnViewProps & { subjectId: string; onComplete?: () => void }) {
  useLanguage();

  const today = toDateKey(new Date());
  const [queue, setQueue] = useState(() =>
    dueFlashcards(workspace, today)
      .filter((card) => card.subjectId === subjectId)
      .map((card) => card.id),
  );
  const [revealed, setRevealed] = useState(false);
  const card = workspace.flashcards.find((item) => item.id === queue[0]);

  function rate(rating: FlashcardRating) {
    if (!card) return;
    dispatch({ type: "flashcard/reviewed", id: card.id, rating, reviewedOn: today });
    if (queue.length === 1) onComplete?.();
    setQueue((current) => current.slice(1));
    setRevealed(false);
  }

  if (!card)
    return (
      <div className="study-finished">
        <PaperCheckIcon size={22} />
        <h3>{uiText(1251)}</h3>
        <p>{uiText(1252)}</p>
      </div>
    );

  return (
    <div className="review-session">
      <div className="study-progress">
        <span>
          {queue.length} {uiText(1253)}
          {queue.length === 1 ? "" : "s"}
        </span>
      </div>
      <article className="review-card">
        <span>{revealed ? uiText(1971) : uiText(476)}</span>
        <h3>{revealed ? card.back : card.front}</h3>
      </article>
      {revealed ? (
        <div className="rating-row">
          <button type="button" onClick={() => rate("again")}>
            {uiText(1254)}
          </button>
          <button type="button" onClick={() => rate("hard")}>
            {uiText(420)}
          </button>
          <button type="button" onClick={() => rate("easy")}>
            {uiText(418)}
          </button>
        </div>
      ) : (
        <button
          className="primary-button study-main-action"
          type="button"
          onClick={() => setRevealed(true)}
        >
          {uiText(1255)}
        </button>
      )}
    </div>
  );
}

function QuizSession({
  workspace,
  dispatch,
  subjectId,
  onComplete,
}: LearnViewProps & { subjectId: string; onComplete?: () => void }) {
  useLanguage();

  const cards = workspace.flashcards.filter((card) => card.subjectId === subjectId).slice(0, 5);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [finished, setFinished] = useState(false);
  const card = cards[index];

  if (cards.length === 0)
    return (
      <div className="study-finished">
        <h3>{uiText(1256)}</h3>
        <p>{uiText(1257)}</p>
      </div>
    );

  if (finished)
    return (
      <div className="study-finished">
        <strong>
          {correct}/{cards.length}
        </strong>
        <h3>{uiText(1258)}</h3>
        <p>{uiText(1259)}</p>
      </div>
    );
  if (!card) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card) return;
    if (feedback) {
      const nextIndex = index + 1;
      if (nextIndex >= cards.length) {
        dispatch({
          type: "quiz/recorded",
          subjectId,
          correct,
          total: cards.length,
          completedAt: new Date().toISOString(),
        });
        onComplete?.();
        setFinished(true);
      } else {
        setIndex(nextIndex);
        setAnswer("");
        setFeedback(null);
      }
      return;
    }

    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(card.back);
    if (isCorrect) setCorrect((value) => value + 1);
    setFeedback(isCorrect ? "correct" : "wrong");
  }

  return (
    <form className="quiz-session" onSubmit={submit}>
      <div className="study-progress">
        <span>
          {uiText(1260)} {index + 1} {uiText(72)} {cards.length}
        </span>
      </div>
      <h3>{card.front}</h3>
      <label className="field">
        <span>{uiText(1261)}</span>
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          disabled={feedback !== null}
          required
        />
      </label>
      {feedback && (
        <p
          className={feedback === "correct" ? "quiz-feedback is-correct" : "quiz-feedback is-wrong"}
        >
          {feedback === "correct" ? uiText(1972) : uiText(1973, [card.back])}
        </p>
      )}
      <button className="secondary-button" type="submit">
        {feedback ? (index + 1 === cards.length ? uiText(1728) : uiText(1262)) : uiText(1781)}
      </button>
    </form>
  );
}

function BingoSession({ workspace, dispatch, subjectId }: LearnViewProps & { subjectId: string }) {
  useLanguage();

  const board = workspace.bingoBoards.find((item) => item.subjectId === subjectId);
  const fronts = workspace.flashcards
    .filter((card) => card.subjectId === subjectId)
    .map((card) => card.front);

  function createBoard() {
    dispatch({
      type: "bingo/created",
      subjectId,
      labels: buildBingoLabels(fronts),
      createdAt: new Date().toISOString(),
    });
  }

  if (!board)
    return (
      <div className="study-finished bingo-intro">
        <h3>{uiText(1263)}</h3>
        <p>{uiText(1264)}</p>
        <button className="primary-button" type="button" onClick={createBoard}>
          {uiText(1265)}
        </button>
      </div>
    );

  const completed = board.cells.filter((cell) => cell.completed).length;
  const won = hasBingo(board);

  return (
    <div className="bingo-session">
      <div className="study-progress">
        <span>
          {completed}
          {uiText(2568)}
        </span>
        <button className="link-button" type="button" onClick={createBoard}>
          {uiText(1266)}
        </button>
      </div>
      {won && (
        <div className="bingo-success" role="status">
          <PaperCheckIcon size={18} /> {uiText(1267)}
        </div>
      )}
      <div className="bingo-grid" role="group" aria-label={uiText(1268)}>
        {board.cells.map((cell) => (
          <button
            className={cell.completed ? "is-complete" : undefined}
            type="button"
            aria-pressed={cell.completed}
            onClick={() =>
              dispatch({ type: "bingo/cell-toggled", boardId: board.id, cellId: cell.id })
            }
            key={cell.id}
          >
            <PaperCheckIcon size={16} />
            <span>{cell.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LearnView({ workspace, dispatch }: LearnViewProps) {
  useLanguage();

  const defaultSubject = workspace.subjects[0];
  const [subjectId, setSubjectId] = useState(defaultSubject?.id ?? "");
  const [mode, setMode] = useState<"hub" | SoloMode>("hub");
  const [, setUnlockedLevel] = useState(() => {
    const saved = Number(window.localStorage.getItem(SOLO_PROGRESS_KEY));
    return Number.isInteger(saved) && saved >= 1 ? Math.min(saved, SOLO_LEVELS.length) : 1;
  });

  const completeLevel = useCallback((level: number) => {
    setUnlockedLevel((current) => {
      const next = Math.max(current, Math.min(level + 1, SOLO_LEVELS.length));
      writeSyncedStorage(SOLO_PROGRESS_KEY, String(next));
      return next;
    });
  }, []);

  if (!defaultSubject) return null;
  const selectedSubject =
    workspace.subjects.find((subject) => subject.id === subjectId) ?? defaultSubject;

  return (
    <main
      className={`main-content${mode === "hub" ? " practice-island-page" : ""}`}
      id="main-content"
    >
      <PageHeader />
      {mode !== "hub" && (
        <header className="view-heading view-heading--with-action">
          <div>
            <span className="section-label">{uiText(101)}</span>
            <h1>{uiText(1269)}</h1>
          </div>
          <label className="view-select">
            <span>{uiText(1270)}</span>
            <select
              value={selectedSubject.id}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              {workspace.subjects.map((subject) => (
                <option value={subject.id} key={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
        </header>
      )}

      <div className={`learn-grid${mode === "hub" ? " learn-grid--practice-hub" : ""}`}>
        <section className="module-panel study-panel" aria-label={uiText(101)}>
          {mode === "hub" ? (
            <PracticeHub dispatch={dispatch} workspace={workspace} />
          ) : (
            <>
              <div className="module-heading solo-session-heading">
                <button className="link-button" type="button" onClick={() => setMode("hub")}>
                  <HelenaRoomIcon name="back" size={18} /> {uiText(815)}
                </button>
                <h2 id="study-mode-title">{uiText(1271)}</h2>
              </div>
              <div className="mode-switch" role="navigation" aria-label={uiText(1272)}>
                <button
                  className={mode === "listening" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setMode("listening")}
                >
                  {uiText(428)}
                </button>
                <button
                  className={mode === "review" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setMode("review")}
                >
                  {uiText(1273)}
                </button>
                <button
                  className={mode === "quiz" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setMode("quiz")}
                >
                  {uiText(1274)}
                </button>
                <button
                  className={mode === "bingo" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setMode("bingo")}
                >
                  {uiText(1275)}
                </button>
              </div>
              {mode === "review" ? (
                <ReviewSession
                  key={`review-${selectedSubject.id}`}
                  workspace={workspace}
                  dispatch={dispatch}
                  subjectId={selectedSubject.id}
                  onComplete={() => completeLevel(2)}
                />
              ) : mode === "quiz" ? (
                <QuizSession
                  key={`quiz-${selectedSubject.id}`}
                  workspace={workspace}
                  dispatch={dispatch}
                  subjectId={selectedSubject.id}
                  onComplete={() => completeLevel(3)}
                />
              ) : mode === "listening" ? (
                <ListeningQuiz
                  key={`listening-${selectedSubject.id}`}
                  flashcards={workspace.flashcards.filter(
                    (card) => card.subjectId === selectedSubject.id,
                  )}
                  onComplete={() => completeLevel(1)}
                />
              ) : (
                <BingoSession
                  workspace={workspace}
                  dispatch={dispatch}
                  subjectId={selectedSubject.id}
                />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default LearnView;
