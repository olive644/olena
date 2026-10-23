import { expect, it } from "vitest";
import { mergeProfileProgress } from "./profile-progress";
import { mergeSyncedItems } from "../data/sync-conflict";
it("conquistas históricas se unem entre aparelhos sem sobrescrever a escolha dos destaques", () => {
  const selected = JSON.stringify({
    name: "Atual",
    achievementFavorites: [],
    achievementHistory: {
      "general-following-bronze": "",
      "general-streak-bronze": "2026-10-22T12:00:00Z",
    },
  });
  const other = JSON.stringify({
    achievementFavorites: ["correct-1"],
    achievementHistory: {
      "general-streak-bronze": "2026-10-21T12:00:00Z",
      "general-notebooks-bronze": "2026-10-20T12:00:00Z",
      admin: "2026-10-20T12:00:00Z",
    },
  });
  const result = JSON.parse(mergeProfileProgress(selected, other)!);
  expect(result.name).toBe("Atual");
  expect(result.achievementFavorites).toEqual([]);
  expect(result.achievementHistory).toEqual({
    "general-following-bronze": "",
    "general-streak-bronze": "2026-10-21T12:00:00Z",
    "general-notebooks-bronze": "2026-10-20T12:00:00Z",
  });
});
it("perfil remoto preserva identidade e não apaga XP nem retomada de uma cópia mais recente", () => {
  const local = JSON.stringify({
    name: "Antigo",
    xpLedger: { total: 600, receipts: ["won"] },
    studentResume: { focus: { mode: "pomodoro", at: 20 } },
  });
  const remote = JSON.stringify({
    name: "Confirmado",
    xpLedger: { total: 100, receipts: [] },
    studentResume: { focus: { mode: "timer", at: 10 } },
  });
  const merged = JSON.parse(mergeProfileProgress(remote, local, remote)!);
  expect(merged.name).toBe("Confirmado");
  expect(merged.xpLedger.total).toBe(600);
  expect(merged.studentResume.focus.mode).toBe("pomodoro");
  const key = "helena.profile.v1";
  const progressOnly = JSON.stringify({
    ...merged,
    xpLedger: { total: 650, receipts: ["won", "another"] },
  });
  const synced = mergeSyncedItems(
    { [key]: JSON.stringify(merged) },
    { [key]: progressOnly },
    { [key]: JSON.stringify(merged) },
  );
  expect(synced.conflicts).toEqual([]);
  expect(JSON.parse(synced.items[key]!).xpLedger.total).toBe(650);
});
