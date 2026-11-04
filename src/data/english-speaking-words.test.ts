import { expect, it } from "vitest";
import { speakingWords } from "./english-speaking-words";
it("reveals recognized prefix without marking the remaining words wrong", () => {
  expect(speakingWords("What is your name?", "What is").map((x) => x.state)).toEqual([
    "correct",
    "correct",
    "waiting",
    "waiting",
  ]);
});
it("marks a changed word and missing final words for another attempt", () => {
  expect(speakingWords("What is your name?", "What is my name", true).map((x) => x.state)).toEqual([
    "correct",
    "correct",
    "retry",
    "correct",
  ]);
  expect(speakingWords("What is your name?", "What is", true).map((x) => x.state)).toEqual([
    "correct",
    "correct",
    "retry",
    "retry",
  ]);
});
it("normalizes contractions, punctuation and numbers with the existing grading rule", () => {
  expect(
    speakingWords("I'm twenty years old.", "I am 20 years old", true).every(
      (x) => x.state === "correct",
    ),
  ).toBe(true);
});
it("does not present additional recognized words as a perfect sentence", () => {
  expect(
    speakingWords("My name is Olena.", "My name is Olena and Oliver", true).some(
      (x) => x.state === "retry",
    ),
  ).toBe(true);
});
