import { spokenEnglish } from "./english-speaking";
export type SpokenWordState = "waiting" | "correct" | "retry";

// O reconhecimento erra pouco, mas erra de forma previsível: uma letra a mais ou a menos
// (card/cards) ou um som parecido. Uma palavra de conteúdo pode divergir em uma única letra,
// no máximo uma vez por frase curta, sem nunca relaxar números, negações e palavras curtas
// (is/are, a/the, do/does...), que carregam a gramática treinada nos exercícios.
const PROTECTED = new Set([
  "cannot",
  "never",
  "nobody",
  "nothing",
  "nowhere",
  "neither",
  "without",
]);
function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length]!;
}
export function nearSpokenWord(expected: string, heard: string) {
  // O "a" átono (/ə/) é muito ouvido como "of" (two pounds a kilo / of kilo) e vice-versa.
  if ((expected === "a" && heard === "of") || (expected === "of" && heard === "a")) return true;
  if (expected === heard || expected.length < 4 || heard.length < 4) return false;
  if (PROTECTED.has(expected) || PROTECTED.has(heard) || /\d/.test(expected + heard)) return false;
  return expected[0] === heard[0] && editDistance(expected, heard) === 1;
}
/** Quantas palavras podem divergir por uma letra: uma em frases curtas, duas nas longas. */
export const nearWordAllowance = (words: number) => (words <= 6 ? 1 : 2);

// O Whisper costuma inventar um "Thank you." quando sobra silêncio, e anotações como
// [BLANK_AUDIO]. Isso não foi dito pela pessoa e não deve reprovar a frase certa.
const EDGE_FILLERS = [
  ["thank", "you", "very", "much"],
  ["thank", "you"],
  ["thanks"],
  ["bye"],
  ["you"],
];
const LEADING_FILLERS = new Set(["uh", "um", "hmm", "ah", "oh", "er"]);
function heardTokens(heard: string, expected: string) {
  const tokens = spokenEnglish(heard.replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*/g, " "))
    .split(" ")
    .filter(Boolean)
    .slice(0, 128);
  const wanted = spokenEnglish(expected).split(" ").filter(Boolean);
  while (tokens.length > 1 && LEADING_FILLERS.has(tokens[0]!) && !LEADING_FILLERS.has(wanted[0]!))
    tokens.shift();
  for (let again = true; again && tokens.length > 1;) {
    again = false;
    for (const filler of EDGE_FILLERS) {
      const tail = tokens.slice(-filler.length).join(" ");
      if (
        tokens.length > filler.length &&
        tail === filler.join(" ") &&
        wanted.slice(-filler.length).join(" ") !== tail
      ) {
        tokens.length -= filler.length;
        again = true;
        break;
      }
    }
  }
  return tokens;
}

const EXACT = 0;
const NEAR = 3;
const MISS = 10;
export function speakingWords(expected: string, heard: string, final = false) {
  const words = expected.trim().split(/\s+/);
  const tokens = words.flatMap((word, index) =>
    spokenEnglish(word)
      .split(" ")
      .filter(Boolean)
      .map((text) => ({ text, index })),
  );
  const heardList = heardTokens(heard, expected);
  const pair = (i: number, j: number) =>
    tokens[i - 1]!.text === heardList[j - 1]
      ? EXACT
      : nearSpokenWord(tokens[i - 1]!.text, heardList[j - 1]!)
        ? NEAR
        : MISS;
  const matrix = Array.from({ length: tokens.length + 1 }, () =>
    Array<number>(heardList.length + 1).fill(0),
  );
  for (let i = 0; i <= tokens.length; i++) matrix[i]![0] = i * MISS;
  for (let j = 0; j <= heardList.length; j++) matrix[0]![j] = j * MISS;
  for (let i = 1; i <= tokens.length; i++)
    for (let j = 1; j <= heardList.length; j++)
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j - 1]! + pair(i, j),
        matrix[i - 1]![j]! + MISS,
        matrix[i]![j - 1]! + MISS,
      );
  const states: SpokenWordState[] = tokens.map(() => (final ? "retry" : "waiting"));
  const extra = new Set<number>();
  const near: number[] = [];
  let i = tokens.length,
    j = heardList.length;
  while (i || j) {
    if (i && j && matrix[i]![j] === matrix[i - 1]![j - 1]! + pair(i, j)) {
      const cost = pair(i, j);
      states[i - 1] = cost === MISS ? "retry" : "correct";
      if (cost === NEAR) near.push(i - 1);
      i--;
      j--;
    } else if (i && matrix[i]![j] === matrix[i - 1]![j]! + MISS) {
      states[i - 1] = !final && j === heardList.length ? "waiting" : "retry";
      i--;
    } else {
      extra.add(Math.max(0, i - 1));
      j--;
    }
  }
  // Mais divergências de uma letra do que o permitido: nenhuma delas vale.
  if (near.length > nearWordAllowance(tokens.length)) for (const n of near) states[n] = "retry";
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
/** A frase final vale quando cada palavra pedida foi reconhecida e nada sobrou. */
export const speechAccepted = (expected: string, heard: string) =>
  speakingWords(expected, heard, true).every(({ state }) => state === "correct");
