import { Lock } from "lucide-react";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { useCallback, useEffect, useRef, useState, type Dispatch, type FormEvent } from "react";
import { HelenaRoomIcon } from "../components/helena-room-icon";
import { NavigationIcon } from "../components/navigation-icon";
import { PageHeader } from "../components/app-navigation";
import { ListeningQuiz } from "../components/listening-quiz";
import { writeSyncedStorage } from "../data/synced-storage";
import "../solo-journey.css";
import { PRACTICE_ISLANDS } from "../data/practice-islands";
import { PracticeIslandCarousel } from "../components/practice-island-carousel";
import { PracticeUserPortrait } from "../components/practice-user-portrait";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { isMotionReduced } from "../data/accessibility-preferences";
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
const SOLO_ROUTE = "M135 620 C135 550 225 540 225 450 S135 370 135 280 S180 190 180 100";

function PracticeHub({
  onSelect,
  unlockedLevel,
}: {
  onSelect: (mode: SoloMode) => void;
  unlockedLevel: number;
}) {
  const [worldIndex, setWorldIndex] = useState(0);
  const [insideWorld, setInsideWorld] = useState(false);
  const [profile] = useStoredProfile();
  const [entryPending, setEntryPending] = useState(false);
  const entryOrigin = useRef<DOMRect | null>(null);
  const [worldTransition, setWorldTransition] = useState(false);
  const world = SOLO_WORLDS[worldIndex]!;

  function visitWorld(index: number) {
    if (index === worldIndex || index < 0 || index >= SOLO_WORLDS.length) return;
    setWorldIndex(index);
    setWorldTransition(true);
  }

  useEffect(() => {
    if (!worldTransition) return;
    const timer = window.setTimeout(() => setWorldTransition(false), 550);
    return () => window.clearTimeout(timer);
  }, [worldIndex, worldTransition]);

  useEffect(() => {
    if (!insideWorld) return;
    let secondFrame = 0;
    let flight: HTMLElement | null = null;
    let destination: HTMLElement | null = null;
    let animation: Animation | null = null;
    const frame = requestAnimationFrame(() => {
      document
        .querySelector(`.solo-path-level--${Math.min(unlockedLevel, 4)}`)
        ?.scrollIntoView?.({ block: "center", behavior: "instant" });
      secondFrame = requestAnimationFrame(() => {
        const origin = entryOrigin.current;
        entryOrigin.current = null;
        destination = document.querySelector<HTMLElement>(".solo-path-avatar");
        if (
          !origin ||
          !destination ||
          typeof destination.animate !== "function" ||
          isMotionReduced()
        ) {
          setEntryPending(false);
          return;
        }
        const target = destination.getBoundingClientRect();
        flight = destination.cloneNode(true) as HTMLElement;
        flight.className = "practice-user-portrait practice-avatar-flight";
        flight.setAttribute("aria-hidden", "true");
        Object.assign(flight.style, {
          left: `${origin.left}px`,
          top: `${origin.top}px`,
          width: `${origin.width}px`,
          height: `${origin.height}px`,
        });
        document.body.append(flight);
        destination.style.visibility = "hidden";
        animation = flight.animate(
          [
            { transform: "translate(0, 0) scale(1)" },
            {
              transform: `translate(${target.left - origin.left}px, ${target.top - origin.top}px) scale(${target.width / origin.width})`,
            },
          ],
          { duration: 950, easing: "cubic-bezier(.22,.7,.2,1)", fill: "forwards" },
        );
        animation.onfinish = () => {
          if (destination) destination.style.visibility = "";
          flight?.remove();
          setEntryPending(false);
        };
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
      animation?.cancel();
      flight?.remove();
      if (destination) destination.style.visibility = "";
    };
  }, [insideWorld, unlockedLevel]);

  useEffect(() => {
    if (!insideWorld) return;
    document.body.classList.add("solo-world-open");
    return () => document.body.classList.remove("solo-world-open");
  }, [insideWorld]);

  if (insideWorld && world.number !== 1) {
    return (
      <div className="practice-hub solo-world-enter practice-subject-island">
        <section className="solo-journey" aria-labelledby="solo-subject-title">
          <div className="solo-journey__heading">
            <div>
              <button className="link-button" type="button" onClick={() => setInsideWorld(false)}>
                <HelenaRoomIcon name="back" size={18} /> Voltar aos mundos
              </button>
              <span className="section-label">{world.subject}</span>
              <h2 id="solo-subject-title">{world.title}</h2>
              <p>{world.description}</p>
            </div>
          </div>
          <div className="solo-subject-scene">
            <img
              key={world.number}
              src={world.art}
              srcSet={`${world.art.replace(".webp", "-small.webp")} 480w, ${world.art} 800w`}
              sizes="(max-width: 600px) calc(100vw - 32px), 580px"
              width="800"
              height="800"
              alt={`Ilha de ${world.subject} em papel recortado`}
              decoding="async"
            />
          </div>
          <ul className="solo-subject-topics" aria-label={`Temas de ${world.subject}`}>
            {world.topics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
          <p className="solo-subject-note">
            Explore o cenário. Os exercícios desta ilha chegam depois.
          </p>
          <div className="solo-subject-navigation">
            <button
              className="secondary-button"
              type="button"
              onClick={() => visitWorld(worldIndex - 1)}
            >
              <HelenaRoomIcon name="back" size={18} /> Ilha anterior
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={worldIndex === SOLO_WORLDS.length - 1}
              onClick={() => visitWorld(worldIndex + 1)}
            >
              Próxima ilha <HelenaRoomIcon name="play" size={18} />
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (insideWorld) {
    return (
      <div
        className={`practice-hub solo-world-enter practice-avatar-journey${worldTransition ? " is-switching-world" : ""}`}
      >
        <section className="solo-journey" aria-labelledby="solo-world-title">
          <div className="solo-journey__heading">
            <div>
              <button className="link-button" type="button" onClick={() => setInsideWorld(false)}>
                <HelenaRoomIcon name="back" size={18} /> Voltar aos mundos
              </button>
              <span className="section-label">Mundo {world.number}</span>
              <h2 id="solo-world-title">{world.title}</h2>
              <p>Avance pelo caminho e libere um desafio de cada vez.</p>
            </div>
            <div
              className="solo-journey__progress"
              aria-label={`Progresso no Mundo ${world.number}`}
            >
              <span>Seu progresso</span>
              <strong>{Math.min(unlockedLevel, SOLO_LEVELS.length)}/4 níveis</strong>
            </div>
          </div>

          <div
            className={`solo-level-path solo-level-path--world-${world.number}`}
            aria-label={`Caminho de níveis do Mundo ${world.number}`}
          >
            <picture className="solo-level-scenery" aria-hidden="true">
              <source
                media="(min-width: 900px)"
                srcSet={`/solo-interior-${world.number}-desktop.webp`}
              />
              <img
                className="solo-level-scenery__art"
                src={`/solo-interior-${world.number}.webp`}
                alt=""
                decoding="async"
                fetchPriority="high"
              />
            </picture>
            <div className="solo-level-track">
              <svg
                className="solo-level-path__route"
                viewBox="0 0 360 720"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path className="solo-level-path__road-shadow" d={SOLO_ROUTE} />
                <path className="solo-level-path__road" d={SOLO_ROUTE} />
                <path className="solo-level-path__trail" d={SOLO_ROUTE} />
              </svg>
              {SOLO_LEVELS.map((game) => {
                const unlocked = game.level <= unlockedLevel;
                return (
                  <button
                    className={`solo-path-level solo-path-level--${game.level}${unlocked ? " is-unlocked" : " is-locked"}`}
                    type="button"
                    onClick={() => unlocked && onSelect(game.mode)}
                    disabled={!unlocked}
                    aria-label={`Nível ${game.level}: ${game.title}. ${unlocked ? game.description : "Bloqueado. Complete o nível anterior para desbloquear."}`}
                    key={game.mode}
                  >
                    {game.level === unlockedLevel && (
                      <PracticeUserPortrait
                        profile={profile}
                        className={`solo-path-avatar${entryPending ? " is-entering" : ""}`}
                        level={game.level}
                      />
                    )}
                    <span className="solo-path-level__badge">
                      {unlocked ? <NavigationIcon name={game.icon} /> : <Lock size={22} />}
                      <b>{game.level}</b>
                    </span>
                    <span>
                      <small>Nível {game.level}</small>
                      <strong>{game.title}</strong>
                      {!unlocked && <em>Complete o nível anterior</em>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="practice-hub practice-hub--carousel">
      <PracticeIslandCarousel index={worldIndex} onVisit={visitWorld} profile={profile} />
      <div className="solo-world-card" aria-live="polite">
        <span className="section-label">{world.subject}</span>
        <h3>{world.title}</h3>
        <p>{world.description}</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            entryOrigin.current =
              document
                .querySelector(".practice-island-avatar .practice-user-portrait")
                ?.getBoundingClientRect() ?? null;
            setEntryPending(world.number === 1 && !!entryOrigin.current && !isMotionReduced());
            setInsideWorld(true);
          }}
        >
          <HelenaRoomIcon name="play" /> {world.number === 1 ? "Entrar no mundo" : "Explorar ilha"}
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
  const [unlockedLevel, setUnlockedLevel] = useState(() => {
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
            <PracticeHub onSelect={setMode} unlockedLevel={unlockedLevel} />
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
