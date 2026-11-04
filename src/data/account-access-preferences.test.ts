import { expect, it } from "vitest";
import { readAccessPreferences, writeAccessPreferences } from "./account-access-preferences";
import { clearPersonalData } from "./personal-data";

it("retains only the explicit account consent across a logout, not an account deletion", () => {
  writeAccessPreferences(localStorage, "returning", { consent: true, resetSentAt: 123 });
  clearPersonalData(localStorage, ["helena.accountAccess.v1"]);
  expect(readAccessPreferences(localStorage, "returning").consent).toBe(true);
  expect(readAccessPreferences(localStorage, "someone-else").consent).toBe(false);
  clearPersonalData(localStorage);
  expect(readAccessPreferences(localStorage, "returning").consent).toBe(false);
});

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

it("updating access preferences keeps the policy acceptance for its UID", () => {
  localStorage.setItem(
    "helena.accountAccess.v1",
    JSON.stringify({ uid: "a", privacyConsent: { version: "current", acceptedAt: "today" } }),
  );
  writeAccessPreferences(localStorage, "a", { consent: true });
  expect(JSON.parse(localStorage.getItem("helena.accountAccess.v1")!).privacyConsent.version).toBe(
    "current",
  );
  writeAccessPreferences(localStorage, "b", { consent: true });
  expect(
    JSON.parse(localStorage.getItem("helena.accountAccess.v1")!).privacyConsent,
  ).toBeUndefined();
});

it("repairs malformed access preferences without inventing policy consent", () => {
  localStorage.setItem("helena.accountAccess.v1", "invalid-json");
  writeAccessPreferences(localStorage, "a", { consent: true });
  expect(readAccessPreferences(localStorage, "a").consent).toBe(true);
  expect(
    JSON.parse(localStorage.getItem("helena.accountAccess.v1")!).privacyConsent,
  ).toBeUndefined();
});
