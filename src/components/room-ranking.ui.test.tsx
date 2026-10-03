import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Scoreboard, Podium } from "./local-room-projector";
import { playRoomVictorySound } from "../data/room-feedback-sound";
vi.mock("../data/room-feedback-sound", () => ({ playRoomVictorySound: vi.fn() }));
describe("ranking de papel da sala", () => {
  it("conta pontos, celebra uma vez e não reinicia com snapshots idênticos", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
    vi.mocked(playRoomVictorySound).mockClear();
    const player = { id: "a", displayName: "Ana", score: 100 };
    const view = render(<Podium participants={[player]} />);
    const digits = () =>
      view.container.querySelector(".room-podium-score .visually-hidden")?.textContent;
    try {
      act(() => frames.shift()!(0));
      expect(digits()).toBe("0");
      act(() => frames.shift()!(1020));
      expect(Number(digits())).toBeGreaterThan(0);
      expect(Number(digits())).toBeLessThan(100);
      view.rerender(<Podium participants={[{ ...player }]} />);
      act(() => frames.shift()!(2200));
      expect(digits()).toBe("100");
      expect(playRoomVictorySound).toHaveBeenCalledTimes(1);
      expect(
        view.container.querySelector(".room-podium-standard")?.getAttribute("data-complete"),
      ).toBe("true");
      view.rerender(<Podium participants={[{ ...player }]} />);
      expect(frames).toHaveLength(0);
      expect(playRoomVictorySound).toHaveBeenCalledTimes(1);
    } finally {
      view.unmount();
      vi.unstubAllGlobals();
    }
  });
  it("respeita movimento reduzido e cancela a contagem ao desmontar", () => {
    const frames: FrameRequestCallback[] = [];
    const cancel = vi.fn();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback);
        return 7;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", cancel);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    vi.mocked(playRoomVictorySound).mockClear();
    const view = render(<Podium participants={[{ id: "a", displayName: "Ana", score: 80 }]} />);
    try {
      act(() => frames.shift()!(0));
      expect(view.container.querySelector(".room-podium-score .visually-hidden")?.textContent).toBe(
        "80",
      );
      expect(playRoomVictorySound).not.toHaveBeenCalled();
      expect(frames).toHaveLength(0);
      view.unmount();
      expect(cancel).toHaveBeenCalledWith(7);
    } finally {
      view.unmount();
      vi.unstubAllGlobals();
    }
  });
  it("anima deslocamentos opostos quando duas pessoas trocam de posição", () => {
    const animate = vi.fn();
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
    const top = vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return Array.from(this.parentElement?.children ?? []).indexOf(this) * 64;
    });
    try {
      const first = { id: "a", displayName: "Ana", score: 20 };
      const second = { id: "b", displayName: "Bia", score: 10 };
      const view = render(<Scoreboard participants={[first, second]} />);
      view.rerender(<Scoreboard participants={[first, { ...second, score: 30 }]} />);
      expect(animate).toHaveBeenCalledTimes(2);
      expect(animate.mock.calls[0]?.[0][0].transform).toBe("translateY(64px)");
      expect(animate.mock.calls[1]?.[0][0].transform).toBe("translateY(-64px)");
      view.unmount();
    } finally {
      top.mockRestore();
      if (original) Object.defineProperty(HTMLElement.prototype, "animate", original);
      else Reflect.deleteProperty(HTMLElement.prototype, "animate");
    }
  });
  it("reordena por pontos e mostra feedback apenas da pergunta atual", () => {
    const players = [
      { id: "a", displayName: "Ana", score: 20, lastAnswer: { questionIndex: 0, correct: true } },
      { id: "b", displayName: "Bia", score: 10, lastAnswer: { questionIndex: 0, correct: false } },
    ];
    const view = render(<Scoreboard participants={players} questionIndex={0} />);
    expect(screen.getByText("Acertou")).toBeTruthy();
    expect(screen.getByText("Errou")).toBeTruthy();
    view.rerender(
      <Scoreboard participants={[players[0]!, { ...players[1]!, score: 30 }]} questionIndex={1} />,
    );
    expect(screen.getAllByRole("listitem")[0]?.textContent).toContain("Bia");
    expect(screen.queryByText("Acertou")).toBeNull();
    expect(screen.queryByText("Errou")).toBeNull();
  });
  it("preserva os três pódios e mostra todos no ranking ao lado", () => {
    const view = render(
      <Podium
        participants={Array.from({ length: 5 }, (_, i) => ({
          id: String(i),
          displayName: `Pessoa ${i}`,
          score: 50 - i,
        }))}
      />,
    );
    expect(view.container.querySelectorAll(".room-eclipse-banner")).toHaveLength(3);
    expect(
      screen.getByRole("region", { name: "Classificação final" }).querySelectorAll("li"),
    ).toHaveLength(5);
  });
});
