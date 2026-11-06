import { expect, it } from "vitest";
import { englishAnswerKey } from "./english-answer";

it("accepts unambiguous contractions, typography and punctuation without fuzzy scoring", () => {
  for (const [typed, expected] of [
    ["I’m a student!", "I am a student."],
    ["They aren't ready", "They are not ready."],
    ["We won't leave", "We will not leave."],
  ])
    expect(englishAnswerKey(typed!)).toBe(englishAnswerKey(expected!));
  for (const [typed, expected] of [
    ["I am ready", "I am not ready"],
    ["She worked here", "She works here"],
    ["I'd left", "I had left"],
    ["She has a bag", "She is a bag"],
  ])
    expect(englishAnswerKey(typed!)).not.toBe(englishAnswerKey(expected!));
});
