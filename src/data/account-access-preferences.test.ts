import { expect, it } from "vitest";
import { readAccessPreferences, writeAccessPreferences } from "./account-access-preferences";

it("keeps explicit consent and cooldown for the same owner without sharing them with another", () => {
  expect(readAccessPreferences(localStorage, "a").consent).toBe(false);
  writeAccessPreferences(localStorage, "a", { consent: true });
  writeAccessPreferences(localStorage, "a", { resetSentAt: 123 });
  expect(readAccessPreferences(localStorage, "a")).toEqual({
    uid: "a",
    consent: true,
    resetSentAt: 123,
  });
  expect(readAccessPreferences(localStorage, "b")).toEqual({
    uid: "b",
    consent: false,
    resetSentAt: 0,
  });
  writeAccessPreferences(localStorage, "a", { consent: false });
  expect(readAccessPreferences(localStorage, "a").consent).toBe(false);
});
it("fails closed when storage is unavailable", () => {
  expect(
    readAccessPreferences(
      {
        getItem() {
          throw new Error("denied");
        },
      },
      "a",
    ).consent,
  ).toBe(false);
});
