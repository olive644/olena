import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { OliverCardCollection } from "./oliver-card-collection";
vi.mock("../data/arcana-catalog", async () => {
  const original =
    await vi.importActual<typeof import("../data/arcana-catalog")>("../data/arcana-catalog");
  const data = await import("../../public/arcana/catalog.json");
  return { ...original, useArcanaCatalog: () => ({ cards: data.default, error: false }) };
});
it("opens the same 78-card gallery from rewards without awarding unowned cards", () => {
  render(<OliverCardCollection onClose={vi.fn()} />);
  expect(screen.getByRole("dialog", { name: "Arcano" })).toBeTruthy();
  expect(document.querySelectorAll(".profile-cards__gallery-item")).toHaveLength(78);
  fireEvent.click(screen.getByRole("button", { name: "Inspecionar carta A Estrela" }));
  expect(
    screen.getByRole("button", { name: "Destacar carta no perfil" }).hasAttribute("disabled"),
  ).toBe(true);
});
