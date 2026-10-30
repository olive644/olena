import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AchievementCollection } from "./math-achievements";
const audio = vi.hoisted(() => ({ unlock: vi.fn(), play: vi.fn(), dispose: vi.fn() }));
vi.mock("../data/math-sound", () => ({ createMathSound: () => audio }));
it("usa o som raro e brilhos na inspeção obtida sem rotação ou verso, preserva bloqueadas sem celebração", () => {
  const { unmount } = render(<AchievementCollection ids={["islands-6"]} />);
  fireEvent.click(screen.getByRole("button", { name: /Cartógrafo do infinito 6/ }));
  expect(audio.unlock).toHaveBeenCalled();
  expect(audio.play).toHaveBeenLastCalledWith("achievementRare");
  expect(
    document.querySelector('.achievement-static-art .arcana-radiance[data-rarity="3"]'),
  ).not.toBeNull();
  expect(document.querySelector(".oliver-inspection-turn")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Fechar conquista" }));
  audio.play.mockClear();
  fireEvent.click(screen.getByRole("button", { name: /Constelação de acertos 1\./ }));
  expect(audio.play).not.toHaveBeenCalled();
  expect(document.querySelector(".achievement-static-art .arcana-radiance")).toBeNull();
  unmount();
  expect(audio.dispose).toHaveBeenCalled();
});
