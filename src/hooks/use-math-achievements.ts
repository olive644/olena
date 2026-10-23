import { useEffect, useState } from "react";
import { readMathGame } from "../data/math-game-learning";
import { SYNCED_STORAGE_APPLIED_EVENT, SYNCED_STORAGE_EVENT } from "../data/synced-storage";
import { mathAchievements } from "../domain/math-achievements";
import type { WorkspaceState } from "../domain/workspace";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { generalAchievements } from "../domain/general-achievements";
import { readStoredProfile, useStoredProfile } from "./use-stored-profile";
import { writeSyncedStorage } from "../data/synced-storage";
import { useSocialFeed } from "./use-social-feed";
import type { Achievement } from "../domain/math-achievements";
import { ACCOUNT_OWNER_KEY } from "../data/personal-data";

export type AchievementProgress = Achievement & {
  value: number;
  earned: boolean;
  earnedAt: string | undefined;
};

export function useMathAchievements(workspace: WorkspaceState) {
  const [progress, setProgress] = useState(readMathGame);
  const [profile] = useStoredProfile();
  const owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
  const feed = useSocialFeed(true);
  const social =
    profile.username && profile.username === feed?.self.username ? feed.self : undefined;
  const general = generalAchievements(workspace, social, agendaTimeZone()).map((item) => {
    const date = profile.achievementHistory?.[item.id];
    return date !== undefined
      ? { ...item, value: item.target, earned: true, earnedAt: date || undefined }
      : item;
  });
  const history = JSON.stringify(
    Object.fromEntries(
      general.filter((item) => item.earned).map((item) => [item.id, item.earnedAt ?? ""]),
    ),
  );
  useEffect(() => {
    if (localStorage.getItem(ACCOUNT_OWNER_KEY) !== owner) return;
    const current = readStoredProfile();
    const next = {
      ...current.achievementHistory,
      ...(JSON.parse(history) as Record<string, string>),
    };
    if (JSON.stringify(current.achievementHistory ?? {}) === JSON.stringify(next)) return;
    try {
      writeSyncedStorage(
        "helena.profile.v1",
        JSON.stringify({ ...current, achievementHistory: next }),
      );
    } catch {
      /* O histórico derivado continua visível se o cache estiver indisponível. */
    }
  }, [history, owner]);
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
  return [
    ...mathAchievements(progress, workspace.practiceActivities, agendaTimeZone()),
    ...general,
  ] as AchievementProgress[];
}
