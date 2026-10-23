import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AchievementArt, AchievementCollection } from "./math-achievements";
import { MATH_ACHIEVEMENTS } from "../domain/math-achievements";
import { GENERAL_ACHIEVEMENTS } from "../domain/general-achievement-catalog";
afterEach(cleanup);
it.each(["bronze", "silver", "gold", "emerald"])(
  "arte própria e brilho %s respeitam nível, placa e bloqueio",
  (tier) => {
    const item = GENERAL_ACHIEVEMENTS.find((entry) => entry.id === `general-pomodoro-${tier}`)!;
    const { container, rerender } = render(<AchievementArt item={item} />);
    expect(container.querySelector(".math-achievement-art")?.getAttribute("data-tier")).toBe(tier);
    const path = `/achievement-badges/general/${item.id}.webp`;
    expect(container.querySelector("image")?.getAttribute("href")).toBe(path);
    expect(container.querySelector(".achievement-foil")?.getAttribute("style")).toContain(path);
    expect(container.querySelector(".achievement-paper-number use")?.getAttribute("y")).toBe("109");
    expect(container.querySelector('use[href*="paper-editor-icon"]')).toBeNull();
    rerender(<AchievementArt item={item} locked />);
    expect(container.querySelector(".achievement-foil")).toBeNull();
  },
);
it("preserva badge quadrada, dígitos originais na placa e brilho só nas raras obtidas", () => {
  const item = MATH_ACHIEVEMENTS.find((entry) => entry.id === "correct-2500")!;
  const { container, rerender } = render(<AchievementArt item={item} />);
  expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 160 160");
  expect(container.querySelector("image")?.getAttribute("href")).toBe(
    "/achievement-badges/math/correct-2500.webp",
  );
  const digits = [...container.querySelectorAll(".achievement-paper-number use")];
  expect(digits.map((digit) => digit.getAttribute("href"))).toEqual(
    [..."2500"].map((digit) => `/paper-digits.svg#digit-${digit}`),
  );
  expect(digits.every((digit) => digit.getAttribute("y") === "115")).toBe(true);
  expect(container.querySelector("text")).toBeNull();
  expect(container.querySelector(".achievement-foil")).not.toBeNull();
  rerender(<AchievementArt item={item} locked />);
  expect(container.querySelector(".achievement-foil")).toBeNull();
});
it("mostra uma rara estática sem controles de rotação ou alterar o desbloqueio", () => {
  render(<AchievementCollection ids={["islands-6"]} />);
  fireEvent.click(screen.getByRole("button", { name: /Cartógrafo do infinito 6/ }));
  expect(screen.queryByRole("button", { name: /Girar conquista/ })).toBeNull();
  expect(document.querySelector(".oliver-inspection-turn")).toBeNull();
  expect(document.querySelector(".achievement-static-art")).not.toBeNull();
  expect(document.querySelector(".achievement-inspection .is-rare.is-locked")).toBeNull();
});
it("exibe objetivos bloqueados e permite fechar a inspeção", () => {
  render(<AchievementCollection ids={[]} compact />);
  fireEvent.click(screen.getByRole("button", { name: "Ver todas as conquistas" }));
  fireEvent.click(screen.getByRole("button", { name: /Constelação de acertos 1\./ }));
  fireEvent.click(screen.getByRole("button", { name: "Ver etapa 10" }));
  expect(screen.getByText("Acerte 10 contas nas ilhas de matemática.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fechar conquista" }));
  expect(screen.queryByRole("button", { name: /Girar conquista/ })).toBeNull();
});
it("mantém a prévia limitada às conquistas públicas recebidas", () => {
  render(<AchievementCollection ids={["correct-1"]} compact />);
  expect(document.querySelectorAll(".achievement-tile")).toHaveLength(1);
  expect(document.querySelectorAll(".achievement-empty")).toHaveLength(0);
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
  fireEvent.click(screen.getByRole("button", { name: "Ver todas as conquistas" }));
  fireEvent.click(screen.getByRole("button", { name: /Explorador das contas 1\./ }));
  expect(screen.queryByRole("button", { name: "Compartilhar conquista" })).toBeNull();
});
it("separa categorias, agrupa níveis e remove os textos decorativos", () => {
  render(<AchievementCollection ids={[]} />);
  expect(document.querySelectorAll(".achievement-tile")).toHaveLength(17);
  expect(screen.queryByText("Cada descoberta tem sua história.")).toBeNull();
  expect(screen.queryByText("OlenaStudy")).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "Gerais" }));
  expect(document.querySelectorAll(".achievement-tile")).toHaveLength(20);
  expect(screen.getByRole("button", { name: /Horta do foco · Bronze/ })).toBeTruthy();
});
it("permite destacar uma conquista obtida e recusa a quarta favorita", () => {
  const change = vi.fn();
  const { rerender } = render(
    <AchievementCollection
      ids={["correct-1"]}
      favorites={[]}
      onFavoritesChange={change}
      compact
      initialId="correct-1"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Destacar no perfil" }));
  expect(change).toHaveBeenCalledWith(["correct-1"]);
  rerender(
    <AchievementCollection
      ids={["correct-1", "correct-10", "correct-50", "general-pomodoro-bronze"]}
      favorites={["correct-10", "correct-50", "general-pomodoro-bronze"]}
      onFavoritesChange={change}
      compact
      initialId="correct-1"
    />,
  );
  change.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Destacar no perfil" }));
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toContain("até três conquistas");
});
it("visita mostra só os destaques escolhidos, sem espaços vazios; o dono mantém os espaços", () => {
  const ids = ["correct-1", "correct-10", "general-pomodoro-bronze", "islands-1"];
  const favorites = ["general-pomodoro-bronze", "correct-10"];
  const { unmount } = render(
    <AchievementCollection ids={ids} favorites={favorites} ownerName="Ana" compact />,
  );
  const tiles = [...document.querySelectorAll(".achievement-tile")];
  expect(tiles).toHaveLength(2);
  expect(tiles[0]?.querySelector("image")?.getAttribute("href")).toContain(
    "general-pomodoro-bronze",
  );
  expect(document.querySelectorAll(".achievement-empty")).toHaveLength(0);
  unmount();
  render(
    <AchievementCollection ids={ids} favorites={favorites} onFavoritesChange={() => {}} compact />,
  );
  expect(document.querySelectorAll(".achievement-empty")).toHaveLength(1);
});
