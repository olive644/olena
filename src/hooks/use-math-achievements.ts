import { useEffect, useState } from "react";
import { readMathGame } from "../data/math-game-learning";
import { SYNCED_STORAGE_APPLIED_EVENT, SYNCED_STORAGE_EVENT } from "../data/synced-storage";
import { mathAchievements } from "../domain/math-achievements";
import type { WorkspaceState } from "../domain/workspace";
import { agendaTimeZone } from "../data/agenda-time-zone";

export function useMathAchievements(workspace: WorkspaceState) {
  const [progress, setProgress] = useState(readMathGame);
  useEffect(() => {
    const refresh = () => setProgress(readMathGame());
    for (const event of [SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT, "storage"])
      window.addEventListener(event, refresh);
    refresh();
    return () => {
      for (const event of [SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT, "storage"])
        window.removeEventListener(event, refresh);
    };
  }, []);
  return mathAchievements(progress, workspace.practiceActivities, agendaTimeZone());
}
