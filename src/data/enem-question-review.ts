import { enemPdfUrl } from "./enem-pdf-url";

export type QuestionStatistics = {
  population: number;
  counts: Record<string, number>;
  source: { title: string; url: string; processedAt: string; scope: string };
};
export type SavedQuestionReview = {
  answer: string;
  solution?: {
    paragraphs: string[];
    alternatives: Record<string, string>;
    sources: { title: string; url: string }[];
    checkedAt: string;
    verification: "published-solution-and-official-key" | "ai-authored-official-key-checked";
  };
  statistics?: QuestionStatistics;
};
type ReviewBundle = {
  version: 1;
  variantId: string;
  paperUrl: string;
  answerUrl: string;
  questions: Record<string, SavedQuestionReview>;
};
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const source = (value: unknown): boolean =>
  record(value) &&
  text(value["title"]) &&
  typeof value["url"] === "string" &&
  /^https:\/\//.test(value["url"]);
const letters = ["A", "B", "C", "D", "E"];

/** Nenhum texto gerado em tempo de execução. Uma divergência com o gabarito bloqueia a publicação. */
export function validateQuestionReview(
  value: unknown,
  officialAnswer: string,
): value is SavedQuestionReview {
  if (
    !record(value) ||
    value["answer"] !== officialAnswer ||
    !/^(?:[A-E]|ANULADA)$/.test(officialAnswer)
  )
    return false;
  const solution = value["solution"];
  if (
    solution !== undefined &&
    (!record(solution) ||
      !["published-solution-and-official-key", "ai-authored-official-key-checked"].includes(
        String(solution["verification"]),
      ) ||
      !text(solution["checkedAt"]) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(solution["checkedAt"]) ||
      !Array.isArray(solution["paragraphs"]) ||
      !solution["paragraphs"].length ||
      !solution["paragraphs"].every(text) ||
      !record(solution["alternatives"]) ||
      !letters.every((letter) =>
        text((solution["alternatives"] as Record<string, unknown>)[letter]),
      ) ||
      !Array.isArray(solution["sources"]) ||
      !solution["sources"].length ||
      !solution["sources"].every(source))
  )
    return false;
  const stats = value["statistics"];
  if (stats !== undefined) {
    if (
      !record(stats) ||
      !Number.isSafeInteger(stats["population"]) ||
      Number(stats["population"]) < 1 ||
      !record(stats["counts"]) ||
      !source(stats["source"])
    )
      return false;
    const counts = stats["counts"];
    if (
      ![...letters, "blank"].every(
        (letter) => Number.isSafeInteger(counts[letter]) && Number(counts[letter]) >= 0,
      ) ||
      [...letters, "blank"].reduce((sum, letter) => sum + Number(counts[letter]), 0) !==
        stats["population"]
    )
      return false;
    const origin = stats["source"];
    if (!record(origin) || !text(origin["processedAt"]) || !text(origin["scope"])) return false;
  }
  return solution !== undefined || stats !== undefined;
}

const cache = new Map<string, Promise<ReviewBundle | null>>();
export function loadQuestionReviewBundle(
  variantId: string,
  paperUrl: string,
): Promise<ReviewBundle | null> {
  if (!/^[a-f0-9]{14}$/.test(variantId)) return Promise.reject(new Error("Caderno inválido"));
  const cacheKey = `${variantId}:${paperUrl}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;
  const promise = (async () => {
    const response = await fetch(`/enem/reviews/${variantId}.json`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Não foi possível carregar a revisão");
    const data: unknown = await response.json();
    if (
      !record(data) ||
      data["version"] !== 1 ||
      data["variantId"] !== variantId ||
      typeof data["paperUrl"] !== "string" ||
      enemPdfUrl(data["paperUrl"]) !== paperUrl ||
      typeof data["answerUrl"] !== "string" ||
      !record(data["questions"])
    )
      throw new Error("Revisão de outro caderno");
    return data as ReviewBundle;
  })();
  cache.set(cacheKey, promise);
  void promise.catch(() => cache.delete(cacheKey));
  return promise;
}
