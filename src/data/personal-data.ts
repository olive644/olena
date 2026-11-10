import { preservePrivacyConsentForAccount, readPrivacyConsent } from "../domain/privacy-policy";
import { SYNCED_STORAGE_APPLIED_EVENT } from "./synced-storage";

// Guarda de quem são os dados deste aparelho, para detectar troca de conta.
export const ACCOUNT_OWNER_KEY = "helena.account.v1";

// Tudo o que o app guarda no navegador começa com um destes prefixos: espaço do
// aluno, histórico de versões, rascunhos do caderno, progresso, perfil e salas.
// "noteoli." é o prefixo da sequência do pomodoro, de um nome antigo do app.
const PERSONAL_KEY_PREFIXES = [
  "helena",
  "noteoli.",
  "olena.focus-session.",
  "agenda-local-reminders:",
];

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
  // Os PDFs da Biblioteca também são dados pessoais, não apenas metadados.
  if (
    typeof window !== "undefined" &&
    storage === window.localStorage &&
    typeof indexedDB !== "undefined"
  ) {
    try {
      indexedDB.deleteDatabase("olena-library-files");
    } catch {
      /* Um bloqueio do navegador não pode impedir a saída da conta. */
    }
  }
}

// Registra a conta dona dos dados deste aparelho. Se outra conta já era a dona,
// os dados dela são apagados antes de a nova conta sincronizar, senão o espaço
// da pessoa anterior seria enviado para a conta nova. Devolve true na troca.
// Preserva uma conclusão recém-gravada somente quando pertence à conta que entra.
export function claimDeviceForAccount(storage: Storage, uid: string): boolean {
  try {
    const owner = storage.getItem(ACCOUNT_OWNER_KEY);
    const switched = owner !== null && owner !== uid;
    if (switched) {
      let preserveOnboarding = false;
      try {
        preserveOnboarding =
          JSON.parse(storage.getItem("helena.onboarding.v1") ?? "null")?.configurationOwner === uid;
      } catch {
        /* Registro inválido é descartado na troca de conta. */
      }
      clearPersonalData(storage, preserveOnboarding ? ["helena.onboarding.v1"] : []);
      window.dispatchEvent(new Event(SYNCED_STORAGE_APPLIED_EVENT));
    }
    storage.setItem(ACCOUNT_OWNER_KEY, uid);
    if (!switched) {
      const consent = readPrivacyConsent(storage);
      if (consent) preservePrivacyConsentForAccount(storage, uid, consent);
    }
    return switched;
  } catch {
    return false;
  }
}
