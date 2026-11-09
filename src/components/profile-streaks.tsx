import { uiText, useLanguage } from "../i18n/runtime";
import { profileStreaks } from "../domain/profile-streaks";
import { agendaTimeZone } from "../data/agenda-time-zone";
import type { WorkspaceState } from "../domain/workspace";
import { PaperFlower } from "./agenda-focus-week";
import { useWallClock } from "../hooks/use-wall-clock";
import { useState } from "react";
import { PaperArrow } from "./paper-arrow";
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

export function ProfileStreakValues({
  streaks,
}: {
  streaks: Omit<ReturnType<typeof profileStreaks>, "english"> & { english?: number };
}) {
  useLanguage();
  const [inspecting, setInspecting] = useState("");
  const active = (
    [
      ["pomodoro", uiText(1606)],
      ["timer", uiText(103)],
      ["islands", uiText(1921)],
      ["english", uiText("Inglês")],
    ] as const
  ).filter(([key]) => (streaks[key] ?? 0) > 0);
  if (active.length > 1)
    return (
      <details
        className="profile-streak-group"
        key={active.map(([key]) => key).join(":")}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !event.currentTarget.open) return;
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }}
      >
        <summary aria-label={`${uiText(2741)}: ${active.length}`}>
          <span className="profile-streak-stack" aria-hidden="true">
            {active.map(([key]) => (
              <span key={key}>
                <StreakIcon kind={key} />
              </span>
            ))}
          </span>
          <strong>{active.length}</strong>
          <PaperArrow />
        </summary>
        <span className="profile-streak-group-list">
          {active.map(([key, label]) => (
            <span className="profile-streak-group-row" key={key}>
              <StreakIcon kind={key} />
              <span>{label}</span>
              <strong>
                {streaks[key]} {streaks[key] === 1 ? uiText(1922) : uiText(1923)}
              </strong>
            </span>
          ))}
        </span>
      </details>
    );
  return (
    <>
      {active.map(
        ([key, label]) =>
          (streaks[key] ?? 0) > 0 && (
            <span className="profile-streak-inspection" key={key}>
              <button
                type="button"
                className="profile-streak"
                aria-expanded={inspecting === key}
                onClick={() => setInspecting(inspecting === key ? "" : key)}
                aria-label={`${label}: ${streaks[key]} ${streaks[key] === 1 ? uiText(1922) : uiText(1923)}`}
              >
                <StreakIcon kind={key} />
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

function StreakIcon({ kind }: { kind: "pomodoro" | "timer" | "islands" | "english" }) {
  if (kind === "english")
    return <img src="/languages/english-streak-flame.svg" alt="" width="28" height="28" />;
  if (kind === "islands")
    return <img src="/math-islands/flame.svg" alt="" width="28" height="28" />;
  if (kind === "pomodoro") return <i className="streak-tomato is-active" aria-hidden="true" />;
  return <PaperFlower active />;
}

