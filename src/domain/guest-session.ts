// Modo convidado: a pessoa usa o app sem conta Google. A marca fica somente neste
// aparelho (não entra nas chaves sincronizadas) e o nome exibido é sempre "Guest".
export const GUEST_SESSION_KEY = "helena.guest.v1";
export const GUEST_NAME = "Guest";

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
