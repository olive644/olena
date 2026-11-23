import { afterEach, expect, it, vi } from "vitest";
import { validateQuestionReview } from "./enem-question-review";
import first from "../../public/enem/reviews/6ded5b936961cb.json";
import { readFileSync, readdirSync } from "node:fs";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("valida todas as estatísticas e resoluções publicadas na base salva", () => {
  let solutions = 0;
  let statistics = 0;
  for (const file of readdirSync("public/enem/reviews").filter((name) =>
    /^[a-f0-9]{14}\.json$/.test(name),
  )) {
    const bundle = JSON.parse(readFileSync(`public/enem/reviews/${file}`, "utf8")) as {
      questions: Record<string, { answer: string; solution?: unknown; statistics?: unknown }>;
    };
    for (const item of Object.values(bundle.questions)) {
      expect(validateQuestionReview(item, item.answer), file).toBe(true);
      if (item.solution) solutions++;
      if (item.statistics) statistics++;
    }
  }
  expect(solutions).toBeGreaterThanOrEqual(10);
  expect(statistics).toBeGreaterThanOrEqual(185);
});

it("confere as cinco resoluções salvas de inglês com o gabarito oficial de 2026", () => {
  ["B", "A", "E", "D", "C"].forEach((answer, index) => {
    const item = first.questions[`english:${index + 1}` as keyof typeof first.questions];
    expect(validateQuestionReview(item, answer)).toBe(true);
  });
});

it("bloqueia outro gabarito, justificativas incompletas e conteúdo sem fonte", () => {
  const item = first.questions["english:1"];
  expect(validateQuestionReview(item, "C")).toBe(false);
  expect(
    validateQuestionReview(
      { ...item, solution: { ...item.solution, alternatives: { A: "a" } } },
      "B",
    ),
  ).toBe(false);
  expect(
    validateQuestionReview({ ...item, solution: { ...item.solution, sources: [] } }, "B"),
  ).toBe(false);
});

it("aceita somente distribuições inteiras com o mesmo denominador", () => {
  const item = {
    answer: "B",
    statistics: {
      population: 10,
      counts: { A: 1, B: 5, C: 1, D: 1, E: 1, blank: 1 },
      source: {
        title: "INEP",
        url: "https://www.gov.br/inep",
        processedAt: "2026-11-22",
        scope: "Caderno e idioma conferidos",
      },
    },
  };
  expect(validateQuestionReview(item, "B")).toBe(true);
  expect(
    validateQuestionReview({ ...item, statistics: { ...item.statistics, population: 9 } }, "B"),
  ).toBe(false);
  expect(
    validateQuestionReview(
      { ...item, statistics: { ...item.statistics, counts: { ...item.statistics.counts, A: -1 } } },
      "B",
    ),
  ).toBe(false);
});

it("não substitui caderno sem conteúdo por uma resolução de outra edição", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404 }));
  const { loadQuestionReviewBundle } = await import("./enem-question-review");
  expect(await loadQuestionReviewBundle("aaaaaaaaaaaaaa", "/enem-pdf/other.pdf")).toBeNull();
});

it("rejeita um arquivo de outro caderno e permite nova tentativa de rede", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ ok: true, json: async () => first });
  vi.stubGlobal("fetch", fetcher);
  const { loadQuestionReviewBundle } = await import("./enem-question-review");
  await expect(loadQuestionReviewBundle(first.variantId, "/enem-pdf/wrong.pdf")).rejects.toThrow(
    "offline",
  );
  await expect(loadQuestionReviewBundle(first.variantId, "/enem-pdf/wrong.pdf")).rejects.toThrow(
    "outro caderno",
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});
