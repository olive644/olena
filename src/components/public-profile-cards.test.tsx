import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { PublicProfileCards } from "./public-profile-cards";
vi.mock("../data/arcana-catalog", async () => {
  const original =
    await vi.importActual<typeof import("../data/arcana-catalog")>("../data/arcana-catalog");
  const cards = await import("../../public/arcana/catalog.json");
  return {
    ...original,
    useArcanaCatalog: () => ({ cards: cards.default, error: false, retry: vi.fn() }),
  };
});
it("exibe somente as cartas públicas obtidas, com data pública e sem controles de edição", () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ cardFavorites: ["major-01"] }));
  render(
    <PublicProfileCards
      person={{
        cards: ["major-17"],
        cardFavorites: ["major-17", "major-01"],
        cardDates: { "major-17": "2026-10-29T15:30:00Z" },
      }}
    />,
  );
  expect(screen.queryByRole("button", { name: "Inspecionar carta O Mago" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Inspecionar carta A Estrela" }));
  expect(document.querySelector("time")?.dateTime).toBe("2026-10-29T15:30:00.000Z");
  expect(screen.queryByRole("button", { name: "Destacar carta no perfil" })).toBeNull();
});
it("não substitui a remoção explícita por sugestões ou pela coleção local", () => {
  render(<PublicProfileCards person={{ cards: ["major-17"], cardFavorites: [] }} />);
  expect(screen.queryByRole("region", { name: "Cartas destacadas" })).toBeNull();
});
