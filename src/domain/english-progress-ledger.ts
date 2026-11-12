import { ENGLISH_AREAS, type EnglishArea } from "./english-areas.js";
import { ENGLISH_PART_COUNT } from "./english-part-order.js";

/**
 * Livro do progresso de Inglês, guardado em chave própria e sincronizada, como o da Matemática.
 * Ele só cresce: questões resolvidas e partes confirmadas nunca saem daqui. As atividades de prática
 * continuam existindo, mas o avanço nas ilhas não depende mais delas para sobreviver.
 */
export const ENGLISH_PROGRESS_KEY = "helena.englishProgress.v1";
const MAX_QUESTION_ID = 1000;

type EnglishLedgerPart = { solved: number[]; confirmed: boolean };
export type EnglishLedger = Partial<Record<EnglishArea, EnglishLedgerPart[]>>;

const emptyPart = (): EnglishLedgerPart => ({ solved: [], confirmed: false });

function validPart(value: unknown): EnglishLedgerPart {
  if (!value || typeof value !== "object") return emptyPart();
  const item = value as { solved?: unknown; confirmed?: unknown };
  const solved = Array.isArray(item.solved)
    ? item.solved.filter(
        (id): id is number => Number.isInteger(id) && id >= 0 && id < MAX_QUESTION_ID,
      )
    : [];
  return { solved: [...new Set(solved)].sort((a, b) => a - b), confirmed: item.confirmed === true };
}

/** Lê o valor guardado; qualquer coisa fora do formato vira livro vazio, nunca erro. */
export function parseEnglishLedger(raw: string | null | undefined): EnglishLedger {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const ledger: EnglishLedger = {};
    for (const area of ENGLISH_AREAS) {
      const parts = (value as Record<string, unknown>)[area];
      if (!Array.isArray(parts)) continue;
      ledger[area] = Array.from({ length: ENGLISH_PART_COUNT }, (_, index) =>
        validPart(parts[index]),
      );
    }
    return ledger;
  } catch {
    return {};
  }
}

/** União de dois livros: o resolvido em qualquer aparelho continua resolvido no resultado. */
export function mergeEnglishLedgers(left: EnglishLedger, right: EnglishLedger): EnglishLedger {
  const merged: EnglishLedger = {};
  for (const area of ENGLISH_AREAS) {
    const a = left[area],
      b = right[area];
    if (!a && !b) continue;
    merged[area] = Array.from({ length: ENGLISH_PART_COUNT }, (_, index) => {
      const x = a?.[index] ?? emptyPart(),
        y = b?.[index] ?? emptyPart();
      return {
        solved: [...new Set([...x.solved, ...y.solved])].sort((p, q) => p - q),
        confirmed: x.confirmed || y.confirmed,
      };
    });
  }
  return merged;
}

export function serializeEnglishLedger(ledger: EnglishLedger): string {
  return JSON.stringify(mergeEnglishLedgers(ledger, {}));
}

/** Livro construído a partir do resultado do cálculo; só entram partes com algum avanço. */
export function ledgerFromAreas(
  areas: readonly (readonly { solved: ReadonlySet<number>; confirmed: boolean }[])[],
): EnglishLedger {
  const ledger: EnglishLedger = {};
  ENGLISH_AREAS.forEach((area, areaIndex) => {
    const parts = areas[areaIndex];
    if (!parts?.some((part) => part.solved.size > 0 || part.confirmed)) return;
    ledger[area] = parts.map((part) => ({
      solved: [...part.solved].sort((a, b) => a - b),
      confirmed: part.confirmed,
    }));
  });
  return ledger;
}
