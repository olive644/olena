import { lazy, Suspense, type Dispatch } from "react";
import { uiText } from "../i18n/runtime";
import type { AppView } from "./app-navigation";
import type { WorkspaceAction, WorkspaceState } from "../domain/workspace";
import { MATH_COURSES } from "../data/math-courses";
import { readStudentResume } from "../data/student-resume";
import { FOCUS_SESSION_KEY, readFocusSession } from "../domain/focus-session";
import { FocusRose, PomodoroTomato } from "./focus-art";
import { focusFlowerState } from "../domain/focus-flower";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { PaperArrow } from "./paper-arrow";
import { HelenaLoading } from "./helena-loading";
import { PaperActionIcon } from "./paper-action-icon";
import { useWallClock } from "../hooks/use-wall-clock";
const NotebookPreview = lazy(() => import("./student-notebook-preview"));
const IslandPreview = lazy(() => import("./student-island-preview"));
export function StudentDestinations({
  workspace,
  dispatch,
  onNavigate,
}: {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  onNavigate(view: AppView): void;
}) {
  const resume = readStudentResume();
  const now = useWallClock();
  const last = [...(workspace.practiceActivities ?? [])]
    .filter(
      (item) =>
        item.answers > 0 &&
        Date.parse(item.completedAt) <= now &&
        MATH_COURSES.some((course) => item.islandId === `mathematics:${course.id}`),
    )
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))[0];
  const course =
    MATH_COURSES.find((item) => last?.islandId === `mathematics:${item.id}`) ?? MATH_COURSES[0]!;
  const books = workspace.notebooks.filter(
    (item) => item.kind !== "folder" && item.kind !== "collection" && item.kind !== "note",
  );
  const book =
    books.find((item) => item.id === resume.notebook?.id) ??
    [...books].sort((a, b) => {
      const changed = (ids: string[], created: string) =>
        Math.max(
          Date.parse(created) || 0,
          ...workspace.notes
            .filter((note) => ids.includes(note.id))
            .map((note) => Date.parse(note.updatedAt) || 0),
        );
      return changed(b.pageIds, b.createdAt) - changed(a.pageIds, a.createdAt);
    })[0];
  function openBook(page?: string) {
    onNavigate("notes");
    if (book)
      window.history.replaceState(
        null,
        "",
        `/cadernos?caderno=${encodeURIComponent(book.id)}${page ? `&folha=${encodeURIComponent(page)}` : ""}`,
      );
  }
  const session = readFocusSession(localStorage.getItem(FOCUS_SESSION_KEY), now);
  const mode = session?.mode ?? resume.focus?.mode;
  const flower = focusFlowerState(workspace.focusSessions, now, agendaTimeZone());
  return (
    <nav className="student-space-shortcuts" aria-label={uiText("Seu próximo destino")}>
      <button
        type="button"
        className="student-destination student-destination--learn student-destination--art"
        onClick={() => {
          try {
            sessionStorage.setItem("olena:enter-mathematics", course.id);
          } catch {
            /* O hub continua acessível. */
          }
          onNavigate("learn");
        }}
      >
        <Suspense
          fallback={
            <img
              className="student-island-art"
              src={`/math-islands/places/${course.id}-small.webp`}
              alt=""
              width="180"
              height="180"
            />
          }
        >
          <IslandPreview key={course.id} course={course.id} />
        </Suspense>
        <span>
          <strong>{uiText("Explorar as ilhas")}</strong>
          <small>{course.title}</small>
        </span>
        <PaperArrow />
      </button>
      <section
        className={`student-destination student-destination--notes${book ? " has-notebook" : ""}`}
        aria-label={uiText("Meus cadernos")}
      >
        {!book && (
          <span className="student-empty-notebook" aria-hidden="true">
            <PaperActionIcon name="book" />
          </span>
        )}
        {book && (
          <div className="student-notebook-preview">
            <Suspense fallback={<HelenaLoading compact />}>
              <NotebookPreview
                notebook={book}
                workspace={workspace}
                dispatch={dispatch}
                onOpen={openBook}
              />
            </Suspense>
          </div>
        )}
        <button
          type="button"
          className="student-resume-open"
          onClick={() => openBook(resume.notebook?.page)}
        >
          <span>
            <strong>{uiText("Meus cadernos")}</strong>
            <small>{book?.title ?? uiText("Abra um caderno para continuar por aqui.")}</small>
          </span>
          <PaperArrow />
        </button>
      </section>
      <button
        type="button"
        className="student-destination student-destination--focus student-destination--art"
        onClick={() => onNavigate("focus")}
      >
        <span className="student-focus-art" aria-hidden="true">
          {mode === "pomodoro" ? (
            <PomodoroTomato
              progress={session ? session.secondsRemaining / (session.duration * 60) : 1}
            />
          ) : (
            <FocusRose progress={flower.progress} wilted={flower.wilted} />
          )}
        </span>
        <span>
          <strong>{uiText("Hora de focar")}</strong>
          <small>{uiText(mode === "pomodoro" ? "Pomodoro" : "Cronômetro")}</small>
        </span>
        <PaperArrow />
      </button>
    </nav>
  );
}
