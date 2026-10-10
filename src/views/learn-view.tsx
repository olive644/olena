import { PaperCheckIcon } from "../components/paper-check-icon";
import { useCallback, useState, type Dispatch, type FormEvent } from "react";
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
}> = [
  {
    mode: "listening",
    level: 1,
    title: "Escuta",
    description: "Ouça, reconheça e traduza palavras.",
    icon: "learn",
  },
  {
    mode: "review",
    level: 2,
    title: "Flashcards",
    description: "Revise no seu ritmo e fortaleça a memória.",
    icon: "library",
  },
  {
    mode: "quiz",
    level: 3,
    title: "Quiz",
    description: "Responda desafios e acompanhe seus acertos.",
    icon: "xp",
  },
  {
    mode: "bingo",
    level: 4,
    title: "Bingo",
    description: "Complete a cartela com seus conteúdos.",
    icon: "learn",
  },
];

const SOLO_WORLDS = PRACTICE_ISLANDS;

const SOLO_PROGRESS_KEY = "helena.soloProgress";

function PracticeHub() {
  const [worldIndex, setWorldIndex] = useState(4);
  const [insideWorld, setInsideWorld] = useState(false);
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
    return <MathIslandJourney entryOrigin={entryOrigin} onBack={() => setInsideWorld(false)} />;
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
          {available ? "Entrar no laboratório" : "Ilha bloqueada"}
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
        <h3>Revisão em dia</h3>
        <p>Nenhum cartão pendente para esta matéria.</p>
      </div>
    );

  return (
    <div className="review-session">
      <div className="study-progress">
        <span>
          {queue.length} pendente{queue.length === 1 ? "" : "s"}
        </span>
      </div>
      <article className="review-card">
        <span>{revealed ? "Resposta" : "Pergunta"}</span>
        <h3>{revealed ? card.back : card.front}</h3>
      </article>
      {revealed ? (
        <div className="rating-row">
          <button type="button" onClick={() => rate("again")}>
            Errei
          </button>
          <button type="button" onClick={() => rate("hard")}>
            Difícil
          </button>
          <button type="button" onClick={() => rate("easy")}>
            Fácil
          </button>
        </div>
      ) : (
        <button
          className="primary-button study-main-action"
          type="button"
          onClick={() => setRevealed(true)}
        >
          Mostrar resposta
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
        <h3>Questionário indisponível</h3>
        <p>Crie flashcards na Biblioteca para gerar perguntas locais.</p>
      </div>
    );

  if (finished)
    return (
      <div className="study-finished">
        <strong>
          {correct}/{cards.length}
        </strong>
        <h3>Questionário concluído</h3>
        <p>O resultado foi salvo no seu histórico local.</p>
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
          Questão {index + 1} de {cards.length}
        </span>
      </div>
      <h3>{card.front}</h3>
      <label className="field">
        <span>Sua resposta</span>
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
          {feedback === "correct" ? "Resposta correta." : `Resposta esperada: ${card.back}`}
        </p>
      )}
      <button className="secondary-button" type="submit">
        {feedback
          ? index + 1 === cards.length
            ? "Ver resultado"
            : "Próxima questão"
          : "Responder"}
      </button>
    </form>
  );
}

function BingoSession({ workspace, dispatch, subjectId }: LearnViewProps & { subjectId: string }) {
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
        <h3>Seu bingo de estudos</h3>
        <p>Complete uma linha, coluna ou diagonal. Os cartões da matéria entram como desafios.</p>
        <button className="primary-button" type="button" onClick={createBoard}>
          Criar bingo
        </button>
      </div>
    );

  const completed = board.cells.filter((cell) => cell.completed).length;
  const won = hasBingo(board);

  return (
    <div className="bingo-session">
      <div className="study-progress">
        <span>{completed}/9 desafios concluídos</span>
        <button className="link-button" type="button" onClick={createBoard}>
          Novo bingo
        </button>
      </div>
      {won && (
        <div className="bingo-success" role="status">
          <PaperCheckIcon size={18} /> Bingo! Você completou uma sequência.
        </div>
      )}
      <div className="bingo-grid" role="group" aria-label="Cartela de bingo">
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
            <span className="section-label">Praticar</span>
            <h1>Pratique para lembrar.</h1>
          </div>
          <label className="view-select">
            <span>Matéria</span>
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
        <section className="module-panel study-panel" aria-label="Praticar">
          {mode === "hub" ? (
            <PracticeHub />
          ) : (
            <>
              <div className="module-heading solo-session-heading">
                <button className="link-button" type="button" onClick={() => setMode("hub")}>
                  <HelenaRoomIcon name="back" size={18} /> Voltar aos mundos
                </button>
                <h2 id="study-mode-title">Minigame Solo</h2>
              </div>
              <div className="mode-switch" role="navigation" aria-label="Minigames Solo">
                <button
                  className={mode === "listening" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setMode("listening")}
                >
                  Escuta
                </button>
                <button
                  className={mode === "review" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setMode("review")}
                >
                  Flashcards
                </button>
                <button
                  className={mode === "quiz" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setMode("quiz")}
                >
                  Quizzes
                </button>
                <button
                  className={mode === "bingo" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setMode("bingo")}
                >
                  Bingo
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
