import { openNotebooksView } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

test("recarregar uma aba mantém a aba, e voltar retorna à anterior", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A navegação lateral só existe no desktop.");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  await openNotebooksView(page);
  await expect(page).toHaveURL(/\/cadernos$/);
  await page.reload();
  await expect(page).toHaveURL(/\/cadernos$/);
  await expect(page.locator(".notebook-display-shelf")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test("abrir o link direto de uma aba funciona", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/perfil");
  await expect(page.getByRole("region", { name: "Seu perfil", exact: true })).toBeVisible();
});
