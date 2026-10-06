import type { ListeningCard } from "./listening-quiz.js";

export const BINGO_MODES = ["line", "column", "diagonal", "corners", "full"] as const;
export type BingoMode = (typeof BINGO_MODES)[number];
export const BINGO_FREE = "bingo-free";
export const BINGO_MODE_LABELS: Record<BingoMode, string> = {
  line: "Linha",
  column: "Coluna",
  diagonal: "Diagonal",
  corners: "Quatro cantos",
  full: "Cartela cheia",
};
export const BINGO_MODE_RULES: Record<BingoMode, string> = {
  line: "Complete uma linha horizontal.",
  column: "Complete uma coluna vertical.",
  diagonal: "Complete uma das duas diagonais.",
  corners: "Marque os quatro cantos da cartela.",
  full: "Marque todos os números da cartela.",
};
export const NUMBER_BINGO_DECK: readonly ListeningCard[] = Array.from({ length: 75 }, (_, i) => ({
  id: String(i + 1),
  front: String(i + 1),
  back: String(i + 1),
}));

export function createNumberBingoCard(random: () => number = Math.random): string[] {
  const card = Array<string>(25).fill(BINGO_FREE);
  for (let column = 0; column < 5; column++) {
    const pool = Array.from({ length: 15 }, (_, i) => String(column * 15 + i + 1));
    const selected = Array.from(
      { length: 5 },
      () => pool.splice(Math.floor(random() * pool.length), 1)[0]!,
    );
    selected.sort((a, b) => Number(a) - Number(b));
    selected.forEach((id, row) => {
      card[row * 5 + column] = id;
    });
  }
  card[12] = BINGO_FREE;
  return card;
}

export function bingoPatterns(mode: BingoMode): number[][] {
  switch (mode) {
    case "line":
      return Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 5 }, (_, column) => row * 5 + column),
      );
    case "column":
      return Array.from({ length: 5 }, (_, column) =>
        Array.from({ length: 5 }, (_, row) => row * 5 + column),
      );
    case "diagonal":
      return [
        [0, 6, 12, 18, 24],
        [4, 8, 12, 16, 20],
      ];
    case "corners":
      return [[0, 4, 20, 24]];
    case "full":
      return [Array.from({ length: 25 }, (_, i) => i)];
  }
}

export function hasNumberBingo(
  card: readonly string[],
  marks: readonly string[],
  drawn: readonly string[],
  mode: BingoMode,
): boolean {
  if (card.length !== 25 || card[12] !== BINGO_FREE) return false;
  return bingoPatterns(mode).some((pattern) =>
    pattern.every((index) => {
      const id = card[index]!;
      return index === 12 || (marks.includes(id) && drawn.includes(id));
    }),
  );
}
