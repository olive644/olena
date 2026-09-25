import { describe, expect, it } from "vitest";
import {
  PRIVACY_CONSENT_KEY,
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
    expect(JSON.parse(storage.getItem(PRIVACY_CONSENT_KEY)!)).toEqual({
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
    expect(readPrivacyConsent(memoryStorage({ [PRIVACY_CONSENT_KEY]: "não é json" }))).toBeNull();
    expect(readPrivacyConsent(memoryStorage({ [PRIVACY_CONSENT_KEY]: "{}" }))).toBeNull();
    expect(
      readPrivacyConsent(memoryStorage({ [PRIVACY_CONSENT_KEY]: '{"version":1,"acceptedAt":2}' })),
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
    expect(PRIVACY_CONSENT_KEY.startsWith("helena")).toBe(true);
  });
});
