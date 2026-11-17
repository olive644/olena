export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizLength = "short" | "medium" | "long";
export type SourceQuizQuestion = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  sourceId: string;
  sourceTitle: string;
  page: number;
};
export type SourceQuiz = {
  version: 1;
  difficulty: QuizDifficulty;
  questions: SourceQuizQuestion[];
};
type Fact = { back: string; page: number; sourceId: string; sourceTitle: string };
const normalize = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
const STOP = new Set(
  "para como pelo pela pelos pelas entre sobre uma umas uns este esta esse essa isso isto seus suas mais muito durante quando onde desde foram estava eram sendo tem sua seu dos das com que por foi aos sao não nao mas também tambem".split(
    " ",
  ),
);
/** Source-grounded cloze questions: alternatives are terms or numbers from the selected sources. */
export function buildSourceQuiz(
  facts: readonly Fact[],
  difficulty: QuizDifficulty,
  length: QuizLength,
): SourceQuiz {
  const statements = facts
    .map((f) => ({
      ...f,
      text: f.back
        .replace(/^(?:Falso\. O texto diz:|False\. The text says:|Verdadeiro\.|True\.)\s*/i, "")
        .trim(),
    }))
    .filter(
      (f) =>
        f.text.length >= 45 &&
        f.text.length <= 600 &&
        f.text.split(/\s+/).length >= 8 &&
        /\b(?:foi|foram|era|eram|[ée]|s[ãa]o|possui|utiliza|representa|significa|consiste|permite|come[çc]ou|ocorreu|encerrou|concluiu|podia|usava|conectavam|trabalhavam|tinha|tem|is|was|were|are|has|uses|means)\b/i.test(
          f.text,
        ),
    );
  const numbers = [
    ...new Set(
      facts.flatMap((f) => f.back.match(/\b\d+(?:[.,]\d+)?(?:\s*(?:mil|milhões|%))?/g) ?? []),
    ),
  ];
  const words = [
    ...new Map(
      statements
        .flatMap((f) => f.text.match(/[\p{L}][\p{L}\p{M}-]{4,}/gu) ?? [])
        .filter((w) => !STOP.has(normalize(w)) && /^\p{Lu}/u.test(w))
        .map((w) => [normalize(w), w]),
    ).values(),
  ];
  const limit = length === "short" ? 5 : length === "long" ? 15 : 10;
  const count = difficulty === "easy" ? 3 : 4;
  const made: SourceQuizQuestion[] = [];
  const seen = new Set<string>();
  for (const fact of statements) {
    if (seen.has(normalize(fact.text))) continue;
    const candidates = [
      ...fact.text.matchAll(
        /\b\d+(?:[.,]\d+)?(?:\s*(?:mil|milhões|%))?|[\p{L}][\p{L}\p{M}-]{4,}/gu,
      ),
    ].filter(
      (m) =>
        !STOP.has(normalize(m[0])) && (/^\d/.test(m[0]) || (m.index! > 0 && /^\p{Lu}/u.test(m[0]))),
    );
    candidates.sort(
      (a, b) => Number(/^\d/.test(b[0])) - Number(/^\d/.test(a[0])) || b[0].length - a[0].length,
    );
    for (const token of candidates) {
      const correct = token[0],
        numeric = /^\d/.test(correct);
      const pool = (numeric ? numbers : words)
        .filter(
          (w) =>
            normalize(w) !== normalize(correct) &&
            !normalize(fact.text).includes(normalize(w)) &&
            (!numeric ||
              (/^(?:1[5-9]|20)\d{2}$/.test(correct)
                ? /^(?:1[5-9]|20)\d{2}$/.test(w)
                : /[a-z%]/i.test(correct) === /[a-z%]/i.test(w))),
        )
        .sort((a, b) =>
          difficulty === "hard" && numeric
            ? Math.abs(parseFloat(a) - parseFloat(correct)) -
              Math.abs(parseFloat(b) - parseFloat(correct))
            : Math.abs(a.length - correct.length) - Math.abs(b.length - correct.length),
        );
      if (pool.length < count - 1) continue;
      const options = [correct, ...pool.slice(0, count - 1)];
      const answer = made.length % count;
      [options[0], options[answer]] = [options[answer]!, options[0]!];
      made.push({
        prompt:
          fact.text.slice(0, token.index) +
          "_____" +
          fact.text.slice((token.index ?? 0) + correct.length),
        options,
        answer,
        explanation: fact.text,
        sourceId: fact.sourceId,
        sourceTitle: fact.sourceTitle,
        page: fact.page,
      });
      seen.add(normalize(fact.text));
      break;
    }
    if (made.length >= limit) break;
  }
  return { version: 1, difficulty, questions: made };
}
export function parseSourceQuiz(content: string): SourceQuiz | undefined {
  try {
    const value: unknown = JSON.parse(content);
    if (
      !value ||
      typeof value !== "object" ||
      !("version" in value) ||
      value.version !== 1 ||
      !("questions" in value) ||
      !Array.isArray(value.questions) ||
      value.questions.length === 0 ||
      value.questions.length > 15
    )
      return;
    if (!("difficulty" in value) || !["easy", "medium", "hard"].includes(String(value.difficulty)))
      return;
    const valid = value.questions.every(
      (q: unknown) =>
        q &&
        typeof q === "object" &&
        "prompt" in q &&
        typeof q.prompt === "string" &&
        "options" in q &&
        Array.isArray(q.options) &&
        q.options.length >= 3 &&
        q.options.length <= 4 &&
        q.options.every((o: unknown) => typeof o === "string") &&
        new Set(q.options).size === q.options.length &&
        "answer" in q &&
        Number.isInteger(q.answer) &&
        Number(q.answer) >= 0 &&
        Number(q.answer) < q.options.length &&
        "explanation" in q &&
        typeof q.explanation === "string" &&
        "sourceId" in q &&
        typeof q.sourceId === "string" &&
        "sourceTitle" in q &&
        typeof q.sourceTitle === "string" &&
        "page" in q &&
        typeof q.page === "number",
    );
    return valid ? (value as SourceQuiz) : undefined;
  } catch {
    return;
  }
}
