import { expect, it } from "vitest";
import { speakingWords, speechAccepted } from "./english-speaking-words";
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
const accepted = (expected: string, heard: string) => speechAccepted(expected, heard);
it("accepts a one letter recognition slip in one content word, as observed in real model output", () => {
  expect(accepted("Can I pay by card?", "Can I pay by cards")).toBe(true);
  expect(accepted("I work at the hospital.", "I work at the hospitel")).toBe(true);
  expect(
    speakingWords("Can I pay by card?", "can i pay by cards", true).every(
      (x) => x.state === "correct",
    ),
  ).toBe(true);
});
it("never relaxes numbers, negations or short grammar words", () => {
  expect(accepted("I do not like coffee.", "I do like coffee")).toBe(false);
  expect(accepted("I cannot hear you.", "I can hear you")).toBe(false);
  expect(accepted("Our teacher has two cats.", "Our teacher has three cats")).toBe(false);
  expect(
    accepted("These tomatoes are 2 pounds a kilo.", "These tomatoes are 3 pounds a kilo"),
  ).toBe(false);
  expect(accepted("She is from Japan.", "She was from Japan")).toBe(false);
  expect(accepted("Are you from Brazil?", "Is you from Brazil")).toBe(false);
  expect(accepted("My dog is big.", "My dig is big")).toBe(false);
  expect(accepted("I like the park.", "I like the dark")).toBe(false);
});
it("limits near-miss words per sentence and never lets a different sentence pass", () => {
  expect(
    accepted("The keys are under the green chair.", "The keys are under the green chairs"),
  ).toBe(true);
  expect(accepted("I can pay by card now.", "I can pay by cards new")).toBe(false);
  expect(accepted("I would like two tickets, please.", "I would like two tickets")).toBe(false);
  expect(accepted("Please open the door.", "Please close the door")).toBe(false);
});
it("ignores recognizer annotations and the invented thank-you at the edges", () => {
  expect(accepted("What is your name?", "What is your name? Thank you.")).toBe(true);
  expect(accepted("What is your name?", "[BLANK_AUDIO] What is your name?")).toBe(true);
  expect(accepted("What is your name?", "Uh, what is your name")).toBe(true);
  expect(accepted("I see you.", "I see you")).toBe(true);
  expect(accepted("Thank you for the help.", "Thank you for the help")).toBe(true);
  expect(accepted("What is your name?", "What is your name and thank you very much")).toBe(false);
  expect(accepted("What is your name?", "Thank you.")).toBe(false);
  expect(accepted("What is your name?", "")).toBe(false);
});
it("treats the unstressed article a and of as the one allowed short-word confusion", () => {
  expect(
    accepted("These tomatoes are 2 pounds a kilo.", "These tomatoes are 2 pounds of kilo"),
  ).toBe(true);
  expect(accepted("It is a book.", "It is of book")).toBe(true);
  expect(accepted("It is a book.", "It is the book")).toBe(false);
  expect(accepted("I have a car.", "I have of cars here")).toBe(false);
});
it("accepts sounds-alike the model confuses, such as 'Air you from Brazil' for 'Are you from Brazil'", () => {
  // Texto real ouvido no celular: o áudio de "are" e "air" não se distingue.
  expect(accepted("Are you from Brazil?", "Air you from Brazil.")).toBe(true);
  expect(
    speakingWords("Are you from Brazil?", "Air you from Brazil.", true).map((x) => x.state),
  ).toEqual(["correct", "correct", "correct", "correct"]);
  expect(accepted("I want to go.", "I want too go")).toBe(true);
  expect(accepted("I want to go.", "I want two go")).toBe(true);
  expect(accepted("Where is your bag?", "Wear is your bag")).toBe(true);
  expect(accepted("It is for you.", "it is four you")).toBe(true);
});
it("sounds-alike never rescue a wrong word, a missing word or an extra word", () => {
  expect(accepted("Are you from Brazil?", "Are you from Japan")).toBe(false);
  expect(accepted("Are you from Brazil?", "you from Brazil")).toBe(false);
  expect(accepted("Are you from Brazil?", "Are you from Brazil today")).toBe(false);
  expect(accepted("I have two cats.", "I have three cats")).toBe(false);
  expect(accepted("I do not know.", "I do know")).toBe(false);
});
