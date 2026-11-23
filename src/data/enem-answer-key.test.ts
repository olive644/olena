import { expect, it } from "vitest";
import { parseOfficialAnswerKey, scoreEnemAnswers } from "./enem-answer-key";
it("separa os idiomas e as colunas do gabarito oficial", () => {
  const key = parseOfficialAnswerKey([
    [
      { str: "1", x: 10, y: 50 },
      { str: "B", x: 50, y: 50 },
      { str: "A", x: 90, y: 50 },
      { str: "46", x: 220, y: 50 },
      { str: "C", x: 270, y: 50 },
      { str: "47", x: 220, y: 40 },
      { str: "Anulado", x: 270, y: 40 },
    ],
  ]);
  expect(key).toEqual({ "english:1": "B", "spanish:1": "A", "q:46": "C", "q:47": "ANULADA" });
});
it("calcula acertos, inclui brancos no total e exclui anuladas", () => {
  const score = scoreEnemAnswers(
    [{ key: "q:46" }, { key: "q:47" }, { key: "q:48" }, { key: "q:49" }],
    "humanities",
    { "humanities:q:46": "C", "humanities:q:47": "E" },
    { "q:46": "C", "q:47": "D", "q:48": "B", "q:49": "ANULADA" },
  );
  expect(score).toEqual({ correct: 1, total: 3, percentage: 33 });
  expect(() => scoreEnemAnswers([{ key: "q:99" }], "nature", {}, {})).toThrow(
    "Gabarito incompleto",
  );
});
