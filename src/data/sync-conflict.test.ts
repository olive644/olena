import { describe, expect, it } from "vitest";
import { mergeSyncedItems } from "./sync-conflict";
import { FOCUS_SESSION_KEY, type FocusSession } from "../domain/focus-session";

describe("mergeSyncedItems", () => {
  it("keeps the latest valid active focus snapshot and combines Pomodoro days", () => {
    const snapshot: FocusSession = {
      mode: "timer",
      phase: "focus",
      completed: 0,
      duration: 25,
      secondsRemaining: 1500,
      elapsedMilliseconds: 60000,
      running: false,
      timerStartedAt: null,
      pomodoroDeadline: null,
      savedAt: 1000,
    };
    const old = JSON.stringify(snapshot);
    const latest = JSON.stringify({ ...snapshot, elapsedMilliseconds: 120000, savedAt: 2000 });
    const result = mergeSyncedItems(
      {},
      { [FOCUS_SESSION_KEY]: latest, "noteoli.pomodoro-streak.v1": '["2026-10-12"]' },
      { [FOCUS_SESSION_KEY]: old, "noteoli.pomodoro-streak.v1": '["2026-10-11"]' },
    );
    expect(result.items[FOCUS_SESSION_KEY]).toBe(latest);
    expect(result.items["noteoli.pomodoro-streak.v1"]).toBe('["2026-10-11","2026-10-12"]');
    expect(result.conflicts).toEqual([]);
  });
  it("combina alterações independentes dos dispositivos", () => {
    expect(
      mergeSyncedItems(
        { profile: "old", theme: "light" },
        { profile: "new-local", theme: "light" },
        { profile: "old", theme: "dark" },
      ),
    ).toEqual({
      items: { profile: "new-local", theme: "dark" },
      conflicts: [],
    });
  });

  it("preserva a versão local e marca conflito na mesma chave", () => {
    expect(
      mergeSyncedItems({ workspace: "old" }, { workspace: "local" }, { workspace: "remote" }),
    ).toEqual({ items: { workspace: "local" }, conflicts: ["workspace"] });
  });

  it("mantém exclusões locais sem reintroduzir o valor antigo", () => {
    expect(mergeSyncedItems({ note: "old" }, {}, { note: "old" })).toEqual({
      items: {},
      conflicts: [],
    });
  });
});
