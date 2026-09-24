import { SYNCED_STORAGE_APPLIED_EVENT } from "./synced-storage";

// Guarda de quem são os dados deste aparelho, para detectar troca de conta.
export const ACCOUNT_OWNER_KEY = "helena.account.v1";

// Tudo o que o app guarda no navegador começa com um destes prefixos: espaço do
// aluno, histórico de versões, rascunhos do caderno, progresso, perfil e salas.
// "noteoli." é o prefixo da sequência do pomodoro, de um nome antigo do app.
const PERSONAL_KEY_PREFIXES = ["helena", "noteoli."];

function personalKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && PERSONAL_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
  }
  return keys;
}

// Apaga do navegador os dados pessoais do aluno. Em computador compartilhado, o
// histórico e os rascunhos de quem saiu não podem ficar visíveis para a próxima
// pessoa. `keep` preserva chaves específicas.
export function clearPersonalData(storage: Storage, keep: readonly string[] = []): void {
  for (const key of personalKeys(storage)) {
    if (keep.includes(key)) continue;
    try {
      storage.removeItem(key);
    } catch {
      /* Sem acesso ao armazenamento não há o que apagar. */
    }
  }
}

// Registra a conta dona dos dados deste aparelho. Se outra conta já era a dona,
// os dados dela são apagados antes de a nova conta sincronizar, senão o espaço
// da pessoa anterior seria enviado para a conta nova. Devolve true na troca.
// A marca de onboarding é preservada: o login a grava no mesmo instante em que
// a sessão começa, e apagá-la mandaria a pessoa de volta ao onboarding.
export function claimDeviceForAccount(storage: Storage, uid: string): boolean {
  try {
    const owner = storage.getItem(ACCOUNT_OWNER_KEY);
    const switched = owner !== null && owner !== uid;
    if (switched) {
      clearPersonalData(storage, ["helena.onboarding.v1"]);
      window.dispatchEvent(new Event(SYNCED_STORAGE_APPLIED_EVENT));
    }
    storage.setItem(ACCOUNT_OWNER_KEY, uid);
    return switched;
  } catch {
    return false;
  }
}
