const ITEM = "helena.accountAccess.v1";
export type AccessPreferences = { uid: string; consent: boolean; resetSentAt: number };
export function readAccessPreferences(
  storage: Pick<Storage, "getItem">,
  uid: string,
): AccessPreferences {
  const empty = { uid, consent: false, resetSentAt: 0 };
  try {
    const value: unknown = JSON.parse(storage.getItem(ITEM) ?? "null");
    if (!value || typeof value !== "object" || !("uid" in value) || value.uid !== uid) return empty;
    return {
      uid,
      consent: "consent" in value && value.consent === true,
      resetSentAt:
        "resetSentAt" in value &&
        typeof value.resetSentAt === "number" &&
        Number.isFinite(value.resetSentAt)
          ? value.resetSentAt
          : 0,
    };
  } catch {
    return empty;
  }
}
export function writeAccessPreferences(
  storage: Storage,
  uid: string,
  change: Partial<Pick<AccessPreferences, "consent" | "resetSentAt">>,
) {
  try {
    let raw: unknown = null;
    try {
      raw = JSON.parse(storage.getItem(ITEM) ?? "null");
    } catch {
      /* Um cache ilegível não impede registrar uma nova escolha explícita. */
    }
    const privacy =
      raw && typeof raw === "object" && "uid" in raw && raw.uid === uid && "privacyConsent" in raw
        ? { privacyConsent: raw.privacyConsent }
        : {};
    storage.setItem(
      ITEM,
      JSON.stringify({ ...readAccessPreferences(storage, uid), ...privacy, ...change }),
    );
  } catch {
    /* O consentimento desta tela ainda vale sem cache. */
  }
}
