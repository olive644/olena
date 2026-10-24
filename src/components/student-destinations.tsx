import { lazy, Suspense } from "react";
import { uiText } from "../i18n/runtime";
import type { AppView } from "./app-navigation";
import type { WorkspaceState } from "../domain/workspace";
import { MATH_COURSES } from "../data/math-courses";
import { readStudentResume } from "../data/student-resume";
import { FOCUS_SESSION_KEY, readFocusSession } from "../domain/focus-session";
import { FocusRose } from "./focus-art";
import { AnimatedPomodoroTomato } from "./pomodoro-tomato";
import { tomatoStage } from "../domain/pomodoro-tomato";
import { focusFlowerState } from "../domain/focus-flower";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { useWallClock } from "../hooks/use-wall-clock";
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
