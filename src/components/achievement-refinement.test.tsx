import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AchievementCollection, AchievementArt } from "./math-achievements";
import { GENERAL_ACHIEVEMENTS } from "../domain/general-achievement-catalog";

it("usa categorias só com ícones e remove a instrução redundante dos destaques", () => {
  render(<AchievementCollection ids={[]} onFavoritesChange={vi.fn()} />);
  expect(screen.queryByText("Escolha até três conquistas conquistadas.")).toBeNull();
  for (const name of ["Matemática", "Gerais"]) {
    const tab = screen.getByRole("tab", { name });
    expect(tab.textContent).toBe("");
    expect(tab.querySelector("img")).not.toBeNull();
  }
});
it("mantém a miniatura disponível enquanto carrega a arte de inspeção", () => {
  const item = GENERAL_ACHIEVEMENTS[0]!;
  const { container } = render(<AchievementArt item={item} />);
  expect(container.querySelector("image[data-achievement-preview]")?.getAttribute("href")).toBe(
    `/achievement-badges/general/thumb/${item.id}.webp`,
  );
  expect(container.querySelectorAll("image")).toHaveLength(2);
});
