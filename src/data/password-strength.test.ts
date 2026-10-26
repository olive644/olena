import { expect, it } from "vitest";
import { passwordChecks, passwordStrength } from "./password-strength";

it("requires length and each requested category without counting spaces as symbols", () => {
  expect(passwordChecks("Longer Phrase 42")).toEqual([true, true, true, true, false]);
  expect(passwordChecks("Longer Phrase 42!").every(Boolean)).toBe(true);
  expect(passwordChecks("Árvore Longa 42!").every(Boolean)).toBe(true);
  expect(passwordChecks("Ab1!")[0]).toBe(false);
});
it("does not call a short or obvious password strong just because it mixes categories", () => {
  expect(passwordStrength("Password123456!")).toBe(0);
  expect(passwordStrength("Aaaaaaaa1!bc")).toBe(2);
  expect(passwordStrength("Maré! Livro 42 Jardim")).toBe(3);
  expect(passwordStrength("long lowercase phrase")).toBe(1);
});
