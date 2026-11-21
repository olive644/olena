export type EssaySpellingIssue = {
  start: number;
  end: number;
  word: string;
  suggestions: string[];
};
export type EssaySpellingResult = {
  issues: EssaySpellingIssue[];
  limited: boolean;
};
type SpellingDictionary = { correct(word: string): boolean; suggest(word: string): string[] };

const fold = (word: string) =>
  word.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i]![0] = i;
  for (let j = 0; j <= b.length; j++) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      rows[i]![j] = Math.min(
        rows[i - 1]![j]! + 1,
        rows[i]![j - 1]! + 1,
        rows[i - 1]![j - 1]! + Number(a[i - 1] !== b[j - 1]),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        rows[i]![j] = Math.min(rows[i]![j]!, rows[i - 2]![j - 2]! + 1);
    }
  return rows[a.length]![b.length]!;
}

function plausibleSuggestions(word: string, dictionary: SpellingDictionary): string[] {
  // Prefer a dictionary-validated plural preserving the noun's stem, e.g. cidadão/cidadãos.
  const stem = word.replace(/(?:ões|ães|oes|aes)$/iu, "");
  if (stem !== word && dictionary.correct(stem + "ão") && dictionary.correct(stem + "ãos"))
    return [stem + "ãos"];
  const original = fold(word);
  const candidates = [
    ...new Set(
      dictionary
        .suggest(word)
        .slice(0, 64)
        .map((value) => value.normalize("NFC")),
    ),
  ]
    .filter(
      (value) =>
        value !== word &&
        /^[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*$/u.test(value) &&
        dictionary.correct(value),
    )
    .map((value, order) => ({
      value,
      order,
      distance: editDistance(original, fold(value)),
      prefix: fold(value).slice(0, 2) === original.slice(0, 2),
    }))
    .filter((candidate) => candidate.distance <= (original.length < 5 ? 1 : 2));
  const sameStem = candidates.filter((candidate) => candidate.prefix);
  const ranked = (
    sameStem.length ? sameStem : candidates.filter((candidate) => candidate.distance <= 1)
  ).sort((a, b) => a.distance - b.distance || a.order - b.order);
  // A spelling dictionary does not understand the sentence. Keep alternatives conservative.
  return ranked
    .filter((candidate) => candidate.distance === ranked[0]?.distance)
    .slice(0, ranked[0]?.distance === 0 ? 2 : 1)
    .map((candidate) => candidate.value);
}

/** Offsets are UTF-16, matching textarea selection and String.slice. */
export function reviewEssaySpelling(
  text: string,
  dictionary: SpellingDictionary,
): EssaySpellingResult {
  if (text.length > 6000) throw new Error("Essay exceeds editor limit");
  const issues: EssaySpellingIssue[] = [];
  const cache = new Map<string, string[]>();
  for (const match of text.matchAll(/\p{L}[\p{L}\p{M}]*(?:[-’'][\p{L}\p{M}]+)*/gu)) {
    const word = match[0];
    const normalized = word.normalize("NFC");
    // URLs and emails are not prose; single letters and long identifiers are not useful suggestions.
    const before = text.slice(0, match.index).match(/\S*$/u)?.[0] ?? "";
    const after = text.slice(match.index).match(/^\S*/u)?.[0] ?? "";
    const surrounding = before + after;
    if (normalized.length < 2 || normalized.length > 40 || /https?:\/\/|www\.|@/i.test(surrounding))
      continue;
    if (dictionary.correct(normalized)) continue;
    if (issues.length === 30) return { issues, limited: true };
    let suggestions = cache.get(normalized);
    if (!suggestions) {
      suggestions = plausibleSuggestions(normalized, dictionary);
      cache.set(normalized, suggestions);
    }
    issues.push({ start: match.index, end: match.index + word.length, word, suggestions });
  }
  return { issues, limited: false };
}

/** A suggestion belongs to the exact reviewed revision, never to newer text. */
export function applyEssaySuggestion(
  current: string,
  reviewed: string,
  issue: EssaySpellingIssue,
  replacement: string,
): string | null {
  if (
    current !== reviewed ||
    current.slice(issue.start, issue.end) !== issue.word ||
    !issue.suggestions.includes(replacement)
  )
    return null;
  return current.slice(0, issue.start) + replacement + current.slice(issue.end);
}
