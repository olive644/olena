import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MathArcade } from "./math-arcade";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("scores once per question, resets combo on error and restarts without saved XP", () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const saved = localStorage.getItem("helena.soloProgress");
  render(<MathArcade onBack={() => {}} />);
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole("button", { name: "Vamos calcular!" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Vamos calcular!" }));
  const answer = screen.getByRole("button", { name: "Resposta 2" });
  fireEvent.click(answer);
  fireEvent.click(answer);
  expect(screen.getByRole("status").textContent).toBe("BOA! +10");
  act(() => vi.advanceTimersByTime(500));
  fireEvent.keyDown(document.activeElement!, { key: "4" });
  expect(screen.getByRole("status").textContent).toBe("BOA! +12");
  act(() => vi.advanceTimersByTime(500));
  fireEvent.click(screen.getByRole("button", { name: "Resposta 3" }));
  expect(screen.getByRole("status").textContent).toBe("Resposta: 2");
  act(() => vi.advanceTimersByTime(1100));
  fireEvent.click(screen.getByRole("button", { name: "Resposta 2" }));
  expect(screen.getByRole("status").textContent).toBe("BOA! +10");
  act(() => vi.advanceTimersByTime(60000));
  expect(screen.getByRole("heading", { name: "32 pontos" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
  expect(screen.getByLabelText("3 chances restantes")).toBeTruthy();
  expect(localStorage.getItem("helena.soloProgress")).toBe(saved);
});

it("ends on the third error and releases timers and page scroll on exit", () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const back = vi.fn();
  const view = render(<MathArcade onBack={back} />);
  fireEvent.click(screen.getByRole("button", { name: "Vamos calcular!" }));
  for (let index = 0; index < 3; index++) {
    fireEvent.click(screen.getByRole("button", { name: "Resposta 3" }));
    act(() => vi.advanceTimersByTime(1100));
  }
  expect(screen.getByRole("heading", { name: "0 pontos" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voltar às ilhas" }));
  expect(back).toHaveBeenCalledOnce();
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(document.body.style.overflow).not.toBe("hidden");
});
