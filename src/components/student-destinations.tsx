import { lazy, Suspense } from "react";
import { uiText } from "../i18n/runtime";
import type { AppView } from "./app-navigation";
import type { WorkspaceState } from "../domain/workspace";
import { MATH_COURSES } from "../data/math-courses";
import { lastIslandOf } from "../data/last-island";
import { readStudentResume } from "../data/student-resume";
import { FOCUS_SESSION_KEY, readFocusSession } from "../domain/focus-session";
import { FocusRose } from "./focus-art";
import { AnimatedPomodoroTomato } from "./pomodoro-tomato";
import { tomatoStage } from "../domain/pomodoro-tomato";
import { focusFlowerState } from "../domain/focus-flower";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { useWallClock } from "../hooks/use-wall-clock";
// Arte do cenário de cada parte de Inglês (mesma ordem de english-part-catalog.ts).
const ENGLISH_ART = [
  "welcome",
  "habits",
  "memories",
  "plans",
  "ideas",
  "meaning",
  "market",
  "archive",
] as const;
const IslandPreview = lazy(() => import("./student-island-preview"));
export function StudentDestinations({
  workspace,
  onNavigate,
}: {
  workspace: WorkspaceState;
  onNavigate(view: AppView): void;
}) {
  const resume = readStudentResume();
  const now = useWallClock();
  // A ilha de destino é a última em que a pessoa entrou ou praticou, de Matemática ou de Inglês.
  const destination = lastIslandOf(workspace.practiceActivities ?? [], now);
  const englishArt = destination.id === "english" ? ENGLISH_ART[destination.part] : undefined;
  const course =
    MATH_COURSES.find(
      (item) => destination.id === "mathematics" && item.id === destination.course,
    ) ?? MATH_COURSES[0]!;
  const session = readFocusSession(localStorage.getItem(FOCUS_SESSION_KEY), now);
  const mode = session?.mode ?? resume.focus?.mode;
  const flower = focusFlowerState(workspace.focusSessions, now, agendaTimeZone());
  return (
    <nav className="student-space-shortcuts" aria-label={uiText(2708)}>
      <button
        type="button"
        className="student-destination student-destination--learn student-destination--art"
        aria-label={uiText(2709)}
        onClick={() => {
          try {
            if (englishArt) sessionStorage.setItem("olena:enter-english", "1");
            else sessionStorage.setItem("olena:enter-mathematics", course.id);
          } catch {
            /* O hub continua acessível. */
          }
          onNavigate("learn");
        }}
      >
        {englishArt ? (
          // Mesmo recipiente da prévia de Matemática: ele fixa o quadrado e a imagem se ajusta dentro.
          // Imagem solta com width e height herdava o aspect-ratio e saía esticada.
          <span
            className="student-island-art"
            data-island="english"
            data-part={englishArt}
            aria-hidden="true"
          >
            <img
              src={`/languages/english-parts/${englishArt}.webp`}
              alt=""
              width="180"
              height="180"
              decoding="async"
            />
          </span>
        ) : (
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
        )}
      </button>
      <button
        type="button"
        className="student-destination student-destination--focus student-destination--art"
        aria-label={uiText(2713)}
        onClick={() => onNavigate("focus")}
      >
        <span className="student-focus-art" aria-hidden="true">
          {mode === "pomodoro" ? (
            <AnimatedPomodoroTomato
              stage={tomatoStage(session ? session.secondsRemaining / (session.duration * 60) : 1)}
              sound={false}
            />
          ) : (
            <FocusRose progress={flower.progress} wilted={flower.wilted} />
          )}
        </span>
      </button>
    </nav>
  );
}
