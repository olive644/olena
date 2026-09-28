import { Check, Lock } from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
} from "react";
import { HelenaLoading } from "../components/helena-loading";
import { HelenaRoomIcon } from "../components/helena-room-icon";
import { NavigationIcon } from "../components/navigation-icon";
import { RoomErrorBoundary } from "../components/room-error-boundary";
import { PageHeader } from "../components/app-navigation";
import { ListeningQuiz } from "../components/listening-quiz";
import { writeSyncedStorage } from "../data/synced-storage";
import "../solo-journey.css";
import {
  buildBingoLabels,
  dueFlashcards,
  hasBingo,
  toDateKey,
  type FlashcardRating,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";

const LocalRoom = lazy(() =>
  import("../components/local-room").then((module) => ({ default: module.LocalRoom })),
);

type LearnViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  joinCode?: string | undefined;
  projectorMode?: boolean;
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

const SOLO_WORLDS = [
  { number: 1, title: "Bosque das palavras", description: "Escuta, memória e desafios." },
  { number: 2, title: "Cidade das ideias", description: "Novas aventuras em breve." },
  { number: 3, title: "Observatório do saber", description: "Novas aventuras em breve." },
] as const;

const SOLO_PROGRESS_KEY = "helena.soloProgress";
const SOLO_ROUTE = "M135 620 C135 550 225 540 225 450 S135 370 135 280 S180 190 180 100";

function PracticeHub({
  onSelect,
  onEnterRoom,
  unlockedLevel,
}: {
  onSelect: (mode: SoloMode) => void;
  onEnterRoom: () => void;
  unlockedLevel: number;
}) {
  const [worldIndex, setWorldIndex] = useState(0);
  const [insideWorld, setInsideWorld] = useState(false);
  const [jump, setJump] = useState({ count: 0, direction: 1 });
  const [worldTransition, setWorldTransition] = useState(false);
  const world = SOLO_WORLDS[worldIndex]!;

  function visitWorld(index: number) {
    if (index === worldIndex || index < 0 || index >= SOLO_WORLDS.length) return;
    setJump((current) => ({ count: current.count + 1, direction: index > worldIndex ? 1 : -1 }));
    setWorldIndex(index);
    setWorldTransition(true);
    window.setTimeout(() => setWorldTransition(false), 550);
  }

  useEffect(() => {
    if (!insideWorld) return;
    const frame = requestAnimationFrame(() => {
      document
        .querySelector(`.solo-path-level--${Math.min(unlockedLevel, 4)}`)
        ?.scrollIntoView?.({ block: "center", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [insideWorld, unlockedLevel]);

  useEffect(() => {
    if (!insideWorld) return;
    document.body.classList.add("solo-world-open");
    return () => document.body.classList.remove("solo-world-open");
  }, [insideWorld]);

  if (insideWorld) {
    return (
      <div
        className={`practice-hub solo-world-enter${worldTransition ? " is-switching-world" : ""}`}
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
                      <img
                        className="solo-path-mascot"
                        src="/helena-loading.svg"
                        alt={`Helena no nível ${game.level}`}
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
    <div className="practice-hub">
      <section className="solo-journey" aria-labelledby="solo-journey-title">
        <div className="solo-journey__heading">
          <div>
            <h2 id="solo-journey-title" className="section-label">
              Minigames Solo
            </h2>
          </div>
          <div className="solo-journey__progress" aria-label="Progresso no mundo atual">
            <span>Mundo {world.number}</span>
            <strong>
              {world.number === 1 ? `${Math.min(unlockedLevel, 4)}/4 níveis` : "Bloqueado"}
            </strong>
          </div>
        </div>

        <div className={`solo-world-map solo-world-map--${world.number}`}>
          <div className="solo-islands" aria-label="Mundos da Helena">
            <img
              key={world.number}
              className={`solo-island-art ${jump.direction < 0 ? "is-backward" : ""}`}
              src={`/solo-world-${world.number}.webp`}
              alt={`Mundo ${world.number}: ${world.title}`}
              decoding="async"
              fetchPriority="high"
            />
            <div className={`solo-traveler solo-traveler--${world.number}`}>
              <button
                key={jump.count}
                className={`solo-traveler__jump${jump.count ? " is-jumping" : ""} ${jump.direction < 0 ? "is-backward" : ""}`}
                type="button"
                aria-label="Brincar com a Helena"
                onClick={() => setJump((current) => ({ ...current, count: current.count + 1 }))}
              >
                <img src="/helena-loading.svg" alt="Helena" />
              </button>
            </div>
          </div>
          <button
            className="solo-world-map__arrow solo-world-map__arrow--previous"
            type="button"
            onClick={() => visitWorld(worldIndex - 1)}
            disabled={worldIndex === 0}
            aria-label="Mundo anterior"
          >
            <HelenaRoomIcon name="back" />
          </button>
          <button
            className="solo-world-map__arrow solo-world-map__arrow--next"
            type="button"
            onClick={() => visitWorld(worldIndex + 1)}
            disabled={worldIndex === SOLO_WORLDS.length - 1}
            aria-label="Próximo mundo"
          >
            <HelenaRoomIcon name="back" />
          </button>
          <div className="solo-world-card" aria-live="polite">
            <span className="section-label">Mundo {world.number}</span>
            <h3>{world.title}</h3>
            <p>{world.description}</p>
            {world.number === 1 ? (
              <button className="primary-button" type="button" onClick={() => setInsideWorld(true)}>
                <HelenaRoomIcon name="play" /> Entrar no mundo
              </button>
            ) : (
              <span className="solo-world-card__locked">
                <Lock size={16} /> Mundo bloqueado
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="room-entry-card" aria-labelledby="room-entry-title">
        <img src="/helena-holding-qr.png" alt="Helena segurando o convite do Modo Sala" />
        <div>
          <span className="section-label">Jogar com a turma</span>
          <h2 id="room-entry-title">Modo Sala</h2>
          <p>Crie uma sala, convide seus alunos e conduza atividades ao vivo.</p>
        </div>
        <button className="primary-button" type="button" onClick={onEnterRoom}>
          <HelenaRoomIcon name="play" /> Abrir Modo Sala
        </button>
      </section>
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
        <Check size={22} />
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
          <Check size={18} /> Bingo! Você completou uma sequência.
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
            <Check size={16} />
            <span>{cell.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LearnView({
  workspace,
  dispatch,
  joinCode,
  projectorMode = false,
}: LearnViewProps) {
  const defaultSubject = workspace.subjects[0];
  const [subjectId, setSubjectId] = useState(defaultSubject?.id ?? "");
  const [mode, setMode] = useState<"hub" | SoloMode | "room">(joinCode ? "room" : "hub");
  const [unlockedLevel, setUnlockedLevel] = useState(() => {
    const saved = Number(window.localStorage.getItem(SOLO_PROGRESS_KEY));
    return Number.isInteger(saved) && saved >= 1 ? Math.min(saved, SOLO_LEVELS.length) : 1;
  });

  useEffect(() => {
    if (mode !== "room") return;
    const leaveRoom = () => setMode("hub");
    window.addEventListener("popstate", leaveRoom);
    return () => window.removeEventListener("popstate", leaveRoom);
  }, [mode]);

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

  function enterRoom() {
    window.history.pushState({ ...window.history.state, helenaRoom: true }, "");
    setMode("room");
  }

  function leaveRoom() {
    if (window.history.state?.helenaRoom) window.history.back();
    else setMode("hub");
  }

  return (
    <main className="main-content" id="main-content">
      <PageHeader />
      <header className="view-heading view-heading--with-action">
        <div>
          <span className="section-label">Praticar</span>
          <h1>Pratique para lembrar.</h1>
        </div>
        <label className="view-select">
          <span>Matéria</span>
          <select value={selectedSubject.id} onChange={(event) => setSubjectId(event.target.value)}>
            {workspace.subjects.map((subject) => (
              <option value={subject.id} key={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className={`learn-grid${mode === "hub" ? " learn-grid--practice-hub" : ""}`}>
        <section className="module-panel study-panel" aria-label="Praticar">
          {mode === "hub" ? (
            <PracticeHub onSelect={setMode} onEnterRoom={enterRoom} unlockedLevel={unlockedLevel} />
          ) : mode === "room" ? (
            <Suspense fallback={<HelenaLoading label="Preparando o Modo Sala…" />}>
              <RoomErrorBoundary>
                <LocalRoom
                  initialJoinCode={joinCode}
                  projectorMode={projectorMode}
                  onExit={leaveRoom}
                />
              </RoomErrorBoundary>
            </Suspense>
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
