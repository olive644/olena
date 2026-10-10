import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OliverCardCollection } from "./oliver-card-collection";
import { OLIVER_CARDS, isOliverCard } from "../data/oliver-cards";
import { OLIVER_TAROT } from "../data/oliver-tarot";

afterEach(cleanup);
it("allows special art inspection without claiming or adding it to common loot", () => {
  localStorage.clear();
  render(<OliverCardCollection onClose={() => undefined} />);
  expect(screen.getByText("0/10 descobertas · Todas comuns")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ver tarot do Oliver, A Estrela" }));
  expect(screen.getByRole("heading", { name: "A Estrela" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voltar à coleção" }));
  expect(screen.getByText("0/10 descobertas · Todas comuns")).toBeTruthy();
  expect(OLIVER_CARDS).toHaveLength(10);
  expect(isOliverCard(OLIVER_TAROT.id)).toBe(false);
});
