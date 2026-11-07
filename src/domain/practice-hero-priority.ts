import { englishProgress } from "./language-progress";
import { practiceStreak } from "./profile-streaks";
import type { PracticeActivity, WorkspaceState } from "./workspace";

type HeroPractice = { streak: number; minutesLeft: number; expiresAt: number };
export function practiceHeroPriority(workspace: WorkspaceState, now: Date, timeZone: string) {
  const summarize = (records: PracticeActivity[]): HeroPractice => {
    const latest = Math.max(
      0,
      ...records
        .filter(
          (record) =>
            record.answers > 0 &&
            Number.isFinite(Date.parse(record.completedAt)) &&
            Date.parse(record.completedAt) <= now.getTime(),
        )
        .map((record) => Date.parse(record.completedAt)),
    );
    return {
      streak: practiceStreak(records, now, timeZone),
      expiresAt: latest + 86400000,
      minutesLeft: Math.max(0, Math.ceil((latest + 86400000 - now.getTime()) / 60000)),
    };
  };
  const math = summarize(
    (workspace.practiceActivities ?? []).filter((record) =>
      /^(math|mathematics)(:|$)/.test(record.islandId),
    ),
  );
  const english = summarize(englishProgress(workspace.practiceActivities).accepted);
  const urgent = (
    [
      { subject: "math", ...math },
      { subject: "english", ...english },
    ] as const
  )
    .filter((record) => record.streak > 0 && record.minutesLeft <= 60)
    .sort((a, b) => a.expiresAt - b.expiresAt || b.streak - a.streak);
  const preferred = urgent[0]?.subject ?? (english.streak > math.streak ? "english" : "math");
  return { math, english, preferred };
}
