import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProfileCards } from "./profile-cards";
import { MATH_PLACE_REWARDS_KEY } from "../data/math-place-rewards";

function seed() {
  localStorage.setItem(
    MATH_PLACE_REWARDS_KEY,
    JSON.stringify({
      foundations: {
        points: 200,
        receipts: ["a", "b"],
        chests: [
          {
            id: "a",
            unlockAt: 0,
            opened: true,
            cards: ["first-star", "silent-bell"],
            revealed: 2,
            revealedAt: [1792497600000, 1792497700000],
          },
          { id: "b", unlockAt: 0, opened: true, cards: ["chalk-map", "glass-seed"], revealed: 2 },
        ],
      },
    }),
  );
}
it("shows three compact highlights and never treats an unowned card as a favorite", () => {
  seed();
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ cardFavorites: ["first-star", "homeward"] }),
  );
  render(<ProfileCards />);
  const region = screen.getByRole("region", { name: "Cartas do Oliver" });
  expect(region.querySelectorAll(".profile-cards__featured button")).toHaveLength(3);
  expect(
    within(region).getByRole("button", { name: "Inspecionar carta A primeira estrela" }),
  ).toBeTruthy();
  expect(
    within(region).queryByRole("button", { name: "Inspecionar carta Caminho de volta" }),
  ).toBeNull();
});
it("allows inspecting earned cards with original 3D controls and an actual acquisition date", () => {
  seed();
  render(<ProfileCards />);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Inspecionar carta A primeira estrela" }).at(-1)!,
  );
  const stage = screen.getByRole("button", { name: /Inspecionar carta em 360/ });
  fireEvent.keyDown(stage, { key: "ArrowRight" });
  expect(document.querySelector<HTMLElement>(".oliver-inspection-turn")?.style.transform).toContain(
    "rotateY(25deg)",
  );
  expect(document.querySelector("time")?.getAttribute("datetime")).toBe(
    new Date(1792497600000).toISOString(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  fireEvent.click(screen.getByRole("button", { name: "Inspecionar carta Mapa de giz" }));
  expect(screen.getByText("Data não registrada")).toBeTruthy();
  expect(document.querySelector("time")).toBeNull();
});
it("limits favorites to three and allows replacing them", () => {
  seed();
  render(<ProfileCards />);
  fireEvent.click(screen.getByRole("button", { name: "Ver todas as cartas" }));
  fireEvent.click(screen.getByRole("button", { name: "Inspecionar carta Semente de vidro" }));
  fireEvent.click(screen.getByRole("button", { name: "Destacar carta no perfil" }));
  expect(screen.getByRole("alert").textContent).toBe("Escolha no máximo três cartas favoritas.");
  fireEvent.click(screen.getByRole("button", { name: "Voltar à coleção" }));
  fireEvent.click(
    screen.getAllByRole("button", { name: "Inspecionar carta A primeira estrela" }).at(-1)!,
  );
  fireEvent.click(screen.getByRole("button", { name: "Remover carta dos destaques" }));
  expect(JSON.parse(localStorage.getItem("helena.profile.v1")!).cardFavorites).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Voltar à coleção" }));
  fireEvent.click(screen.getByRole("button", { name: "Inspecionar carta Semente de vidro" }));
  fireEvent.click(screen.getByRole("button", { name: "Destacar carta no perfil" }));
  expect(JSON.parse(localStorage.getItem("helena.profile.v1")!).cardFavorites).toEqual([
    "silent-bell",
    "chalk-map",
    "glass-seed",
  ]);
});
it("does not expose unrevealed loot or assign an acquisition date to old collections", () => {
  localStorage.setItem(
    MATH_PLACE_REWARDS_KEY,
    JSON.stringify({
      foundations: {
        points: 100,
        receipts: ["a"],
        chests: [{ id: "a", opened: true, unlockAt: 0, cards: ["homeward"], revealed: 0 }],
      },
    }),
  );
  render(<ProfileCards />);
  expect(document.querySelectorAll(".profile-cards__featured img[src*='homeward']")).toHaveLength(
    0,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ver todas as cartas" }));
  expect(
    screen
      .getByRole("button", { name: "Inspecionar carta Caminho de volta" })
      .hasAttribute("disabled"),
  ).toBe(true);
});
