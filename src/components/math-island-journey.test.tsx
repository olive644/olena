import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MathIslandJourney } from "./math-island-journey";
import {
  finishMathPlace,
  mathPlaceRewards,
  MATH_PLACE_REWARDS_KEY,
} from "../data/math-place-rewards";
import { updateAccessibility } from "../data/accessibility-preferences";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.removeItem(MATH_PLACE_REWARDS_KEY);
  updateAccessibility({ reduceMotion: false });
});
function shownPoints() {
  return Number(
    document.querySelector(".math-place-total .math-number")?.getAttribute("aria-label"),
  );
}
it("counts down to zero and back up from the previous place without changing saved points", () => {
  vi.useFakeTimers();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  localStorage.removeItem(MATH_PLACE_REWARDS_KEY);
  finishMathPlace("foundations", "points", 530, () => 0.5);
  render(<MathIslandJourney onBack={() => {}} />);
  act(() => vi.advanceTimersByTime(1000));
  expect(shownPoints()).toBe(530);
  fireEvent.click(screen.getByRole("button", { name: "Próximo lugar" }));
  expect(shownPoints()).toBe(530);
  act(() => vi.advanceTimersByTime(160));
  expect(shownPoints()).toBeGreaterThan(0);
  expect(shownPoints()).toBeLessThan(530);
  act(() => vi.advanceTimersByTime(1000));
  expect(shownPoints()).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Lugar anterior" }));
  expect(shownPoints()).toBe(0);
  act(() => vi.advanceTimersByTime(160));
  expect(shownPoints()).toBeGreaterThan(0);
  expect(shownPoints()).toBeLessThan(530);
  act(() => vi.advanceTimersByTime(1000));
  expect(shownPoints()).toBe(530);
  expect(mathPlaceRewards("foundations").points).toBe(530);
  expect(mathPlaceRewards("school").points).toBe(0);
});
it("retargets from the visible intermediate value when places change quickly", () => {
  vi.useFakeTimers();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  localStorage.removeItem(MATH_PLACE_REWARDS_KEY);
  finishMathPlace("foundations", "points", 530, () => 0.5);
  finishMathPlace("advanced", "points", 50, () => 0.5);
  render(<MathIslandJourney onBack={() => {}} />);
  act(() => vi.advanceTimersByTime(1000));
  fireEvent.click(screen.getByRole("button", { name: "Próximo lugar" }));
  act(() => vi.advanceTimersByTime(160));
  const intermediate = shownPoints();
  fireEvent.click(screen.getByRole("button", { name: "Próximo lugar" }));
  expect(shownPoints()).toBe(intermediate);
  act(() => vi.advanceTimersByTime(1000));
  expect(shownPoints()).toBe(50);
});
it("sets the selected place points directly with reduced motion", () => {
  vi.useFakeTimers();
  updateAccessibility({ reduceMotion: true });
  localStorage.removeItem(MATH_PLACE_REWARDS_KEY);
  finishMathPlace("foundations", "points", 530, () => 0.5);
  render(<MathIslandJourney onBack={() => {}} />);
  act(() => vi.advanceTimersByTime(16));
  expect(shownPoints()).toBe(530);
  fireEvent.click(screen.getByRole("button", { name: "Próximo lugar" }));
  act(() => vi.advanceTimersByTime(16));
  expect(shownPoints()).toBe(0);
});
it("navigates six places horizontally and clamps both ends", () => {
  render(<MathIslandJourney onBack={() => {}} />);
  expect(screen.queryByRole("button", { name: "Ilha anterior de Matemática" })).toBeNull();
  fireEvent.keyDown(screen.getByRole("button", { name: "Explorar lugar" }), { key: "ArrowLeft" });
  expect(screen.getByRole("heading", { name: "Pátio das Primeiras Contas" })).toBeTruthy();
  const titles = [
    "Oficina das Equações",
    "Torre das Funções",
    "Ponte das Tangentes",
    "Porto das Integrais",
    "Mirante dos Vetores",
  ];
  for (const title of titles) {
    fireEvent.keyDown(screen.getByRole("button", { name: "Explorar lugar" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
  }
  fireEvent.keyDown(screen.getByRole("button", { name: "Explorar lugar" }), { key: "ArrowRight" });
  expect(screen.getByRole("heading", { name: "Mirante dos Vetores" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Próxima ilha de Matemática" })).toBeNull();
  fireEvent.keyDown(screen.getByRole("button", { name: "Explorar lugar" }), { key: "ArrowLeft" });
  expect(screen.getByRole("heading", { name: "Porto das Integrais" })).toBeTruthy();
});
it("animates entering the island and restores it on game exit", () => {
  vi.useFakeTimers();
  render(<MathIslandJourney onBack={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }));
  expect(document.querySelector(".math-journey.is-enter")).toBeTruthy();
  act(() => vi.advanceTimersByTime(850));
  expect(screen.getByRole("button", { name: "Vamos calcular!" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voltar às ilhas" }));
  act(() => vi.advanceTimersByTime(650));
  act(() => vi.advanceTimersByTime(850));
  expect(screen.getByRole("heading", { name: "Pátio das Primeiras Contas" })).toBeTruthy();
});
it("flies from the discipline avatar before enabling place entry", () => {
  vi.useFakeTimers();
  render(<MathIslandJourney onBack={() => {}} entryOrigin={{ x: 50, y: 100, size: 64 }} />);
  expect(document.querySelector(".math-journey.is-arrive")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Explorar lugar" }).hasAttribute("disabled")).toBe(
    true,
  );
  act(() => vi.advanceTimersByTime(850));
  expect(screen.getByRole("button", { name: "Explorar lugar" }).hasAttribute("disabled")).toBe(
    false,
  );
});
