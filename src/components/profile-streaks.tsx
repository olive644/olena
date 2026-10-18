import { uiText, useLanguage } from "../i18n/runtime";
import { profileStreaks } from "../domain/profile-streaks";
import { agendaTimeZone } from "../data/agenda-time-zone";
import type { WorkspaceState } from "../domain/workspace";
import { PaperFlower } from "./agenda-focus-week";
import { useWallClock } from "../hooks/use-wall-clock";
export function ProfileStreaks({ workspace }: { workspace: WorkspaceState }) {
  useLanguage();

  const clockNow = useWallClock();
  let days: unknown;
  try {
    days = JSON.parse(localStorage.getItem("noteoli.pomodoro-streak.v1") ?? "[]");
  } catch {
    days = [];
  }
  const streaks = profileStreaks(workspace, days, new Date(clockNow), agendaTimeZone());
  return (
    <>
      {(
        [
          ["pomodoro", uiText(1606)],
          ["timer", uiText(103)],
          ["islands", uiText(1921)],
        ] as const
      ).map(
        ([key, label]) =>
          streaks[key] > 0 && (
            <span
              className="profile-streak"
              key={key}
              title={`${label}: ${streaks[key]} ${streaks[key] === 1 ? uiText(1922) : uiText(1923)}`}
              aria-label={`${label}: ${streaks[key]} ${streaks[key] === 1 ? uiText(1922) : uiText(1923)}`}
            >
              {key === "islands" ? (
                <img src="/math-islands/flame.svg" alt="" width="28" height="28" />
              ) : key === "pomodoro" ? (
                <i className="streak-tomato is-active" aria-hidden="true" />
              ) : (
                <PaperFlower active />
              )}
              <strong>{streaks[key]}</strong>
            </span>
          ),
      )}
    </>
  );
}
