import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MathPlaceTreasure } from "./math-place-treasure";
import { finishMathPlace, MATH_PLACE_REWARDS_KEY } from "../data/math-place-rewards";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.removeItem(MATH_PLACE_REWARDS_KEY);
});
it("counts points, survives remount while unlocking and animates opening", () => {
  vi.useFakeTimers();
  finishMathPlace("foundations", "round", 120);
  const view = render(<MathPlaceTreasure course="foundations" />);
  expect(screen.getByLabelText("120 pontos neste lugar")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Destrancar baú" }));
  expect(screen.getByRole("button", { name: "Abrir baú" }).hasAttribute("disabled")).toBe(true);
  act(() => vi.advanceTimersByTime(30_000));
  view.unmount();
  render(<MathPlaceTreasure course="foundations" />);
  expect(screen.getByText("Destrancando · 30s")).toBeTruthy();
  act(() => vi.advanceTimersByTime(30_000));
  fireEvent.click(screen.getByRole("button", { name: "Abrir baú" }));
  expect(screen.getByText("Baú comum aberto!")).toBeTruthy();
  expect(document.querySelector(".math-common-chest.is-open")).toBeTruthy();
});
