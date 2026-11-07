import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { createInitialWorkspace } from "../domain/workspace";
import { MathPracticeHero } from "./math-practice-hero";

vi.mock("./oliver-hero-art", () => ({ OliverHeroArt: () => <span data-testid="oliver" /> }));
vi.mock("../hooks/use-wall-clock", () => ({
  useWallClock: () => Date.parse("2026-11-07T12:00:00Z"),
}));

it("alterna por botão e teclado e abre a modalidade escolhida", () => {
  const math = vi.fn(),
    english = vi.fn();
  render(
    <MathPracticeHero
      workspace={createInitialWorkspace()}
      onPractice={math}
      onEnglishPractice={english}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Explorar Matemática" }));
  expect(math).toHaveBeenCalledOnce();
  const selector = screen.getByRole("button", { name: "Mostrar Inglês" });
  fireEvent.click(selector);
  expect(selector.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByAltText("Olena convida você a praticar Inglês").getAttribute("src")).toBe(
    "/languages/olena-english-widget.webp",
  );
  fireEvent.click(screen.getByRole("button", { name: "Explorar Inglês" }));
  expect(english).toHaveBeenCalledOnce();
  fireEvent.keyDown(selector, { key: "ArrowLeft" });
  expect(screen.getByRole("button", { name: "Explorar Matemática" })).toBeTruthy();
});

it("aceita gesto horizontal e preserva a rolagem vertical", () => {
  const { container } = render(
    <MathPracticeHero
      workspace={createInitialWorkspace()}
      onPractice={vi.fn()}
      onEnglishPractice={vi.fn()}
    />,
  );
  const carousel = container.querySelector(".math-hero-carousel")!;
  fireEvent.touchStart(carousel, { touches: [{ clientX: 240, clientY: 100 }] });
  fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 160, clientY: 250 }] });
  expect(screen.getByRole("button", { name: "Explorar Matemática" })).toBeTruthy();
  fireEvent.touchStart(carousel, { touches: [{ clientX: 240, clientY: 100 }] });
  fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 100, clientY: 105 }] });
  expect(screen.getByRole("button", { name: "Explorar Inglês" })).toBeTruthy();
  fireEvent.touchStart(carousel, { touches: [{ clientX: 100, clientY: 100 }] });
  fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 240, clientY: 105 }] });
  expect(screen.getByRole("button", { name: "Explorar Matemática" })).toBeTruthy();
});

it("usa somente recibos ingleses aceitos para a ofensiva e o aviso de expiração", () => {
  const workspace = createInitialWorkspace();
  workspace.practiceActivities = [
    {
      id: "valid",
      islandId: "english",
      islandName: "English",
      answers: 1,
      correct: 1,
      completedAt: "2026-11-06T12:30:00Z",
      englishAttempt: {
        curriculum: 4,
        area: "english",
        part: 0,
        mode: "practice",
        questions: [0],
        correctQuestions: [0],
      },
    },
    {
      id: "invalid",
      islandId: "english",
      islandName: "English",
      answers: 1,
      correct: 2,
      completedAt: "2026-11-07T11:59:00Z",
    },
  ];
  const { container } = render(
    <MathPracticeHero workspace={workspace} onPractice={vi.fn()} onEnglishPractice={vi.fn()} />,
  );
  expect(screen.getByRole("button", { name: "Explorar Matemática" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Mostrar Inglês" }));
  expect(screen.getByRole("heading", { name: "Seu inglês está ganhando ritmo!" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("30");
  expect(container.querySelector(".math-hero-streak img")?.getAttribute("src")).toBe(
    "/languages/english-streak-flame.svg",
  );
  expect(screen.getByRole("button", { name: "Continuar minha ofensiva" })).toBeTruthy();
});
