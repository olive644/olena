import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRACTICE_ISLANDS } from "../data/practice-islands";
import { SUBJECT_TRAILS } from "../data/practice-trails";
import { PracticeSubjectTrail } from "./practice-subject-trail";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("trilhas exploráveis por disciplina", () => {
  for (const island of PRACTICE_ISLANDS) {
    if (island.id === "languages") continue;
    it(`apresenta quatro etapas próprias de ${island.subject}, sem inventar exercícios`, () => {
      vi.useFakeTimers();
      const onBack = vi.fn();
      const before = localStorage.getItem("helena.soloProgress");
      render(
        <PracticeSubjectTrail
          island={island}
          profile={{ name: "Aluno", photoUrl: "/profile-avatars/oliver.webp" }}
          entering={false}
          onBack={onBack}
        />,
      );
      const trail = SUBJECT_TRAILS[island.id];
      expect(trail.points).toHaveLength(trail.stops.length);
      expect(
        trail.points.every((point, index) => index === 0 || point.y < trail.points[index - 1]!.y),
      ).toBe(true);
      if (island.id !== "mathematics")
        expect(trail.stops.map((stop) => stop.topic)).toEqual([...island.topics]);
      const stages = screen.getAllByRole("button", { name: /^Etapa/ });
      expect(stages).toHaveLength(island.id === "mathematics" ? 50 : 4);
      for (const [index, stage] of stages.entries()) {
        expect(
          stage.querySelector(".practice-trail-number-piece")?.getAttribute("data-piece"),
        ).toBe(island.id);
        expect(stage.querySelector(".solo-path-level__badge b")?.textContent).toBe(
          String(index + 1),
        );
        expect(stage.querySelectorAll(".number-piece-paper")).toHaveLength(
          island.id === "portuguese" ? 1 : 0,
        );
      }
      const walkway = screen
        .getByRole("region", { name: `Trilha de ${island.subject}` })
        .querySelector(".practice-trail-walkway");
      expect(walkway).toBeNull();
      const portrait = screen.getByAltText("Sua foto no nível 1");
      for (const [index, stage] of stages.entries()) {
        fireEvent.click(stage);
        expect(stage.getAttribute("aria-pressed")).toBe("true");
        expect(screen.getByAltText(`Sua foto no nível ${index + 1}`)).toBe(portrait);
        expect(screen.getByRole("status").textContent).toContain("Indo para a etapa");
        act(() => vi.advanceTimersByTime(850));
        expect(stage.classList.contains("is-arrived")).toBe(true);
        expect(screen.getByRole("status").textContent).toBe("");
        act(() => vi.advanceTimersByTime(260));
        expect(screen.getByRole("status").textContent).toContain(`Etapa ${index + 1} selecionada`);
      }
      expect(document.querySelector(".practice-trail-detail")).toBeNull();
      expect(
        screen.getByRole("heading", {
          name: island.id === "mathematics" ? "Matemática básica" : island.subject,
        }),
      ).toBeTruthy();
      expect(screen.queryByText(island.title)).toBeNull();
      expect(document.querySelector(".practice-trail-heading img")?.getAttribute("src")).toBe(
        "/paper-arrow.svg",
      );
      expect(localStorage.getItem("helena.soloProgress")).toBe(before);
      fireEvent.click(screen.getByRole("button", { name: "Voltar aos mundos" }));
      expect(onBack).toHaveBeenCalledOnce();
    });
  }

  it("cancela a chegada anterior em trocas rápidas e só abre o último destino", () => {
    vi.useFakeTimers();
    const island = PRACTICE_ISLANDS.find((item) => item.id === "mathematics")!;
    render(
      <PracticeSubjectTrail
        island={island}
        profile={{ name: "Aluno" }}
        entering={false}
        onBack={() => {}}
      />,
    );
    const stages = screen.getAllByRole("button", { name: /^Etapa/ });
    fireEvent.click(stages[3]!);
    act(() => vi.advanceTimersByTime(500));
    fireEvent.click(stages[1]!);
    expect(document.querySelector(".is-moving--down")).toBeTruthy();
    act(() => vi.advanceTimersByTime(350));
    expect(stages[3]!.classList.contains("is-arrived")).toBe(false);
    expect(screen.getByRole("status").textContent).toContain("Indo para a etapa 2");
    act(() => vi.advanceTimersByTime(500));
    act(() => vi.advanceTimersByTime(260));
    expect(screen.getByRole("status").textContent).toContain("Etapa 2 selecionada");
    expect(screen.getByAltText("Sua foto no nível 2")).toBeTruthy();
  });

  it("abre diretamente quando o sistema reduz movimento", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const island = PRACTICE_ISLANDS.find((item) => item.id === "mathematics")!;
    render(
      <PracticeSubjectTrail
        island={island}
        profile={{ name: "Aluno" }}
        entering={false}
        onBack={() => {}}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /^Etapa/ })[2]!);
    expect(screen.getByRole("status").textContent).toContain("Etapa 3 selecionada");
    expect(document.querySelector(".is-moving")).toBeNull();
    vi.unstubAllGlobals();
  });
  it("mantém Idiomas em tela cheia, bloqueia etapas futuras e abre o jogo após a chegada", () => {
    vi.useFakeTimers();
    const onOpenLevel = vi.fn();
    const island = PRACTICE_ISLANDS[0];
    render(
      <PracticeSubjectTrail
        island={island}
        profile={{ name: "Aluno" }}
        entering={false}
        onBack={() => {}}
        unlockedLevel={2}
        onOpenLevel={onOpenLevel}
      />,
    );
    const levels = screen.getAllByRole("button", { name: /^Nível/ });
    expect(screen.getByRole("region", { name: "Trilha de Idiomas" })).toBeTruthy();
    expect(levels[2]!.hasAttribute("disabled")).toBe(true);
    expect(levels[3]!.hasAttribute("disabled")).toBe(true);
    expect(screen.getByAltText("Sua foto no nível 2")).toBeTruthy();
    expect(onOpenLevel).not.toHaveBeenCalled();
    fireEvent.click(levels[0]!);
    act(() => vi.advanceTimersByTime(850));
    expect(onOpenLevel).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(260));
    expect(onOpenLevel).toHaveBeenCalledExactlyOnceWith(1);
    expect(document.querySelector(".practice-trail-detail")).toBeNull();
  });
});
