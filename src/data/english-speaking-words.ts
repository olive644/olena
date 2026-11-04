import { spokenEnglish } from "./english-speaking";
export type SpokenWordState = "waiting" | "correct" | "retry";
export function speakingWords(expected: string, heard: string, final = false) {
  const words = expected.trim().split(/\s+/);
  const tokens = words.flatMap((word, index) =>
    spokenEnglish(word)
      .split(" ")
      .filter(Boolean)
      .map((text) => ({ text, index })),
  );
  const heardTokens = spokenEnglish(heard).split(" ").filter(Boolean).slice(0, 128);
  const matrix = Array.from({ length: tokens.length + 1 }, () =>
    Array<number>(heardTokens.length + 1).fill(0),
  );
  for (let i = 0; i <= tokens.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= heardTokens.length; j++) matrix[0]![j] = j;
  for (let i = 1; i <= tokens.length; i++)
    for (let j = 1; j <= heardTokens.length; j++)
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j - 1]! + (tokens[i - 1]!.text === heardTokens[j - 1] ? 0 : 1),
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
      );
  const states: SpokenWordState[] = tokens.map(() => (final ? "retry" : "waiting"));
  const extra = new Set<number>();
  let i = tokens.length,
    j = heardTokens.length;
  while (i || j) {
    if (
      i &&
      j &&
      matrix[i]![j] ===
        matrix[i - 1]![j - 1]! + (tokens[i - 1]!.text === heardTokens[j - 1] ? 0 : 1)
    ) {
      states[i - 1] = tokens[i - 1]!.text === heardTokens[j - 1] ? "correct" : "retry";
      i--;
      j--;
    } else if (i && matrix[i]![j] === matrix[i - 1]![j]! + 1) {
      states[i - 1] = !final && j === heardTokens.length ? "waiting" : "retry";
      i--;
    } else {
      extra.add(Math.max(0, i - 1));
      j--;
    }
  }
  for (const index of extra) if (states[index]) states[index] = "retry";
  return words.map((word, index) => {
    const own = tokens.flatMap((token, n) => (token.index === index ? [states[n]!] : []));
    return {
      word,
      state: own.includes("retry")
        ? "retry"
        : own.every((state) => state === "correct")
          ? "correct"
          : "waiting",
    } as { word: string; state: SpokenWordState };
  });
}
