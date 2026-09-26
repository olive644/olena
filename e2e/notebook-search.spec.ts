import { expect, test } from "@playwright/test";

test("buscar nos cadernos acha pelo título sem acento e abre o caderno", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Física do Ensino Médio");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();

  const search = page.getByRole("searchbox", { name: "Buscar nos cadernos" });
  await search.fill("fisica");
  await expect(page.getByText("1 resultado")).toBeVisible();
  await page
    .locator(".notebook-search")
    .getByRole("button", { name: /Física do Ensino Médio/ })
    .click();
  await expect(page.getByRole("heading", { name: "Física do Ensino Médio" })).toBeVisible();
});
