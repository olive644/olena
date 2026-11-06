import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { englishQuestion, validEnglishCourse } from "../data/english-journey";
import { scrambledWordOrder } from "./english-word-order";

const text = (phrase: string, order: readonly number[]) =>
  order.map((at) => phrase.split(" ")[at]).join(" ");

it("é uma permutação estável e não mostra a frase na ordem certa nem invertida", () => {
  const value: unknown = JSON.parse(readFileSync("public/languages/en/english-v4.json", "utf8"));
  if (!validEnglishCourse(value)) throw Error("Invalid content");
  let checked = 0;
  value.parts.forEach((part, at) => {
    for (let id = 0; id < part.teaching.length * 4; id++) {
      const question = englishQuestion(value, at, id);
      if (question.kind !== "order") continue;
      const order = scrambledWordOrder(question.phrase);
      const words = question.phrase.split(" ");
      expect([...order].sort((a, b) => a - b)).toEqual(words.map((_, place) => place));
      expect(scrambledWordOrder(question.phrase)).toEqual(order);
      const shown = text(question.phrase, order);
      const reverse = [...words].reverse().join(" ");
      const uniqueWords = new Set(words).size === words.length;
      if (words.length >= 2 && uniqueWords) expect(shown).not.toBe(question.phrase);
      if (words.length >= 3 && uniqueWords) expect(shown).not.toBe(reverse);
      checked++;
    }
  });
  expect(checked).toBeGreaterThan(100);
});

it("troca a ordem de uma frase de duas palavras", () => {
  expect(scrambledWordOrder("Thank you")).toEqual([1, 0]);
  expect(scrambledWordOrder("Hello")).toEqual([0]);
});
