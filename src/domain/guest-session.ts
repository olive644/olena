// Modo convidado: a pessoa usa o app sem conta Google. A marca fica somente neste
// aparelho (não entra nas chaves sincronizadas) e o nome exibido é sempre "Guest".
export const GUEST_SESSION_KEY = "helena.guest.v1";
export const GUEST_NAME = "Guest";
// O apelido vale somente na sala e fica só neste aparelho. O perfil continua como Guest.
export const GUEST_NICKNAME_KEY = "helena.guest-nickname.v1";
export const GUEST_NICKNAME_MAX = 24;

// Mesma regra do nome de exibição aceito pelo servidor da sala.
export function normalizeGuestNickname(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, GUEST_NICKNAME_MAX);
}

export function readGuestNickname(storage: Storage = window.localStorage): string {
  try {
    return normalizeGuestNickname(storage.getItem(GUEST_NICKNAME_KEY) ?? "") || GUEST_NAME;
  } catch {
    return GUEST_NAME;
  }
}

export function writeGuestNickname(value: string, storage: Storage = window.localStorage): void {
  try {
    const nickname = normalizeGuestNickname(value);
    if (nickname && nickname !== GUEST_NAME) storage.setItem(GUEST_NICKNAME_KEY, nickname);
    else storage.removeItem(GUEST_NICKNAME_KEY);
  } catch {
    /* Sem armazenamento o apelido vale só até recarregar. */
  }
}

export function isGuestSession(storage: Storage = window.localStorage): boolean {
  try {
    return storage.getItem(GUEST_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function startGuestSession(storage: Storage = window.localStorage): void {
  try {
    storage.setItem(GUEST_SESSION_KEY, "1");
  } catch {
    /* Sem armazenamento a pessoa entra mesmo assim, mas volta ao login ao recarregar. */
  }
}

export function endGuestSession(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(GUEST_SESSION_KEY);
    storage.removeItem(GUEST_NICKNAME_KEY);
  } catch {
    /* Nada a limpar quando o armazenamento não está disponível. */
  }
}

// Com a nuvem ativa, quem não está logado volta ao login, exceto o convidado.
export function requiresLogin(
  cloudEnabled: boolean,
  authenticated: boolean | undefined,
  guest: boolean,
): boolean {
  return cloudEnabled && authenticated === false && !guest;
}
