import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { AchievementProgress } from "../hooks/use-math-achievements";
import { GENERAL_ACHIEVEMENTS } from "../domain/general-achievement-catalog";
import { createInitialWorkspace } from "../domain/workspace";
import { AchievementAnnouncer } from "./achievement-announcer";

const mocks = vi.hoisted(() => ({
  values: [] as AchievementProgress[],
  play: vi.fn(),
  unlock: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("../hooks/use-math-achievements", () => ({ useMathAchievements: () => mocks.values }));
vi.mock("../hooks/use-profile-presentation", () => ({ useProfilePresentation: vi.fn() }));
vi.mock("../data/math-sound", () => ({
  createMathSound: () => ({ play: mocks.play, unlock: mocks.unlock, dispose: mocks.dispose }),
}));
afterEach(() => {
  vi.useRealTimers();
  mocks.values = [];
  vi.clearAllMocks();
});
it("celebra só o novo desbloqueio, toca a raridade e pausa a saída durante foco", () => {
  vi.useFakeTimers();
  const workspace = createInitialWorkspace();
  const props = { workspace, username: "", nameFallback: "Ana" };
  const { rerender, unmount } = render(<AchievementAnnouncer {...props} />);
  expect(screen.queryByLabelText("Nova conquista")).toBeNull();
  const item = GENERAL_ACHIEVEMENTS.find((item) => item.rarity === "rare")!;
  mocks.values = [{ ...item, value: item.target, earned: true, earnedAt: undefined }];
  rerender(<AchievementAnnouncer {...props} />);
  expect(screen.getByLabelText("Nova conquista").getAttribute("data-rarity")).toBe("rare");
  expect(mocks.play).toHaveBeenCalledWith("achievementRare");
  const close = screen.getByRole("button", { name: "Fechar conquista" });
  fireEvent.focus(close);
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByLabelText("Nova conquista")).toBeTruthy();
  fireEvent.blur(close, { relatedTarget: document.body });
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.queryByLabelText("Nova conquista")).toBeNull();
  rerender(<AchievementAnnouncer {...props} />);
  expect(screen.queryByLabelText("Nova conquista")).toBeNull();
  unmount();
  expect(mocks.dispose).toHaveBeenCalled();
});
