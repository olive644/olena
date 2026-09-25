import { expect, test } from "@playwright/test";

test("exportar PDF permanece disponível dentro da folha", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo de desenho verificado no desktop.");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    // A impressão real abriria o diálogo do sistema; o teste só precisa saber que chegou lá.
    window.addEventListener("beforeprint", () => undefined);
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name: "Cadernos", exact: true })
    .click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Caderno de teste");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  const canvas = dialog.locator(".handwriting-viewport canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + 80);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(
      box.x + box.width * 0.2 + step * 12,
      box.y + 80 + Math.sin(step / 3) * 20,
    );
    await page.waitForTimeout(8);
  }
  await page.mouse.up();
  await dialog.getByRole("button", { name: "Compartilhar", exact: true }).click();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Baixar PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("folha-do-caderno.pdf");
  await expect(page.getByRole("button", { name: "Exportar PDF" })).toHaveCount(0);
});
