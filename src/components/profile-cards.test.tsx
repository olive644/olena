import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProfileCards } from "./profile-cards";
import { MATH_PLACE_REWARDS_KEY } from "../data/math-place-rewards";
vi.mock("../data/arcana-catalog", async () => {
  const original =
    await vi.importActual<typeof import("../data/arcana-catalog")>("../data/arcana-catalog");
  const data = await import("../../public/arcana/catalog.json");
  return { ...original, useArcanaCatalog: () => ({ cards: data.default, error: false }) };
});
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
            cards: ["major-00", "major-01"],
            revealed: 2,
            revealedAt: [1792497600000, 1792497700000],
          },
          { id: "b", unlockAt: 0, opened: true, cards: ["cups-01", "cups-02"], revealed: 2 },
        ],
      },
    }),
  );
}
it("shows three highlights, native numerator and denominator, and no retired cards", () => {
  seed();
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ cardFavorites: ["first-star", "major-00", "major-21"] }),
  );
  render(<ProfileCards />);
  const region = screen.getByRole("region", { name: "Arcano" });
  expect(region.querySelectorAll(".profile-cards__featured .profile-cards__tile")).toHaveLength(3);
  expect(region.querySelectorAll(".profile-cards__count .paper-digits")).toHaveLength(2);
  expect(within(region).getByRole("button", { name: "Inspecionar carta O Louco" })).toBeTruthy();
  expect(screen.queryByText("A primeira estrela")).toBeNull();
});
it("inspects all categories but only owned cards can become favorites, with actual dates and 3D rotation", () => {
  seed();
  render(<ProfileCards />);
  fireEvent.click(screen.getByRole("button", { name: "Inspecionar carta O Louco" }));
  fireEvent.keyDown(screen.getByRole("button", { name: /Inspecionar carta em 360/ }), {
    key: "ArrowRight",
  });
  expect(document.querySelector<HTMLElement>(".oliver-inspection-turn")?.style.transform).toContain(
    "rotateY(25deg)",
  );
  expect(document.querySelector("time")?.dateTime).toBe(new Date(1792497600000).toISOString());
  fireEvent.click(screen.getByRole("button", { name: "Voltar à coleção" }));
  fireEvent.click(screen.getByRole("button", { name: "Arcano maior" }));
  expect(document.querySelectorAll(".profile-cards__gallery-item")).toHaveLength(22);
  fireEvent.click(screen.getByRole("button", { name: "Inspecionar carta A Estrela" }));
  expect(
    screen.getByRole("button", { name: "Destacar carta no perfil" }).hasAttribute("disabled"),
  ).toBe(true);
  expect(document.querySelector("time")).toBeNull();
});
it("enforces three earned favorites and persists replacement", () => {
  seed();
  render(<ProfileCards />);
  fireEvent.click(screen.getByRole("button", { name: "Ver todas as cartas" }));
  fireEvent.click(screen.getByRole("button", { name: "Inspecionar carta Dois de Copas" }));
  fireEvent.click(screen.getByRole("button", { name: "Destacar carta no perfil" }));
  expect(screen.getByRole("alert").textContent).toBe("Escolha no máximo três cartas favoritas.");
  fireEvent.click(screen.getByRole("button", { name: "Voltar à coleção" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Remover carta dos destaques" })[0]!);
  fireEvent.click(screen.getByRole("button", { name: "Inspecionar carta Dois de Copas" }));
  fireEvent.click(screen.getByRole("button", { name: "Destacar carta no perfil" }));
  expect(JSON.parse(localStorage.getItem("helena.profile.v1")!).cardFavorites).toEqual([
    "major-01",
    "cups-01",
    "cups-02",
  ]);
});
it("keeps only an earned legacy Star in its new design", () => {
  localStorage.setItem(
    MATH_PLACE_REWARDS_KEY,
    JSON.stringify({
      foundations: {
        points: 100,
        receipts: ["old"],
        chests: [
          {
            id: "old",
            opened: true,
            unlockAt: 0,
            kind: "arcane",
            arcana: "oliver-star-tarot",
            revealed: 1,
          },
        ],
      },
    }),
  );
  render(<ProfileCards />);
  expect(
    screen
      .getByRole("button", { name: "Inspecionar carta A Estrela" })
      .querySelector("img")
      ?.getAttribute("src"),
  ).toBe("/arcana/ink/major-17-small.webp");
});
