import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomAnswerHelena, RoomSpeedNotice } from "./room-answer-helena";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Helena nos resultados", () => {
  it("usa versões distintas e acessíveis para acerto e erro", () => {
    const { rerender } = render(<RoomAnswerHelena correct />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("correto");
    expect(screen.getByRole("img").className).toContain("is-correct");
    rerender(<RoomAnswerHelena correct={false} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("triste");
    expect(screen.getByRole("img").className).toContain("is-wrong");
  });

  it.each([
    [95, "MUITO RÁPIDO!"],
    [65, "BOM RITMO!"],
    [45, "BOA RESPOSTA!"],
    [25, "MUITO DEVAGAR"],
  ])("mostra o aviso correspondente a %i pontos e remove em 1,2 segundo", (points, label) => {
    vi.useFakeTimers();
    render(<RoomSpeedNotice points={Number(points)} />);
    expect(screen.queryByText(label)).not.toBeNull();
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.queryByText(label)).toBeNull();
  });

  it("atualizações da sala não reiniciam o prazo", () => {
    vi.useFakeTimers();
    const { rerender } = render(<RoomSpeedNotice points={95} />);
    act(() => vi.advanceTimersByTime(800));
    rerender(<RoomSpeedNotice points={95} />);
    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByText("MUITO RÁPIDO!")).toBeNull();
  });

  it("uma nova pergunta pode mostrar um novo aviso e desmontar limpa o timer", () => {
    vi.useFakeTimers();
    const { rerender, unmount } = render(<RoomSpeedNotice key="1" points={95} />);
    act(() => vi.advanceTimersByTime(1200));
    rerender(<RoomSpeedNotice key="2" points={65} />);
    expect(screen.queryByText("BOM RITMO!")).not.toBeNull();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
