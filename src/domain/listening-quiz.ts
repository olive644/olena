import type { Flashcard } from "./workspace.js";

export type PedagogicalDifficulty = "easy" | "medium" | "hard";

export type ListeningCard = Pick<Flashcard, "id" | "front" | "back"> & {
  acceptedAnswers?: readonly string[];
  difficulty?: PedagogicalDifficulty;
  category?: string;
  audioId?: string;
};

export const STARTER_DECK: readonly ListeningCard[] = [
  { id: "starter-school", front: "school", back: "escola", difficulty: "easy" },
  { id: "starter-friend", front: "friend", back: "amigo", difficulty: "easy" },
  { id: "starter-book", front: "book", back: "livro", difficulty: "easy" },
  { id: "starter-world", front: "world", back: "mundo", difficulty: "easy" },
  { id: "starter-hello", front: "hello", back: "olá", difficulty: "easy" },
];

export type ManualListeningLine = {
  lineNumber: number;
  raw: string;
  card?: ListeningCard;
  error?: string;
};

export type ManualListeningParseResult = {
  cards: ListeningCard[];
  lines: ManualListeningLine[];
};

const MANUAL_SEPARATOR = /\t|=|;|,|\s+-\s+/;

export function parseManualListeningInput(
  value: string,
  separatorPattern = MANUAL_SEPARATOR,
): ManualListeningParseResult {
  const seen = new Map<string, number>();
  const lines = value.split(/\r?\n/).flatMap((raw, index): ManualListeningLine[] => {
    if (!raw.trim()) return [];
    const lineNumber = index + 1;
    const separator = raw.match(separatorPattern);
    if (!separator || separator.index === undefined) {
      return [{ lineNumber, raw, error: "falta a tradução" }];
    }
    const front = raw.slice(0, separator.index).trim();
    const answerVariants = raw
      .slice(separator.index + separator[0].length)
      .split("|")
      .map((answer) => answer.trim());
    const back = answerVariants[0] ?? "";
    const acceptedAnswers = answerVariants.slice(1);
    if (!front) return [{ lineNumber, raw, error: "falta a palavra em inglês" }];
    if (!back) return [{ lineNumber, raw, error: "falta a tradução" }];
    if (acceptedAnswers.some((answer) => !answer)) {
      return [{ lineNumber, raw, error: "remova alternativas vazias" }];
    }
    if ([front, back, ...acceptedAnswers].some((answer) => answer.length > 200)) {
      return [{ lineNumber, raw, error: "use até 200 caracteres em cada campo" }];
    }
    const normalized = normalizeListeningAnswer(front);
    const firstLine = seen.get(normalized);
    if (firstLine !== undefined) {
      return [{ lineNumber, raw, error: `“${front}” já foi usada na linha ${firstLine}` }];
    }
    if (seen.size >= 30) return [{ lineNumber, raw, error: "o limite é de 30 palavras" }];
    seen.set(normalized, lineNumber);
    return [
      {
        lineNumber,
        raw,
        card: {
          id: `manual-${seen.size}`,
          front,
          back,
          ...(acceptedAnswers.length ? { acceptedAnswers } : {}),
          difficulty: "medium",
        },
      },
    ];
  });
  return { cards: lines.flatMap((line) => (line.card ? [line.card] : [])), lines };
}

export function parseManualListeningCards(value: string): ListeningCard[] {
  const parsed = parseManualListeningInput(value);
  return parsed.lines.some((line) => line.error) ? [] : parsed.cards;
}

export function normalizeListeningAnswer(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");
}

export function buildListeningDeck(flashcards: readonly Flashcard[]): ListeningCard[] {
  const personal = flashcards
    .filter((card) => card.front.trim() && card.back.trim())
    .slice(0, 10)
    .map(({ id, front, back }) => ({ id, front, back }));
  const seen = new Set(personal.map((card) => normalizeListeningAnswer(card.front)));
  const starter = STARTER_DECK.filter((card) => !seen.has(normalizeListeningAnswer(card.front)));
  return [...personal, ...starter];
}

export function shuffleListeningDeck(
  cards: readonly ListeningCard[],
  random: () => number = Math.random,
): ListeningCard[] {
  const shuffled = cards.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const destination = shuffled[target];
    if (!current || !destination) continue;
    shuffled[index] = destination;
    shuffled[target] = current;
  }
  return shuffled;
}

export function createListeningRound(
  cards: readonly ListeningCard[],
  limit: number | "all",
  random: () => number = Math.random,
): ListeningCard[] {
  const shuffled = shuffleListeningDeck(cards, random);
  return limit === "all" ? shuffled : shuffled.slice(0, Math.max(0, limit));
}

function differsByOneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length >= right.length) leftIndex += 1;
    if (right.length >= left.length) rightIndex += 1;
  }
  return edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1;
}

export function isListeningAnswerCorrect(
  card: ListeningCard,
  answer: string,
  acceptMinorTypo = false,
): boolean {
  const normalized = normalizeListeningAnswer(answer);
  const accepted = acceptedListeningAnswers(card);
  if (!normalized) return false;
  if (accepted.includes(normalized)) return true;
  return (
    acceptMinorTypo &&
    normalized.length >= 4 &&
    accepted.some((candidate) => candidate.length >= 4 && differsByOneEdit(normalized, candidate))
  );
}

export function acceptedListeningAnswers(card: ListeningCard): string[] {
  return [card.front, card.back, ...(card.acceptedAnswers ?? [])].map(normalizeListeningAnswer);
}
