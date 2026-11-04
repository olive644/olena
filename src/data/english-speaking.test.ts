import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { englishQuestion, type EnglishCourse } from "./english-journey";
import { isSpeakingQuestion, spokenEnglish } from "./english-speaking";
const course = JSON.parse(
  readFileSync("public/languages/en/english-v4.json", "utf8"),
) as EnglishCourse;
course.a1 = JSON.parse(readFileSync("public/languages/en/english-a1-v1.json", "utf8"));
it("interleaves speech at higher difficulty in every part without changing IDs or answers", () => {
  for (let part = 0; part < 6; part++) {
    const questions = Array.from({ length: part === 0 ? 240 : 120 }, (_, id) =>
      englishQuestion(course, part, id),
    );
    const speech = questions.filter(isSpeakingQuestion);
    expect(speech.length).toBeGreaterThan(10);
    expect(speech.length).toBeLessThan(questions.length / 3);
    expect(speech.every((q) => q.kind === "order" && q.level >= 1 && q.answer === q.phrase)).toBe(
      true,
    );
    expect(questions.filter((q) => q.level === 0).every((q) => !isSpeakingQuestion(q))).toBe(true);
  }
});
it("normalizes punctuation, contractions and basic spoken numbers without fuzzy meaning guesses", () => {
  expect(spokenEnglish("I'm twenty-one years old!")).toBe(spokenEnglish("I am 21 years old."));
  expect(spokenEnglish("She isn't here.")).toBe(spokenEnglish("She is not here"));
  expect(spokenEnglish("I can't go")).toBe(spokenEnglish("I can not go"));
  expect(spokenEnglish("What's your name?")).toBe(spokenEnglish("What is your name"));
  expect(spokenEnglish("I have 1.5 litres")).not.toBe(spokenEnglish("I have 15 litres"));
  expect(spokenEnglish("It is -1 degrees")).not.toBe(spokenEnglish("It is 1 degrees"));
  expect(spokenEnglish("I do not like coffee")).not.toBe(spokenEnglish("I like coffee"));
  expect(spokenEnglish("I need two tickets")).not.toBe(spokenEnglish("I need three tickets"));
  expect(spokenEnglish("Where are you?")).not.toBe(spokenEnglish("You are where"));
});
