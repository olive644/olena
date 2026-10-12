import type { HelenaRequest } from "../ai/helena-contract.js";
import { requestedCalculation } from "./math/calculator.js";
import {
  MATH_KNOWLEDGE_VERSION,
  MATH_REFERENCES,
  retrieveMathReferences,
} from "./math/knowledge.js";

/** Somente o servidor acrescenta referências próprias e resultados calculados. */
export function helenaModelInput(request: HelenaRequest): string {
  const calculation =
    request.capability === "tutor" || request.capability === "explain"
      ? requestedCalculation(request.prompt)
      : undefined;
  const references = [...retrieveMathReferences(request.prompt)];
  if (calculation && references.length === 0) {
    const id =
      calculation.status === "checked" && calculation.kind === "linear-equation"
        ? "linear-equations"
        : calculation.expression.includes("%")
          ? "percentages"
          : calculation.expression.includes("/")
            ? "fractions"
            : "operations";
    const reference = MATH_REFERENCES.find((item) => item.id === id);
    if (reference) references.push(reference);
  }
  const math =
    references.length || calculation
      ? {
          version: MATH_KNOWLEDGE_VERSION,
          origin:
            "Referências originais da OlenaStudy, selecionadas pelo servidor para este pedido.",
          references: references.map(({ id, title, content }) => ({ id, title, content })),
          ...(calculation ? { calculator: calculation } : {}),
        }
      : undefined;
  return JSON.stringify({
    capability: request.capability,
    subject: request.subject,
    sources: request.sources,
    prompt: request.prompt,
    ...(math ? { math } : {}),
  });
}
