import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AchievementCollection } from "./math-achievements";
afterEach(cleanup);
it("inspeciona uma conquista rara em 3D pelo teclado sem alterar o desbloqueio", () => {
  render(<AchievementCollection ids={["islands-6"]} />);
  fireEvent.click(screen.getByRole("button", { name: /Cartógrafo do infinito 6/ }));
  const stage = screen.getByRole("button", { name: /Girar conquista/ });
  const turn = stage.querySelector<HTMLElement>(".oliver-inspection-turn")!;
  fireEvent.keyDown(stage, { key: "ArrowRight" });
  expect(turn.style.transform).toContain("25deg");
  fireEvent.keyDown(stage, { key: "Home" });
  expect(turn.style.transform).toContain("rotateY(0deg)");
  expect(document.querySelector(".achievement-inspection .is-rare.is-locked")).toBeNull();
});
it("exibe objetivos bloqueados e permite fechar a inspeção", () => {
  render(<AchievementCollection ids={[]} compact />);
  fireEvent.click(screen.getByRole("button", { name: "Ver todas as conquistas" }));
  fireEvent.click(screen.getByRole("button", { name: /Constelação de acertos 10\./ }));
  expect(screen.getByText("Acerte 10 contas nas ilhas de matemática.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fechar conquista" }));
  expect(screen.queryByRole("button", { name: /Girar conquista/ })).toBeNull();
});
it("mantém a prévia limitada às conquistas públicas recebidas", () => {
  render(<AchievementCollection ids={["correct-1"]} compact />);
  expect(document.querySelectorAll(".achievement-tile")).toHaveLength(3);
  expect(screen.getByRole("button", { name: /Constelação de acertos 1\./ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Cartógrafo/ })).toBeNull();
});
it("mostra data real e não oferece compartilhar objetivos bloqueados", () => {
  render(
    <AchievementCollection
      ids={["correct-1"]}
      dates={{ "correct-1": "2026-10-22T12:00:00Z" }}
      compact
      initialId="correct-1"
    />,
  );
  expect(document.querySelector("time")?.dateTime).toBe("2026-10-22T12:00:00Z");
  expect(screen.getByRole("button", { name: "Compartilhar conquista" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fechar conquista" }));
  fireEvent.click(screen.getByRole("button", { name: /Explorador das contas 1\./ }));
  expect(screen.queryByRole("button", { name: "Compartilhar conquista" })).toBeNull();
});
