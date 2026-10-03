import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Scoreboard, Podium } from "./local-room-projector";
describe("ranking de papel da sala", () => {
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
