import { uiText, useLanguage } from "../i18n/runtime";
import { profileStreaks } from "../domain/profile-streaks";
import { agendaTimeZone } from "../data/agenda-time-zone";
import type { WorkspaceState } from "../domain/workspace";
import { PaperFlower } from "./agenda-focus-week";
import { useWallClock } from "../hooks/use-wall-clock";
import { useState } from "react";
import "./profile-streak-inspection.css";
export function ProfileStreaks({ workspace }: { workspace: WorkspaceState }) {
  const clockNow = useWallClock();
  let days: unknown;
  try {
    days = JSON.parse(localStorage.getItem("noteoli.pomodoro-streak.v1") ?? "[]");
  } catch {
    days = [];
  }
  const streaks = profileStreaks(workspace, days, new Date(clockNow), agendaTimeZone());
  return <ProfileStreakValues streaks={streaks} />;
}

export function ProfileStreakValues({ streaks }: { streaks: ReturnType<typeof profileStreaks> }) {
  useLanguage();
  const [inspecting, setInspecting] = useState("");
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
            <span className="profile-streak-inspection" key={key}>
              <button
                type="button"
                className="profile-streak"
                aria-expanded={inspecting === key}
                onClick={() => setInspecting(inspecting === key ? "" : key)}
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
              </button>
              {inspecting === key && (
                <span className="profile-streak-detail" role="status">
                  {label}: {streaks[key]} {streaks[key] === 1 ? uiText(1922) : uiText(1923)}
                </span>
              )}
            </span>
          ),
      )}
    </>
  );
}
