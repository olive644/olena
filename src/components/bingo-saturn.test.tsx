import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingoSaturn } from "./bingo-saturn";

const renderer = vi.hoisted(() => ({
  setDrawn: vi.fn(),
  spin: vi.fn(),
  beginExit: vi.fn(),
  finishExit: vi.fn(),
  releaseBall: vi.fn(),
  dispose: vi.fn(),
  outlet: vi.fn(() => ({ x: 200, y: 260, radius: 100, rampX: 112, rampY: 45 })),
}));
const sound = vi.hoisted(() => ({
  mix: vi.fn(),
  exit: vi.fn(),
  reveal: vi.fn(),
  land: vi.fn(),
  stop: vi.fn(),
  unlock: vi.fn().mockResolvedValue(true),
  setMuted: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("./bingo-saturn-engine", () => ({ createApprovedSaturn: () => renderer }));
vi.mock("./bingo-saturn-sound", () => ({ createSaturnSound: () => sound }));

describe("server-driven Saturn animation", () => {
  const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");
  const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({
        finished: Promise.resolve(),
        cancel: vi.fn(),
      })),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalAnimate) Object.defineProperty(HTMLElement.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(HTMLElement.prototype, "animate");
    if (originalScroll)
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScroll);
    else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  });
  const props = { isHost: true, pending: false, onDraw: vi.fn().mockResolvedValue(undefined) };
  it("keeps the same number and history with reduced motion without flying animations", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    const view = render(<BingoSaturn {...props} drawn={["1"]} />);
    view.rerender(<BingoSaturn {...props} drawn={["1", "75"]} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByRole("listitem", { name: "O 75" })).toBeTruthy();
    expect(renderer.setDrawn).toHaveBeenLastCalledWith(["1", "75"]);
    expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
    view.unmount();
  });

  it("does not replay old draws when connecting and removes cancelled work on exit", async () => {
    const view = render(<BingoSaturn {...props} drawn={["1", "2"]} />);
    expect(renderer.setDrawn).toHaveBeenCalledWith(["1", "2"]);
    expect(renderer.beginExit).not.toHaveBeenCalled();
    expect(renderer.spin).not.toHaveBeenCalledWith(true);
    view.rerender(<BingoSaturn {...props} drawn={["1", "2", "3"]} />);
    expect(renderer.spin).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Girando…" }).hasAttribute("disabled")).toBe(true);
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(renderer.beginExit).not.toHaveBeenCalled();
    expect(sound.dispose).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("animates the exact server number through gate, reveal and history, never a local draw", async () => {
    const view = render(<BingoSaturn {...props} drawn={["1"]} />);
    view.rerender(<BingoSaturn {...props} drawn={["1", "32"]} />);
    expect(screen.getByRole("list").children).toHaveLength(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3140);
    });
    expect(renderer.beginExit).toHaveBeenCalledWith(32);
    expect(renderer.releaseBall).toHaveBeenCalledOnce();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1440);
    });
    expect(screen.getByRole("list").children).toHaveLength(2);
    expect(screen.getByRole("listitem", { name: "N 32" })).toBeTruthy();
    expect(renderer.setDrawn).toHaveBeenLastCalledWith(["1", "32"]);
    expect(
      screen.getByRole("button", { name: "Sortear próxima bolinha" }).hasAttribute("disabled"),
    ).toBe(false);
    view.unmount();
  });
});
