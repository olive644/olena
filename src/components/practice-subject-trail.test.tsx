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
      expect(trail.stops.map((stop) => stop.topic)).toEqual([...island.topics]);
      const stages = screen.getAllByRole("button", { name: /^Etapa/ });
      expect(stages).toHaveLength(4);
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
        expect(document.querySelector(".practice-trail-detail")?.hasAttribute("hidden")).toBe(true);
        act(() => vi.advanceTimersByTime(850));
        expect(stage.classList.contains("is-arrived")).toBe(true);
        expect(document.querySelector(".practice-trail-detail")?.hasAttribute("hidden")).toBe(true);
        act(() => vi.advanceTimersByTime(260));
        expect(screen.getByRole("heading", { name: trail.stops[index]!.title })).toBeTruthy();
      }
      expect(screen.getByText("Exercícios em preparação")).toBeTruthy();
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
    expect(document.querySelector(".practice-trail-detail")?.hasAttribute("hidden")).toBe(true);
    act(() => vi.advanceTimersByTime(500));
    act(() => vi.advanceTimersByTime(260));
    expect(screen.getByRole("heading", { name: "Ponte da álgebra" })).toBeTruthy();
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
    expect(screen.getByRole("heading", { name: "Praça das formas" })).toBeTruthy();
    expect(document.querySelector(".is-moving")).toBeNull();
    vi.unstubAllGlobals();
  });
});
