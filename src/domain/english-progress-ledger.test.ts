import { expect, it } from "vitest";
import {
  ENGLISH_PROGRESS_KEY,
  ledgerFromAreas,
  mergeEnglishLedgers,
  parseEnglishLedger,
  serializeEnglishLedger,
  type EnglishLedger,
} from "./english-progress-ledger";
import { englishProgress } from "./language-progress";
import { ENGLISH_PART_ORDER } from "./english-part-order";
import type { PracticeActivity } from "./workspace";

const part = (solved: number[], confirmed = false) => ({ solved, confirmed });
const full = (parts: Record<number, ReturnType<typeof part>>) =>
  Array.from({ length: ENGLISH_PART_ORDER.length }, (_, index) => parts[index] ?? part([]));
const hundred = Array.from({ length: 100 }, (_, index) => index);

function practice(partIndex: number, question: number, id: string): PracticeActivity {
  return {
    id,
    islandId: "english",
    islandName: "Inglês",
    completedAt: new Date(Date.UTC(2026, 10, 6, 12, 0, question)).toISOString(),
    answers: 1,
    correct: 1,
    englishAttempt: {
      curriculum: 4,
      area: "english",
      part: partIndex,
      mode: "practice",
      questions: [question],
      correctQuestions: [question],
    },
  };
}

it("o chave do livro é a que as regras do Firebase conhecem", () => {
  expect(ENGLISH_PROGRESS_KEY).toBe("helena.englishProgress.v1");
});

it("lê o livro guardado e trata qualquer valor inválido como livro vazio, sem erro", () => {
  expect(parseEnglishLedger(null)).toEqual({});
  expect(parseEnglishLedger("{")).toEqual({});
  expect(parseEnglishLedger("[]")).toEqual({});
  expect(parseEnglishLedger('{"english":"segredo"}')).toEqual({});
  const read = parseEnglishLedger(
    JSON.stringify({
      english: [{ solved: [3, 1, 3, -1, 1.5, 5000, "x"], confirmed: "sim" }, null],
      outraArea: [part([1])],
    }),
  );
  expect(Object.keys(read)).toEqual(["english"]);
  expect(read.english).toHaveLength(ENGLISH_PART_ORDER.length);
  expect(read.english![0]).toEqual({ solved: [1, 3], confirmed: false });
  expect(read.english![1]).toEqual({ solved: [], confirmed: false });
});

it("a união mantém o que foi resolvido ou confirmado em qualquer um dos lados", () => {
  const a: EnglishLedger = { english: full({ 0: part([1, 2]), 1: part([5]) }) };
  const b: EnglishLedger = { english: full({ 0: part([2, 3], true) }) };
  const merged = mergeEnglishLedgers(a, b).english!;
  expect(merged[0]).toEqual({ solved: [1, 2, 3], confirmed: true });
  expect(merged[1]).toEqual({ solved: [5], confirmed: false });
  expect(mergeEnglishLedgers(a, {}).english).toEqual(a.english);
  expect(serializeEnglishLedger(mergeEnglishLedgers(a, b))).toBe(
    serializeEnglishLedger(mergeEnglishLedgers(b, a)),
  );
});

it("o livro só guarda partes com avanço e é construído a partir do cálculo", () => {
  const progress = englishProgress([practice(0, 4, "english:arcade:r:1")]);
  const ledger = ledgerFromAreas(progress.areas);
  expect(ledger.english![0]).toEqual({ solved: [4], confirmed: false });
  expect(ledgerFromAreas(englishProgress([]).areas)).toEqual({});
});

it("o progresso continua depois que as atividades somem, porque parte do livro guardado", () => {
  const before = englishProgress([practice(0, 7, "english:arcade:r:1")]);
  const ledger = ledgerFromAreas(before.areas);
  const after = englishProgress([], "english", ledger);
  expect(after.parts[0]!.solved.has(7)).toBe(true);
  expect(after.percent).toBe(before.percent);
  expect(englishProgress([]).percent).toBe(0);
});

it("uma parte confirmada no livro libera a seguinte mesmo sem as atividades que a confirmaram", () => {
  const second = ENGLISH_PART_ORDER[1]!;
  const activity = practice(second, 9, "english:arcade:r:2");
  expect(englishProgress([activity]).accepted).toHaveLength(0);
  const ledger: EnglishLedger = {
    english: full({ [ENGLISH_PART_ORDER[0]!]: part(hundred, true) }),
  };
  const progress = englishProgress([activity], "english", ledger);
  expect(progress.accepted).toHaveLength(1);
  expect(progress.parts[ENGLISH_PART_ORDER[0]!]!.confirmed).toBe(true);
  expect(progress.parts[second]!.solved.has(9)).toBe(true);
});

it("a mesma atividade contada pelo livro e pela lista não é contada duas vezes", () => {
  const activity = practice(0, 4, "english:arcade:r:1");
  const ledger = ledgerFromAreas(englishProgress([activity]).areas);
  const progress = englishProgress([activity], "english", ledger);
  expect(progress.parts[0]!.solved.size).toBe(1);
  expect(progress.percent).toBe(englishProgress([activity]).percent);
});
