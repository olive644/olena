import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useState } from "react";
import { profileStreaks } from "../domain/profile-streaks";
import { agendaTimeZone } from "../data/agenda-time-zone";
import type { WorkspaceState } from "../domain/workspace";
import { SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";
import { PaperFlower } from "./agenda-focus-week";
export function ProfileStreaks({ workspace }: { workspace: WorkspaceState }) {
  useLanguage();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const events = ["storage", "focus", SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT];
    events.forEach((event) => window.addEventListener(event, refresh));
    const clock = window.setInterval(refresh, 60_000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, refresh));
      clearInterval(clock);
    };
  }, []);
  let days: unknown;
  try {
    days = JSON.parse(localStorage.getItem("noteoli.pomodoro-streak.v1") ?? "[]");
  } catch {
    days = [];
  }
  const streaks = profileStreaks(workspace, days, now, agendaTimeZone());
  const hasStreak = Object.values(streaks).some((value) => value > 0);
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
          (streaks[key] > 0 || (!hasStreak && key === "islands")) && (
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
