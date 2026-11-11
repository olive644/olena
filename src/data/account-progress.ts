// Sinais de que esta conta já estudou de verdade, lidos do armazenamento sincronizado. Servem para
// não mandar de volta ao onboarding uma conta com progresso quando a marca "onboarding concluído"
// não está no aparelho nem chegou da nuvem (ela é só mais uma chave sincronizada e pode faltar).
const PROGRESS_KEYS = [
  "helena.mathPlaceRewards.v1",
  "helena.englishRewards.v1",
  "helena.mathGame.v5",
  "helena.englishProgress.v1",
] as const;

const COUNTERS = new Set(["points", "correct"]);
const LISTS = new Set(["receipts", "solved"]);

function hasProgressSign(value: unknown, depth = 0): boolean {
  if (depth > 6 || value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasProgressSign(item, depth + 1));
  for (const [key, child] of Object.entries(value)) {
    if (COUNTERS.has(key) && typeof child === "number" && child > 0) return true;
    if (LISTS.has(key) && Array.isArray(child) && child.length > 0) return true;
    if (hasProgressSign(child, depth + 1)) return true;
  }
  return false;
}

/** Verdadeiro quando alguma chave de progresso guarda pontos, acertos ou itens concluídos. */
export function accountHasProgress(storage: Pick<Storage, "getItem">): boolean {
  for (const key of PROGRESS_KEYS) {
    try {
      const raw = storage.getItem(key);
      if (raw && hasProgressSign(JSON.parse(raw) as unknown)) return true;
    } catch {
      /* Valor ilegível não conta como progresso. */
    }
  }
  return false;
}
