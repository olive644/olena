// Versão e endereço da Política de Privacidade. A versão precisa ser igual à do
// atributo data-policy-version em public/politica-de-privacidade.html (um teste confere).
export const PRIVACY_POLICY_VERSION = "2026-09-25";
export const PRIVACY_POLICY_PATH = "/politica-de-privacidade.html";
export const PRIVACY_CONSENT_ITEM = "helena.privacy.v1";

export type PrivacyConsent = { version: string; acceptedAt: string };

// Guarda qual versão da política a pessoa aceitou ao entrar, e quando. Fica só neste
// aparelho: é apagado junto com os demais dados pessoais ao sair da conta.
export function recordPrivacyConsent(
  storage: Pick<Storage, "setItem">,
  now: Date = new Date(),
): void {
  const consent: PrivacyConsent = {
    version: PRIVACY_POLICY_VERSION,
    acceptedAt: now.toISOString(),
  };
  try {
    storage.setItem(PRIVACY_CONSENT_ITEM, JSON.stringify(consent));
  } catch {
    /* Sem armazenamento, o login continua; o aceite vale para esta sessão. */
  }
}

export function readPrivacyConsent(storage: Pick<Storage, "getItem">): PrivacyConsent | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PRIVACY_CONSENT_ITEM) ?? "null");
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as PrivacyConsent).version === "string" &&
      typeof (parsed as PrivacyConsent).acceptedAt === "string"
    ) {
      return parsed as PrivacyConsent;
    }
  } catch {
    /* Valor ilegível: trata como se não houvesse aceite. */
  }
  return null;
}
