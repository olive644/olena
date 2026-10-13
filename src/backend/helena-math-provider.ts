import type { HelenaRequest } from "../ai/helena-contract.js";
import type { HelenaProvider } from "./helena-handler.js";
import { requestedCalculation, requestsNumberOnly } from "./math/calculator.js";

/** Resultados calculados no servidor; teoria e conversa continuam no professor. */
function calculatedAnswer(request: HelenaRequest): string | undefined {
  if (request.capability !== "tutor" && request.capability !== "explain") return undefined;
  const result = requestedCalculation(request.prompt);
  if (!result) return undefined;
  if (result.status !== "checked") return result.status === "invalid" ? result.reason : undefined;
  if (requestsNumberOnly(request.prompt)) return result.exact.replace(/^x = /, "");
  const steps = result.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  return [
    `Resultado conferido: ${result.exact}.`,
    steps,
    result.approximate ? `Aproximação decimal: ${result.approximate}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function createMathGroundedProvider(teacher: HelenaProvider): HelenaProvider {
  return {
    async generate(request, signal) {
      signal?.throwIfAborted();
      const answer = calculatedAnswer(request);
      if (answer !== undefined) return { answer, suggestions: [] };
      return teacher.generate(request, signal);
    },
    async *stream(request, signal) {
      signal.throwIfAborted();
      const answer = calculatedAnswer(request);
      if (answer !== undefined) {
        yield answer;
        return;
      }
      if (!teacher.stream) throw new Error("Streaming unavailable");
      yield* teacher.stream(request, signal);
    },
  };
}
