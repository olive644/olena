import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OliverCardInspection } from "./oliver-card-inspection";
afterEach(cleanup);
it("puts title above lore, rarity in the border and allows a full keyboard rotation", () => {
  render(<OliverCardInspection id="glass-seed" />);
  expect(screen.queryByText("Oliver · Comum")).toBeNull();
  expect(screen.getByLabelText("Raridade comum")).toBeTruthy();
  const title = screen.getByRole("heading", { name: "Semente de vidro" });
  expect(title.nextElementSibling?.className).toBe("oliver-card-lore");
  const card = screen.getByRole("button", { name: /Inspecionar carta em 360/ });
  for (let index = 0; index < 16; index++) fireEvent.keyDown(card, { key: "ArrowRight" });
  expect(document.querySelector<HTMLElement>(".oliver-inspection-turn")?.style.transform).toContain(
    "rotateY(400deg)",
  );
  fireEvent.click(screen.getByRole("button", { name: "Recentralizar carta" }));
  expect(document.querySelector<HTMLElement>(".oliver-inspection-turn")?.style.transform).toContain(
    "rotateY(0deg)",
  );
});
