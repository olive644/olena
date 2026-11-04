import { claimDeviceForAccount, clearPersonalData } from "../data/personal-data";
import { describe, expect, it } from "vitest";
import {
  PRIVACY_CONSENT_ITEM,
  PRIVACY_POLICY_VERSION,
  readPrivacyConsent,
  recordPrivacyConsent,
} from "./privacy-policy";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("registro do aceite da política", () => {
  it("guarda a versão e o momento do aceite", () => {
    const storage = memoryStorage();
    recordPrivacyConsent(storage, new Date("2026-09-24T15:30:00.000Z"));
    expect(JSON.parse(storage.getItem(PRIVACY_CONSENT_ITEM)!)).toEqual({
      version: PRIVACY_POLICY_VERSION,
      acceptedAt: "2026-09-24T15:30:00.000Z",
    });
  });

  it("lê de volta o que foi guardado", () => {
    const storage = memoryStorage();
    recordPrivacyConsent(storage, new Date("2026-09-24T15:30:00.000Z"));
    expect(readPrivacyConsent(storage)).toEqual({
      version: PRIVACY_POLICY_VERSION,
      acceptedAt: "2026-09-24T15:30:00.000Z",
    });
  });

  it("trata ausência, lixo e formato errado como sem aceite", () => {
    expect(readPrivacyConsent(memoryStorage())).toBeNull();
    expect(readPrivacyConsent(memoryStorage({ [PRIVACY_CONSENT_ITEM]: "não é json" }))).toBeNull();
    expect(readPrivacyConsent(memoryStorage({ [PRIVACY_CONSENT_ITEM]: "{}" }))).toBeNull();
    expect(
      readPrivacyConsent(memoryStorage({ [PRIVACY_CONSENT_ITEM]: '{"version":1,"acceptedAt":2}' })),
    ).toBeNull();
  });

  it("não quebra quando o armazenamento recusa a gravação", () => {
    const full = {
      setItem: () => {
        throw new DOMException("cheio", "QuotaExceededError");
      },
    };
    expect(() => recordPrivacyConsent(full)).not.toThrow();
  });

  it("usa uma chave que é apagada junto com os dados pessoais ao sair da conta", () => {
    expect(PRIVACY_CONSENT_ITEM.startsWith("helena")).toBe(true);
  });
});

it("preserves an explicit policy acceptance for the same UID after logout, without sharing it", () => {
  localStorage.setItem("helena.account.v1", "ana");
  recordPrivacyConsent(localStorage);
  clearPersonalData(localStorage, ["helena.accountAccess.v1"]);
  claimDeviceForAccount(localStorage, "ana");
  expect(readPrivacyConsent(localStorage)?.version).toBe(PRIVACY_POLICY_VERSION);
  claimDeviceForAccount(localStorage, "bia");
  expect(readPrivacyConsent(localStorage)).toBeNull();
});

it("retains the explicit login acceptance recorded before the UID is claimed", () => {
  recordPrivacyConsent(localStorage);
  claimDeviceForAccount(localStorage, "login-user");
  clearPersonalData(localStorage, ["helena.accountAccess.v1"]);
  claimDeviceForAccount(localStorage, "login-user");
  expect(readPrivacyConsent(localStorage)?.version).toBe(PRIVACY_POLICY_VERSION);
});

it("does not upgrade an old policy while assigning its account", () => {
  localStorage.setItem(
    PRIVACY_CONSENT_ITEM,
    JSON.stringify({ version: "old-policy", acceptedAt: "2025-01-01" }),
  );
  claimDeviceForAccount(localStorage, "login-user");
  clearPersonalData(localStorage, ["helena.accountAccess.v1"]);
  claimDeviceForAccount(localStorage, "login-user");
  expect(readPrivacyConsent(localStorage)).toEqual({
    version: "old-policy",
    acceptedAt: "2025-01-01",
  });
});
