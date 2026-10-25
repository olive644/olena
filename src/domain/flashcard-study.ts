import type { Flashcard, FlashcardRating } from "./workspace";

// Three-grade SM-2 adaptation: preserve the app's initial three-day success interval.
export function reviewSchedule(card: Flashcard, rating: FlashcardRating) {
  const ease = Math.max(
    1.3,
    Math.min(
      3.5,
      (card.ease ?? 2.5) + (rating === "easy" ? 0.1 : rating === "hard" ? -0.15 : -0.2),
    ),
  );
  const repetitions =
    rating === "again" ? 0 : (card.repetitions ?? (card.intervalDays > 0 ? 1 : 0)) + 1;
  const intervalDays =
    rating === "again"
      ? 1
      : rating === "hard"
        ? Math.max(1, Math.ceil(card.intervalDays * 1.2))
        : repetitions === 1
          ? 3
          : repetitions === 2
            ? Math.max(6, card.intervalDays)
            : Math.max(card.intervalDays, Math.round(card.intervalDays * ease));
  return {
    ease,
    repetitions,
    intervalDays: Math.min(36500, intervalDays),
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
      (typeof value["ease"] === "number" && value["ease"] >= 1.3 && value["ease"] <= 3.5))
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
