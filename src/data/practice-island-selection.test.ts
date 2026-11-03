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
