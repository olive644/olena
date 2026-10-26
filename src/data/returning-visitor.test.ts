import { afterEach, expect, it } from "vitest";
import { clearPersonalData } from "./personal-data";
import {
  isReturningVisitor,
  rememberReturningVisitor,
  RETURNING_VISITOR_ITEM,
} from "./returning-visitor";

afterEach(() => localStorage.clear());

it("lembra apenas o retorno e conserva a marca ao limpar dados pessoais na saída", () => {
  expect(isReturningVisitor()).toBe(false);
  localStorage.setItem("helena.onboarding.v1", "private");
  rememberReturningVisitor();
  clearPersonalData(localStorage);
  expect(isReturningVisitor()).toBe(true);
  expect(localStorage.getItem("helena.onboarding.v1")).toBeNull();
  expect(localStorage.getItem(RETURNING_VISITOR_ITEM)).toBe("1");
});
