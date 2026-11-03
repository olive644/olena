import { beforeEach, expect, it } from "vitest";
import { lastPracticeIsland, rememberPracticeIsland } from "./practice-island-selection";
import { ACCOUNT_OWNER_KEY } from "./personal-data";
beforeEach(() => localStorage.clear());
it("restores the last destination across remounts without leaking the other account selection", () => {
  localStorage.setItem(ACCOUNT_OWNER_KEY, "account-a");
  rememberPracticeIsland("japanese");
  expect(lastPracticeIsland()).toBe("japanese");
  localStorage.setItem(ACCOUNT_OWNER_KEY, "account-b");
  expect(lastPracticeIsland()).toBeUndefined();
  localStorage.setItem(ACCOUNT_OWNER_KEY, "account-a");
  expect(lastPracticeIsland()).toBe("japanese");
});
it("ignores malformed or absent caches", () => {
  expect(lastPracticeIsland()).toBeUndefined();
  localStorage.setItem("helena.practiceIsland.v1", "bad json");
  expect(lastPracticeIsland()).toBeUndefined();
});

it("honors an explicit preference change instead of restoring a stale destination", () => {
  rememberPracticeIsland("mathematics", "chemistry");
  expect(lastPracticeIsland("chemistry")).toBe("mathematics");
  expect(lastPracticeIsland("english")).toBeUndefined();
  rememberPracticeIsland("japanese", "english");
  expect(lastPracticeIsland("english")).toBe("japanese");
  expect(lastPracticeIsland("chemistry")).toBeUndefined();
});
