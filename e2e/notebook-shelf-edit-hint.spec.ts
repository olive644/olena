import { expect, test } from "@playwright/test";

// No modo de edição da prateleira, cada caderno ganha um lápis que pula acima dele, mostrando que
// dá para personalizar. Fora da edição os lápis somem; com "reduzir movimento" ficam parados.
test("lápis pulando acima de cada caderno no modo de edição da prateleira", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  for (let index = 0; index < 2; index += 1) {
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    const achievement = page.getByRole("button", { name: "Fechar conquista" });
    while (await achievement.first().isVisible()) await achievement.first().click();
    const back = page.getByRole("button", { name: "Meus Cadernos", exact: true });
    if (await back.isVisible()) await back.click();
  }
  const books = page.locator(".notebook-display-shelf .notebook-spine");
  await expect(books).toHaveCount(2);
  await expect(page.locator("[data-shelf-edit-hint]")).toHaveCount(0);

  await page.getByRole("button", { name: "Editar prateleira", exact: true }).click();
  const hints = page.locator("[data-shelf-edit-hint]");
  await expect(hints).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    const hint = (await hints.nth(index).boundingBox())!;
    const book = (await books.nth(index).boundingBox())!;
    expect(hint.y + hint.height).toBeLessThanOrEqual(book.y + 1);
    expect(Math.abs(hint.x + hint.width / 2 - (book.x + book.width / 2))).toBeLessThanOrEqual(2);
  }
  await expect(hints.first().locator("svg")).toHaveCSS("animation-name", "shelf-edit-hint-hop");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hints.first().locator("svg")).toHaveCSS("animation-name", "none");
});
