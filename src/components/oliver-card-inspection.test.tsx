import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { OliverCardInspection } from "./oliver-card-inspection";
vi.mock("../data/arcana-catalog", async () => {
  const original =
    await vi.importActual<typeof import("../data/arcana-catalog")>("../data/arcana-catalog");
  const data = await import("../../public/arcana/catalog.json");
  return { ...original, useArcanaCatalog: () => ({ cards: data.default, error: false }) };
});
it("uses the new tarot frame and back with full keyboard rotation and no combat stats", () => {
  render(<OliverCardInspection id="major-17" />);
  expect(screen.queryByText("Stamina")).toBeNull();
  expect(screen.getByAltText("A Estrela").getAttribute("src")).toContain(
    "/arcana/ink/major-17.webp",
  );
  const stage = screen.getByRole("button", { name: /Inspecionar carta em 360/ });
  for (let n = 0; n < 16; n++) fireEvent.keyDown(stage, { key: "ArrowRight" });
  expect(document.querySelector<HTMLElement>(".oliver-inspection-turn")?.style.transform).toContain(
    "rotateY(400deg)",
  );
  fireEvent.click(screen.getByRole("button", { name: "Recentralizar carta" }));
  expect(document.querySelector<HTMLElement>(".oliver-inspection-turn")?.style.transform).toContain(
    "rotateY(0deg)",
  );
  expect(screen.getByLabelText("Verso das cartas de arcano Olena")).toBeTruthy();
});
