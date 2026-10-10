import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MathIslandJourney } from "./math-island-journey";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("navigates all six distinct themes vertically and clamps both ends", () => {
  render(<MathIslandJourney onBack={() => {}} />);
  expect(screen.getByRole("button", { name: "Ilha anterior de Matemática" })).toHaveProperty(
    "disabled",
    true,
  );
  const titles = [
    "Cidade das Equações",
    "Observatório das Funções",
    "Jardins das Tangentes",
    "Porto das Integrais",
    "Santuário dos Vetores",
  ];
  for (const title of titles) {
    fireEvent.click(screen.getByRole("button", { name: "Próxima ilha de Matemática" }));
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
  }
  expect(screen.getByRole("button", { name: "Próxima ilha de Matemática" })).toHaveProperty(
    "disabled",
    true,
  );
  fireEvent.keyDown(screen.getByRole("button", { name: "Explorar ilha" }), { key: "ArrowDown" });
  expect(screen.getByRole("heading", { name: "Porto das Integrais" })).toBeTruthy();
});
it("animates entering the island and restores it on game exit", () => {
  vi.useFakeTimers();
  render(<MathIslandJourney onBack={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Explorar ilha" }));
  expect(document.querySelector(".math-journey.is-enter")).toBeTruthy();
  act(() => vi.advanceTimersByTime(850));
  expect(screen.getByRole("button", { name: "Vamos calcular!" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voltar às ilhas" }));
  act(() => vi.advanceTimersByTime(650));
  act(() => vi.advanceTimersByTime(850));
  expect(screen.getByRole("heading", { name: "Vila das Primeiras Contas" })).toBeTruthy();
});
