import { expect, test } from "@playwright/test";

test("escreve, ajusta e salva uma folha manuscrita", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  }
  await page.getByRole("button", { name: /novo caderno/i }).click();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByRole("button", { name: "Escrever à mão" }).click();

  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Caneta" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(dialog.getByRole("button", { name: "Pautado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "Quadriculado" }).click();
  await expect(dialog.getByRole("button", { name: "Quadriculado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "Aumentar zoom" }).click();
  await expect(dialog.getByRole("button", { name: "115%" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("estudio-manuscrito.png") });

  const canvas = dialog.locator("canvas.handwriting-canvas");
  const bounds = await canvas.boundingBox();
  const viewport = await dialog.locator(".handwriting-viewport").boundingBox();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!bounds || !viewport) return;
  expect(viewport.x).toBeGreaterThanOrEqual(0);
  expect(viewport.x + viewport.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const startX = Math.max(bounds.x, viewport.x) + 40;
  const startY = Math.max(bounds.y, viewport.y) + 40;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 100, startY + 7, { steps: 10 });
  await page.mouse.up();
  await expect(dialog.getByRole("button", { name: "Desfazer" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Desfazer" }).click();
  await expect(dialog.getByRole("button", { name: "Refazer" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Refazer" }).click();
  await dialog.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("img", { name: /folha manuscrita/i })).toBeVisible();
});
