import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MathPlaceTreasure } from "./math-place-treasure";
import { applySyncedStorage, readSyncedStorage } from "../data/synced-storage";
import {
  finishMathPlace,
  MATH_PLACE_REWARDS_KEY,
  mathPlaceRewards,
  openMathChest,
  unlockMathChest,
} from "../data/math-place-rewards";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.removeItem(MATH_PLACE_REWARDS_KEY);
});
it("refreshes rewards received from the account and closes stale boosters on logout", () => {
  finishMathPlace("foundations", "remote", 180, () => 0.5);
  unlockMathChest("foundations", "remote", 0);
  openMathChest("foundations", "remote", 60000, () => 0);
  const cloud = readSyncedStorage();
  localStorage.removeItem(MATH_PLACE_REWARDS_KEY);
  render(<MathPlaceTreasure course="foundations" />);
  act(() => applySyncedStorage(cloud));
  expect(screen.getByLabelText("180 pontos neste lugar")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Revelar cartas do baú" }));
  act(() => applySyncedStorage({}));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getAllByLabelText("Espaço de baú vazio")).toHaveLength(3);
});
it("counts points, survives remount during countdown and opens a backside booster", () => {
  vi.useFakeTimers();
  finishMathPlace("foundations", "round", 120, () => 0.5);
  const view = render(<MathPlaceTreasure course="foundations" />);
  expect(screen.getByLabelText("120 pontos neste lugar")).toBeTruthy();
  expect(screen.getAllByLabelText("Espaço de baú vazio")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Destrancar baú comum" }));
  expect(
    screen.getByRole("button", { name: /60 segundos restantes/ }).hasAttribute("disabled"),
  ).toBe(true);
  act(() => vi.advanceTimersByTime(30000));
  view.unmount();
  render(<MathPlaceTreasure course="foundations" />);
  expect(screen.getByRole("button", { name: /30 segundos restantes/ })).toBeTruthy();
  act(() => vi.advanceTimersByTime(30000));
  fireEvent.click(screen.getByRole("button", { name: "Abrir baú comum" }));
  expect(screen.queryByRole("progressbar", { name: "Destrancando baú" })).toBeNull();
  expect(document.querySelector(".math-common-chest.is-open")).toBeTruthy();
  act(() => vi.advanceTimersByTime(900));
  expect(screen.getByRole("dialog", { name: "Cartas do baú comum" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Revelar carta" })).toBeTruthy();
});
it("counts each revealed copy once and resumes unrevealed cards on reopening", () => {
  vi.useFakeTimers();
  finishMathPlace("foundations", "round", 100, () => 0.5);
  unlockMathChest("foundations", "round", 0);
  const rolls = [0.9, 0, 0];
  openMathChest("foundations", "round", 60000, () => rolls.shift()!);
  render(<MathPlaceTreasure course="foundations" />);
  fireEvent.click(screen.getByRole("button", { name: "Revelar cartas do baú" }));
  const reveal = screen.getByRole("button", { name: "Revelar carta" });
  fireEvent.click(reveal);
  act(() => applySyncedStorage(readSyncedStorage()));
  const echo = readSyncedStorage();
  const current = JSON.parse(echo[MATH_PLACE_REWARDS_KEY]!).foundations;
  echo[MATH_PLACE_REWARDS_KEY] = JSON.stringify({
    foundations: {
      chests: current.chests,
      receipts: current.receipts,
      rounds: current.rounds,
      points: current.points,
    },
  });
  act(() => applySyncedStorage(echo));
  expect(screen.getByRole("dialog", { name: "Cartas do baú comum" })).toBeTruthy();
  fireEvent.click(reveal);
  expect(mathPlaceRewards("foundations").chests[0]!.revealed).toBe(1);
  fireEvent.click(screen.getByRole("button", { name: "Fechar cartas" }));
  fireEvent.click(screen.getByRole("button", { name: "Revelar cartas do baú" }));
  fireEvent.click(screen.getByRole("button", { name: "Revelar carta" }));
  expect(screen.getByLabelText("0 cartas restantes no baú")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Guardar cartas" }));
  expect(document.querySelectorAll(".oliver-store-flight > div")).toHaveLength(2);
  act(() => vi.advanceTimersByTime(900));
  expect(screen.getAllByLabelText("Espaço de baú vazio")).toHaveLength(3);
  expect(screen.getByRole("dialog", { name: "Coleção do Oliver" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "A primeira estrela, 2 cópias" })).toBeTruthy();
});
