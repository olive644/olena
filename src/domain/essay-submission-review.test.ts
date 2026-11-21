import { expect, it } from "vitest";
import { essaySubmissionReview } from "./essay-submission-review";
it("reports literal duplication and long periods without assigning grades", () => {
  const paragraph =
    "A cidadania depende de serviços acessíveis e de políticas públicas capazes de reduzir desigualdades.";
  const result = essaySubmissionReview(paragraph + "\n" + paragraph);
  expect(
    result.structuralObservations.some((item) => item.includes("1 parágrafos repetidos")),
  ).toBe(true);
  expect(essaySubmissionReview("palavra ".repeat(81)).structuralObservations).toHaveLength(2);
  expect(result).not.toHaveProperty("score");
});
it("does not confuse a short draft with proven argumentation or grammar", () => {
  expect(essaySubmissionReview("teste").insufficient).toBe(true);
  expect(essaySubmissionReview("Uma frase curta.").structuralObservations).toEqual([]);
});
