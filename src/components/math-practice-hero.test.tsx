import { act, fireEvent, render, screen } from "@testing-library/react";
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
  expect(screen.queryByText("Uma nova conversa começa aqui.")).toBeNull();
  expect(screen.queryByText("A próxima descoberta é sua.")).toBeNull();
  expect(screen.getByAltText("Olena convida você a praticar Inglês").getAttribute("src")).toBe(
    "/languages/olena-english-widget.webp?v=2",
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
        curriculum: 4 as const,
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
  expect(screen.getByRole("button", { name: "Mostrar Inglês" }).getAttribute("aria-pressed")).toBe(
    "true",
  );
  expect(screen.getByRole("heading", { name: "Seu inglês está ganhando ritmo!" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("30");
  expect(container.querySelector(".math-hero-streak img")?.getAttribute("src")).toBe(
    "/languages/english-streak-flame.svg",
  );
  expect(screen.getByRole("button", { name: "Continuar minha ofensiva" })).toBeTruthy();
});

it("prepara a arte em baixa prioridade e reaproveita a preparação ao focar o seletor", () => {
  vi.useFakeTimers();
  const created: { src: string; fetchPriority: string }[] = [];
  const decode = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      fetchPriority = "";
      decoding = "";
      decode = decode;
      constructor() {
        created.push(this);
      }
    },
  );
  try {
    render(
      <MathPracticeHero
        workspace={createInitialWorkspace()}
        onPractice={vi.fn()}
        onEnglishPractice={vi.fn()}
      />,
    );
    act(() => vi.advanceTimersByTime(1500));
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      src: "/languages/olena-english-widget.webp?v=2",
      fetchPriority: "low",
    });
    fireEvent.focus(screen.getByRole("button", { name: "Mostrar Inglês" }));
    expect(created).toHaveLength(1);
    expect(decode).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});

it("com economia de dados só prepara a imagem quando há intenção no seletor", () => {
  vi.useFakeTimers();
  const previous = Object.getOwnPropertyDescriptor(navigator, "connection");
  Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } });
  const created = vi.fn();
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decoding = "";
      fetchPriority = "";
      decode = vi.fn().mockResolvedValue(undefined);
      constructor() {
        created();
      }
    },
  );
  try {
    render(
      <MathPracticeHero
        workspace={createInitialWorkspace()}
        onPractice={vi.fn()}
        onEnglishPractice={vi.fn()}
      />,
    );
    act(() => vi.advanceTimersByTime(2000));
    expect(created).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByRole("button", { name: "Mostrar Inglês" }));
    expect(created).toHaveBeenCalledOnce();
  } finally {
    if (previous) Object.defineProperty(navigator, "connection", previous);
    else Reflect.deleteProperty(navigator, "connection");
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});

it("mantém a escolha manual mesmo quando o histórico passa a recomendar Inglês", () => {
  const workspace = createInitialWorkspace();
  const props = { onPractice: vi.fn(), onEnglishPractice: vi.fn() };
  const view = render(<MathPracticeHero workspace={workspace} {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Mostrar Matemática" }));
  const updated = {
    ...workspace,
    practiceActivities: [
      {
        id: "english-priority",
        islandId: "english",
        islandName: "English",
        answers: 1,
        correct: 1,
        completedAt: "2026-11-07T11:00:00Z",
        englishAttempt: {
          curriculum: 4 as const,
          area: "english" as const,
          part: 0,
          mode: "practice" as const,
          questions: [0],
          correctQuestions: [0],
        },
      },
    ],
  };
  view.rerender(<MathPracticeHero workspace={updated} {...props} />);
  expect(
    screen.getByRole("button", { name: "Mostrar Matemática" }).getAttribute("aria-pressed"),
  ).toBe("true");
});
