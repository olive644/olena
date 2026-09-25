// Escolha da pessoa sobre os recursos online dos exercícios de escuta: a voz natural
// (o texto da frase vai a uma empresa parceira de voz) e a consulta de vocabulário
// (cada palavra em inglês vai a um serviço de consulta). Sem aceite, o aplicativo usa
// a voz do aparelho e uma estimativa própria de dificuldade, sem enviar nada.
export const LISTENING_ONLINE_ITEM = "helena.listening.online.v1";

// Sobe só quando muda o que é enviado, para pedir a escolha de novo.
export const LISTENING_CONSENT_VERSION = 1;

export type ListeningOnlineChoice = "accepted" | "declined";

type Stored = { choice: ListeningOnlineChoice; version: number; at: string };

export function readListeningOnlineChoice(
  storage: Pick<Storage, "getItem">,
): ListeningOnlineChoice | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(LISTENING_ONLINE_ITEM) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const { choice, version } = parsed as Partial<Stored>;
    if (version !== LISTENING_CONSENT_VERSION) return null;
    return choice === "accepted" || choice === "declined" ? choice : null;
  } catch {
    return null;
  }
}

export function writeListeningOnlineChoice(
  storage: Pick<Storage, "setItem">,
  choice: ListeningOnlineChoice,
  now: Date = new Date(),
): void {
  const value: Stored = { choice, version: LISTENING_CONSENT_VERSION, at: now.toISOString() };
  try {
    storage.setItem(LISTENING_ONLINE_ITEM, JSON.stringify(value));
  } catch {
    /* Sem armazenamento, a escolha vale só nesta tela. */
  }
}
