// Versão e endereço da Política de Privacidade. A versão precisa ser igual à do
// atributo data-policy-version em public/politica-de-privacidade.html (um teste confere).
export const PRIVACY_POLICY_VERSION = "2026-11-03.1";
export const PRIVACY_POLICY_PATH = "/politica-de-privacidade.html";
export const PRIVACY_CONSENT_CHANGED = "olena:privacy-consent-changed";
export const PRIVACY_CONSENT_ITEM = "helena.privacy.v1";

export type PrivacyConsent = { version: string; acceptedAt: string };

// Guarda qual versão da política a pessoa aceitou ao entrar, e quando. Fica só neste
// aparelho. Uma cópia mínima por UID acompanha as preferências de acesso no logout;
// exclusão da conta remove ambas. Outra conta nunca herda essa cópia.
export function recordPrivacyConsent(
  storage: Pick<Storage, "setItem"> & Partial<Pick<Storage, "getItem">>,
  now: Date = new Date(),
): void {
  const consent: PrivacyConsent = {
    version: PRIVACY_POLICY_VERSION,
    acceptedAt: now.toISOString(),
  };
  try {
    storage.setItem(PRIVACY_CONSENT_ITEM, JSON.stringify(consent));
    const uid = storage.getItem?.("helena.account.v1");
    if (uid) preservePrivacyConsentForAccount(storage, uid, consent);
  } catch {
    /* Sem armazenamento, o login continua; o aceite vale para esta sessão. */
  }
}

export function readPrivacyConsent(storage: Pick<Storage, "getItem">): PrivacyConsent | null {
  try {
    let parsed: unknown = JSON.parse(storage.getItem(PRIVACY_CONSENT_ITEM) ?? "null");
    if (!parsed) {
      const uid = storage.getItem("helena.account.v1");
      const saved: unknown = JSON.parse(storage.getItem("helena.accountAccess.v1") ?? "null");
      if (
        uid &&
        saved &&
        typeof saved === "object" &&
        "uid" in saved &&
        saved.uid === uid &&
        "privacyConsent" in saved
      )
        parsed = saved.privacyConsent;
    }
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

// Preserva somente um aceite já registrado, sem trocar sua versão ou sua data.
export function preservePrivacyConsentForAccount(
  storage: Pick<Storage, "setItem"> & Partial<Pick<Storage, "getItem">>,
  uid: string,
  consent: PrivacyConsent,
): void {
  try {
    let raw: unknown = null;
    try {
      raw = JSON.parse(storage.getItem?.("helena.accountAccess.v1") ?? "null");
    } catch {
      /* Cache ilegível não invalida uma nova confirmação explícita. */
    }
    const previous = raw && typeof raw === "object" && "uid" in raw && raw.uid === uid ? raw : {};
    storage.setItem(
      "helena.accountAccess.v1",
      JSON.stringify({ ...previous, uid, privacyConsent: consent }),
    );
  } catch {
    /* Sem cache, não inventar persistência entre sessões. */
  }
}
