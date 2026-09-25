import { expect, test } from "@playwright/test";

test("recarregar uma aba mantém a aba, e voltar retorna à anterior", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name: "Cadernos", exact: true })
    .click();
  await expect(page).toHaveURL(/\/cadernos$/);
  await page.reload();
  await expect(page).toHaveURL(/\/cadernos$/);
  await expect(page.getByRole("heading", { name: /Cadernos/ }).first()).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test("abrir o link direto de uma aba funciona", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/perfil");
  await expect(page.getByText("Personalizar métodos de estudos")).toBeVisible();
});
