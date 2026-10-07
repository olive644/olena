import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BingoParticipant } from "./bingo-participant";
const audio = {
  mix: vi.fn(),
  stop: vi.fn(),
  exit: vi.fn(),
  reveal: vi.fn(),
  land: vi.fn(),
  unlock: vi.fn(),
  dispose: vi.fn(),
};
vi.mock("./bingo-saturn-sound", () => ({ createSaturnSound: () => audio }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const props = { isHost: false, pending: false, onDraw: vi.fn() };
it("mostra o aviso sem canvas, sai antes do número e só depois inclui a bola no histórico", () => {
  const onReveal = vi.fn();
  const view = render(<BingoParticipant {...props} drawn={[]} onReveal={onReveal} />);
  act(() => vi.advanceTimersByTime(1));
  view.rerender(<BingoParticipant {...props} drawn={["35"]} onReveal={onReveal} />);
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText("GLOBO RODANDO")).toBeTruthy();
  expect(view.container.querySelector("canvas")).toBeNull();
  act(() => vi.advanceTimersByTime(3949));
  expect(view.container.querySelector(".bingo-spin-banner--leaving")).toBeTruthy();
  expect(screen.queryByLabelText("Saiu 35")).toBeNull();
  act(() => vi.advanceTimersByTime(220));
  expect(screen.queryByText("GLOBO RODANDO")).toBeNull();
  expect(screen.getByLabelText("Saiu 35")).toBeTruthy();
  expect(screen.getByLabelText("Saiu 35").style.getPropertyValue("--ball-base")).toBe("#a779ef");
  expect(onReveal).toHaveBeenLastCalledWith(["35"]);
  expect(screen.queryByRole("listitem")).toBeNull();
  act(() => vi.advanceTimersByTime(2300));
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByRole("listitem").style.getPropertyValue("--ball-base")).toBe("#a779ef");
  expect(audio.reveal).toHaveBeenCalledOnce();
});
it("restaura histórico sem repetir sorteio e cancela animação ao recomeçar", () => {
  const view = render(<BingoParticipant {...props} drawn={["1", "2"]} />);
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(audio.mix).not.toHaveBeenCalled();
  view.rerender(<BingoParticipant {...props} drawn={["1", "2", "3"]} />);
  act(() => vi.advanceTimersByTime(1));
  view.rerender(<BingoParticipant {...props} drawn={[]} />);
  act(() => vi.advanceTimersByTime(8000));
  expect(screen.queryByRole("listitem")).toBeNull();
  expect(audio.reveal).not.toHaveBeenCalled();
  view.unmount();
  expect(audio.dispose).toHaveBeenCalledOnce();
});
