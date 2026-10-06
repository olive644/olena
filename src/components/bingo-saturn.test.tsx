import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingoSaturn } from "./bingo-saturn";
import { EXIT_JOURNEY_MS } from "./bingo-saturn-engine";

const renderer = vi.hoisted(() => ({
  setDrawn: vi.fn(),
  spin: vi.fn(),
  beginExit: vi.fn(),
  finishExit: vi.fn(),
  releaseBall: vi.fn(),
  burst: vi.fn(),
  dispose: vi.fn(),
}));
// A chegada ao fim do funil é do motor: aqui ela acontece ao fim da viagem (EXIT_JOURNEY_MS).
const END = { x: 200, y: 300, radius: 10, rotation: 90 };
const sound = vi.hoisted(() => ({
  mix: vi.fn(),
  pick: vi.fn(),
  exit: vi.fn(),
  reveal: vi.fn(),
  land: vi.fn(),
  stop: vi.fn(),
  unlock: vi.fn().mockResolvedValue(true),
  setMuted: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("./bingo-saturn-engine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./bingo-saturn-engine")>()),
  createApprovedSaturn: () => renderer,
}));
vi.mock("./bingo-saturn-sound", () => ({ createSaturnSound: () => sound }));

describe("server-driven Saturn animation", () => {
  const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");
  const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
  beforeEach(() => {
    vi.clearAllMocks();
    renderer.beginExit.mockImplementation((_n: number, onArrive: (end: typeof END) => void) => {
      setTimeout(() => onArrive(END), EXIT_JOURNEY_MS);
    });
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
    const onReveal = vi.fn();
    const view = render(<BingoSaturn {...props} drawn={["1"]} onReveal={onReveal} />);
    onReveal.mockClear();
    view.rerender(<BingoSaturn {...props} drawn={["1", "32"]} onReveal={onReveal} />);
    expect(screen.getByRole("list").children).toHaveLength(1);
    // Misturar e esperar o globo assentar; depois o motor leva a bolinha pelo funil.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1800);
    });
    expect(renderer.beginExit).toHaveBeenCalledWith(32, expect.any(Function));
    expect(sound.pick).toHaveBeenCalledOnce();
    expect(renderer.releaseBall).not.toHaveBeenCalled();
    // O número só é liberado para marcar na cartela quando a bolinha aparece.
    expect(onReveal).not.toHaveBeenCalledWith(["1", "32"]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EXIT_JOURNEY_MS + 20);
    });
    expect(renderer.releaseBall).toHaveBeenCalledOnce();
    expect(renderer.burst).toHaveBeenCalledOnce();
    expect(onReveal).toHaveBeenCalledWith(["1", "32"]);
    expect(sound.reveal).toHaveBeenCalledOnce();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole("list").children).toHaveLength(2);
    expect(screen.getByRole("listitem", { name: "N 32" })).toBeTruthy();
    expect(renderer.setDrawn).toHaveBeenLastCalledWith(["1", "32"]);
    expect(
      screen.getByRole("button", { name: "Sortear próxima bolinha" }).hasAttribute("disabled"),
    ).toBe(false);
    view.unmount();
  });
  it("cancelar no meio da viagem não larga a bolinha nem revela o número", async () => {
    const onReveal = vi.fn();
    const view = render(<BingoSaturn {...props} drawn={["1"]} onReveal={onReveal} />);
    view.rerender(<BingoSaturn {...props} drawn={["1", "32"]} onReveal={onReveal} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(renderer.beginExit).toHaveBeenCalled();
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(renderer.releaseBall).not.toHaveBeenCalled();
    expect(renderer.burst).not.toHaveBeenCalled();
    expect(onReveal).not.toHaveBeenCalledWith(["1", "32"]);
  });
  it("não reinicia a animação quando o pai renderiza de novo com o mesmo sorteio", async () => {
    const view = render(<BingoSaturn {...props} drawn={["1", "2"]} />);
    renderer.setDrawn.mockClear();
    view.rerender(<BingoSaturn {...props} drawn={["1", "2"]} />);
    expect(renderer.setDrawn).not.toHaveBeenCalled();
    view.unmount();
  });
  it("mostra o que já saiu ao entrar no meio do jogo e libera esses números na hora", () => {
    const onReveal = vi.fn();
    render(<BingoSaturn {...props} drawn={["4", "40", "70"]} onReveal={onReveal} />);
    expect(onReveal).toHaveBeenCalledWith(["4", "40", "70"]);
    expect(screen.getByRole("list").children).toHaveLength(3);
  });
});
