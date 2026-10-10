import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MathIslandJourney } from "./math-island-journey";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("navigates all six distinct themes vertically and clamps both ends", () => {
  render(<MathIslandJourney onBack={() => {}} />);
  expect(screen.queryByRole("button", { name: "Ilha anterior de Matemática" })).toBeNull();
  fireEvent.keyDown(screen.getByRole("button", { name: "Explorar ilha" }), { key: "ArrowDown" });
  expect(screen.getByRole("heading", { name: "Vila das Primeiras Contas" })).toBeTruthy();
  const titles = [
    "Cidade das Equações",
    "Observatório das Funções",
    "Jardins das Tangentes",
    "Porto das Integrais",
    "Santuário dos Vetores",
  ];
  for (const title of titles) {
    fireEvent.keyDown(screen.getByRole("button", { name: "Explorar ilha" }), { key: "ArrowUp" });
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
  }
  fireEvent.keyDown(screen.getByRole("button", { name: "Explorar ilha" }), { key: "ArrowUp" });
  expect(screen.getByRole("heading", { name: "Santuário dos Vetores" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Próxima ilha de Matemática" })).toBeNull();
  fireEvent.keyDown(screen.getByRole("button", { name: "Explorar ilha" }), { key: "ArrowDown" });
  expect(screen.getByRole("heading", { name: "Porto das Integrais" })).toBeTruthy();
});
it("animates entering the island and restores it on game exit", () => {
  vi.useFakeTimers();
  render(<MathIslandJourney onBack={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Entrar em Vila das Primeiras Contas" }));
  expect(document.querySelector(".math-journey.is-enter")).toBeTruthy();
  act(() => vi.advanceTimersByTime(850));
  expect(screen.getByRole("button", { name: "Vamos calcular!" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voltar às ilhas" }));
  act(() => vi.advanceTimersByTime(650));
  act(() => vi.advanceTimersByTime(850));
  expect(screen.getByRole("heading", { name: "Vila das Primeiras Contas" })).toBeTruthy();
});
