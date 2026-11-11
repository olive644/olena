import { ACCOUNT_OWNER_KEY } from "./personal-data";

// Última foto do que o Perfil mostra e vem da conta pela rede: o @ e os contadores de seguidores. Ela
// é só um cache deste aparelho, para o Perfil abrir já com os números em vez de esperar o Firebase e
// a API. Quem manda é sempre a resposta do servidor, que sobrescreve esta foto assim que chega. O
// prefixo "helena" faz o apagamento dos dados pessoais (sair da conta, trocar de conta) levá-la junto,
// e ela só vale para a conta dona do aparelho. O selo verificado nunca entra aqui: só se exibe com
// confirmação do servidor.
const KEY = "helena.profileSnapshot.v1";

export type ProfileSnapshot = {
  uid: string;
  username?: string;
  followers?: number;
  following?: number;
};

function count(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value < 1e9
    ? value
    : undefined;
}

function read(): ProfileSnapshot | undefined {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return undefined;
    const record = raw as Record<string, unknown>;
    const uid = record["uid"];
    if (typeof uid !== "string" || !uid) return undefined;
    const username = record["username"];
    const followers = count(record["followers"]);
    const following = count(record["following"]);
    return {
      uid,
      ...(typeof username === "string" && /^[a-z0-9._]{1,30}$/.test(username) ? { username } : {}),
      ...(followers !== undefined ? { followers } : {}),
      ...(following !== undefined ? { following } : {}),
    };
  } catch {
    return undefined;
  }
}

/** A foto guardada, só se pertencer à conta dona deste aparelho (ou à conta informada). */
export function readProfileSnapshot(uid?: string): ProfileSnapshot | undefined {
  const snapshot = read();
  if (!snapshot) return undefined;
  try {
    const owner = uid ?? window.localStorage.getItem(ACCOUNT_OWNER_KEY);
    return owner && snapshot.uid === owner ? snapshot : undefined;
  } catch {
    return undefined;
  }
}

/** Junta os campos novos à foto da mesma conta; outra conta começa uma foto nova. */
export function writeProfileSnapshot(uid: string, patch: Omit<ProfileSnapshot, "uid">) {
  if (!uid) return;
  try {
    const current = read();
    const base = current?.uid === uid ? current : { uid };
    window.localStorage.setItem(KEY, JSON.stringify({ ...base, ...patch, uid }));
  } catch {
    /* Sem armazenamento, o Perfil só espera a rede, como antes. */
  }
}
