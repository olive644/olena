import { expect, test } from "@playwright/test";

// No caderno vazio, a página da direita mostra "Criar primeira folha". O enfeite do bolso não pode
// parecer uma folha que não existe: é uma fita roxa de marcação, sem fundo de papel claro.
test("caderno vazio não mostra uma folha falsa, só a fita do bolso", async ({ page }, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await expect(
    page.getByRole("button", { name: "Criar primeira folha", exact: true }),
  ).toBeVisible();
  const ribbon = page.locator(".notebook-endpaper-card").first();
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
