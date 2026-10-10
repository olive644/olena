import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MathIslandJourney } from "./math-island-journey";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
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
