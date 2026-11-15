import { expect, test } from "@playwright/test";

// No caderno vazio, a página da direita mostra "Criar primeira folha". A esquerda não pode parecer uma folha que
// não existe.
test("caderno vazio não mostra uma folha falsa, só a guarda com a fita", async ({ page }, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  const achievement = page.getByRole("button", { name: "Fechar conquista" });
  while (await achievement.first().isVisible()) await achievement.first().click();
  await page.locator(".notebook-spine").first().click();
  while (await achievement.first().isVisible()) await achievement.first().click();
  await expect(
    page.getByRole("button", { name: "Criar primeira folha", exact: true }),
  ).toBeVisible();
  // A esquerda não mostra mais uma folha pautada de mentira: só a guarda com a fita roxa.
  await expect(page.locator(".notebook-spread-pair .notebook-empty-paper")).toHaveCount(0);
  const ribbon = page.locator(".notebook-endpaper-ribbon").first();
  await expect(ribbon).toBeAttached();
  await expect(ribbon).toHaveCSS("background-color", "rgb(167, 121, 239)");
  const box = await ribbon.boundingBox();
  expect(box).not.toBeNull();
  // Uma fita é bem mais alta que larga; uma folha seria mais larga que alta.
  expect(box!.height).toBeGreaterThan(box!.width);
  if (info.project.name === "desktop")
    await page
      .locator(".notebook-sheet.is-endpaper")
      .first()
      .screenshot({
        path: info.outputPath("endpaper.png"),
      });
});
