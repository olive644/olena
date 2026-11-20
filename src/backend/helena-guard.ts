import { createHash } from "node:crypto";
import type { KvStore } from "./kv-store.js";

// Proteções da Olena que não são limite de uso: texto de entrada limpo, pedido repetido e um
// pedido por vez por pessoa.

const hash = (text: string) => createHash("sha256").update(text).digest("hex");

/**
 * Limpa o texto das fontes antes de chegar ao modelo e à conta de tokens: tira caracteres de
 * controle e de direção de texto (usados para esconder instruções e embaralhar a leitura), troca
 * sequências enormes do mesmo caractere (que gastam tokens sem dizer nada) e espaços repetidos.
 */
export function sanitizeSourceText(text: string): string {
  return (
    text
      .normalize("NFC")
      // eslint-disable-next-line no-control-regex -- remover caracteres de controle é o objetivo
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "")
      .replace(/(.)\1{19,}/gsu, (run) => [...run].slice(0, 20).join(""))
      .replace(/[ \t]{3,}/g, "  ")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim()
  );
}

/** O texto parece texto? Binário ou lixo de PDF (quase só símbolos) não vale a cota. */
export function looksLikeText(text: string): boolean {
  const chars = [...text.replace(/\s+/g, "")];
  if (chars.length < 20) return true;
  const letters = chars.filter((char) => /[\p{L}\p{N}.,;:!?()%/-]/u.test(char)).length;
  return letters / chars.length >= 0.6;
}

const SEEN_SECONDS = 900;

/**
 * Registra um pedido (chave de idempotência ou impressão do corpo). Devolve `false` se a mesma
 * chave desta pessoa já foi vista há menos de 15 minutos: repetir um pedido capturado não gasta a
 * cota duas vezes.
 */
export async function claimRequest(store: KvStore, uid: string, key: string): Promise<boolean> {
  const storeKey = `helena-seen/${hash(uid)}/${hash(key)}`;
  const entry = await store.readVersion!(storeKey);
  if (entry.value) return false;
  return store.compareAndSet!(storeKey, "1", SEEN_SECONDS, entry.version);
}

const LOCK_SECONDS = 75;

/** Tenta ser o único pedido em andamento desta pessoa. Devolve como soltar, ou `undefined`. */
export async function acquireLock(
  store: KvStore,
  uid: string,
  now = Date.now(),
): Promise<(() => Promise<void>) | undefined> {
  const key = `helena-lock/${hash(uid)}`;
  const entry = await store.readVersion!(key);
  const until = entry.value ? Number(entry.value) : 0;
  if (until > now) return undefined;
  if (
    !(await store.compareAndSet!(
      key,
      String(now + LOCK_SECONDS * 1000),
      LOCK_SECONDS,
      entry.version,
    ))
  )
    return undefined;
  return async () => {
    await store.del(key).catch(() => {});
  };
}
