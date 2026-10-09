import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRACTICE_ISLANDS } from "../data/practice-islands";
import { SUBJECT_TRAILS } from "../data/practice-trails";
import { PracticeSubjectTrail } from "./practice-subject-trail";

afterEach(cleanup);

describe("trilhas exploráveis por disciplina", () => {
  for (const island of PRACTICE_ISLANDS) {
    if (island.id === "languages") continue;
    it(`apresenta quatro etapas próprias de ${island.subject}, sem inventar exercícios`, () => {
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
      if (island.id === "mathematics") expect(walkway).toBeNull();
      else {
        expect(walkway!.getAttribute("data-material")).toBe(island.id);
        expect(walkway!.querySelectorAll("g")).toHaveLength(24);
        expect(walkway!.querySelector(".solo-level-path__road")).toBeNull();
      }
      const portrait = screen.getByAltText("Sua foto no nível 1");
      for (const [index, stage] of stages.entries()) {
        fireEvent.click(stage);
        expect(stage.getAttribute("aria-pressed")).toBe("true");
        expect(screen.getByAltText(`Sua foto no nível ${index + 1}`)).toBe(portrait);
        expect(screen.getByRole("heading", { name: trail.stops[index]!.title })).toBeTruthy();
      }
      expect(screen.getByText("Exercícios em preparação")).toBeTruthy();
      expect(localStorage.getItem("helena.soloProgress")).toBe(before);
      fireEvent.click(screen.getByRole("button", { name: "Voltar aos mundos" }));
      expect(onBack).toHaveBeenCalledOnce();
    });
  }
});
