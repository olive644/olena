import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
} from "ts-fsrs";
import type { Flashcard, FlashcardRating } from "./workspace";

// Agendamento FSRS (biblioteca ts-fsrs, licença MIT). Sem fuzz e sem passos curtos: o app agenda
// por dia, e o mesmo cartão respondido do mesmo jeito sempre cai na mesma data em todos os aparelhos.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false }));
const GRADES = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const;
const DAY = 86_400_000;

function atNoon(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00Z`);
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
/** Facilidade antiga (1,3 a 3,5) vira dificuldade FSRS (10 a 1), para cartões já estudados. */
const difficultyFromEase = (ease: number) => clamp(10 - ((ease - 1.3) / 2.2) * 9, 1, 10);
/** E o contrário, mantendo o campo antigo preenchido para quem ainda lê. */
const easeFromDifficulty = (difficulty: number) =>
  clamp(3.5 - ((difficulty - 1) / 9) * 2.2, 1.3, 3.5);

/** Reconstrói o cartão FSRS a partir dos campos salvos, inclusive de cartões de antes do FSRS. */
function toFsrsCard(card: Flashcard, reviewedOn: string): FsrsCard {
  const studied = Boolean(card.reviews || card.intervalDays > 0 || card.firstReviewedOn);
  if (!studied) return createEmptyCard(atNoon(reviewedOn));
  const scheduled = Math.max(1, card.intervalDays);
  const due = atNoon(card.nextReview);
  const last = card.lastReviewedOn
    ? atNoon(card.lastReviewedOn)
    : new Date(due.getTime() - scheduled * DAY);
  return {
    due,
    stability: card.stability ?? scheduled,
    difficulty: card.difficulty ?? difficultyFromEase(card.ease ?? 2.5),
    elapsed_days: Math.max(0, Math.round((atNoon(reviewedOn).getTime() - last.getTime()) / DAY)),
    scheduled_days: scheduled,
    learning_steps: 0,
    reps: card.reviews ?? card.repetitions ?? 1,
    lapses: card.lapses ?? 0,
    state: State.Review,
    last_review: last,
  };
}

/** Próximo estado de um cartão depois de uma resposta, dado o dia em que foi respondido. */
export function reviewSchedule(card: Flashcard, rating: FlashcardRating, reviewedOn: string) {
  const { card: next } = scheduler.next(
    toFsrsCard(card, reviewedOn),
    atNoon(reviewedOn),
    GRADES[rating],
  );
  return {
    ease: easeFromDifficulty(next.difficulty),
    stability: next.stability,
    difficulty: next.difficulty,
    repetitions: rating === "again" ? 0 : (card.repetitions ?? (card.intervalDays > 0 ? 1 : 0)) + 1,
    // Errou: volta amanhã. O resto segue o intervalo do FSRS.
    intervalDays: rating === "again" ? 1 : clamp(Math.round(next.scheduled_days), 1, 36500),
    reviews: (card.reviews ?? 0) + 1,
    correct: (card.correct ?? 0) + (rating === "again" ? 0 : 1),
    lapses: (card.lapses ?? 0) + (rating === "again" ? 1 : 0),
  };
}

export function reviewQueue(
  cards: readonly Flashcard[],
  today: string,
  newLimit = 20,
  started = cards.filter((card) => card.firstReviewedOn === today).length,
) {
  let remaining = Math.max(0, newLimit - started);
  return cards
    .filter((card) => {
      if (card.nextReview > today) return false;
      if (card.reviews || card.intervalDays > 0 || card.firstReviewedOn) return true;
      return remaining-- > 0;
    })
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

export function validFlashcardStudy(value: Record<string, unknown>) {
  return (
    ["deck", "noteId", "firstReviewedOn", "lastReviewedOn"].every(
      (key) =>
        value[key] === undefined || (typeof value[key] === "string" && value[key].length <= 160),
    ) &&
    ["reviews", "correct", "lapses", "repetitions"].every(
      (key) =>
        value[key] === undefined || (Number.isSafeInteger(value[key]) && Number(value[key]) >= 0),
    ) &&
    (value["ease"] === undefined ||
      (typeof value["ease"] === "number" && value["ease"] >= 1.3 && value["ease"] <= 3.5)) &&
    (value["stability"] === undefined ||
      (typeof value["stability"] === "number" &&
        Number.isFinite(value["stability"]) &&
        value["stability"] >= 0 &&
        value["stability"] <= 100000)) &&
    (value["difficulty"] === undefined ||
      (typeof value["difficulty"] === "number" &&
        value["difficulty"] >= 1 &&
        value["difficulty"] <= 10))
  );
}

/** Quoted TSV preserves tabs, quotes and multiline fields without interpreting HTML. */
export function flashcardsTsv(cards: readonly Flashcard[]) {
  const field = (text: string) =>
    /[\t\r\n"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  return (
    "#separator:Tab\n#html:false\n" +
    cards.map((card) => [card.front, card.back, card.deck ?? ""].map(field).join("\t")).join("\n")
  );
}

export function parseFlashcardsTsv(text: string): { front: string; back: string; deck: string }[] {
  if (text.length > 1_000_000 || new TextEncoder().encode(text).byteLength > 1_000_000)
    throw new Error("TSV_LIMIT");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  const input = text.replace(/^\uFEFF/, "").replace(/^#(?:separator:Tab|html:false)\r?\n/gm, "");
  for (let i = 0; i <= input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || !cell) quoted = !quoted;
      else throw new Error("TSV_FORMAT");
    } else if ((char === "\t" || char === "\n" || char === undefined) && !quoted) {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (char !== "\t") {
        if (row.some((part) => part.trim())) rows.push(row);
        row = [];
      }
    } else if (char !== undefined) cell += char;
  }
  if (
    quoted ||
    rows.length > 500 ||
    rows.some(
      (parts) =>
        parts.length < 2 ||
        parts.length > 3 ||
        !parts[0]?.trim() ||
        !parts[1]?.trim() ||
        parts.some((part, i) => part.length > (i === 2 ? 160 : 10000)),
    )
  )
    throw new Error("TSV_FORMAT");
  return rows.map(([front, back, deck]) => ({
    front: front!.trim(),
    back: back!.trim(),
    deck: deck?.trim() ?? "",
  }));
}
