import { afterEach, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useProfileStudy } from "./use-profile-study";
import { SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("lê pontos da conta sem gravar progresso e zera ao aplicar outra conta", () => {
  localStorage.setItem(
    "helena.mathPlaceRewards.v1",
    JSON.stringify({
      foundations: { points: 750, receipts: ["round"], chests: [] },
      school: { points: 50, receipts: ["other"], chests: [] },
    }),
  );
  const before = localStorage.getItem("helena.mathPlaceRewards.v1");
  localStorage.setItem(
    "helena.room-xp.v1",
    JSON.stringify({ total: 600, receipts: ["xp-reward"] }),
  );
  const { result } = renderHook(() => useProfileStudy());
  expect(result.current).toMatchObject({ totalPoints: 800, level: 2, current: 100, next: 750 });
  expect(result.current.courses[0]?.percent).toBe(0);
  expect(localStorage.getItem("helena.mathPlaceRewards.v1")).toBe(before);
  act(() => {
    localStorage.clear();
    window.dispatchEvent(new Event(SYNCED_STORAGE_APPLIED_EVENT));
  });
  expect(result.current).toMatchObject({ totalPoints: 0, level: 1, current: 0 });
});
