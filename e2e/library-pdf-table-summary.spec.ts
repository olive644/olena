import { expect, test } from "@playwright/test";
import { fixturePdf } from "../src/domain/pdf-summary/pdf-fixture.test-data";
import { statesOfMatter } from "../src/domain/pdf-summary/fixtures.test-data";

// A tabela de um PDF (texto alinhado em colunas) chega ao resumo como tabela, lida no navegador.
const pdf = Buffer.from(fixturePdf(statesOfMatter, { header: "Apostila de Química" }));

for (const theme of ["light", "dark"]) {
  test(`o resumo de um PDF traz a tabela dele: ${theme}`, async ({ page }, info) => {
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", appearance);
    }, theme);
    await page.goto("/cadernos");
    const dismiss = async () => {
      for (const name of ["Entendi", "Fechar conquista"]) {
        const button = page.getByRole("button", { name });
        while (await button.first().isVisible()) await button.first().click();
      }
    };
    await page.waitForTimeout(1200);
    await dismiss();
    await page.getByRole("button", { name: "Criar pasta", exact: true }).click();
    const create = page.getByRole("dialog", { name: "Nova pasta", exact: true });
    await create.getByLabel("Nome da pasta", { exact: true }).fill("quimica");
    await create.getByRole("button", { name: "Criar pasta", exact: true }).click();
    await page.waitForTimeout(800);
    await dismiss();
    await page
      .getByRole("button", { name: /quimica/ })
      .first()
      .click();

    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "estados.pdf", mimeType: "application/pdf", buffer: pdf });
    await page.getByRole("button", { name: "Resumo", exact: true }).click();
    await page.getByRole("button", { name: "Criar resumo", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("checkbox", { name: "Selecionar estados.pdf" }).click();
    await dialog.getByRole("button", { name: "Resumo automático", exact: true }).click();

    const card = page.locator(".library-summary-card").filter({ hasText: "estados.pdf" }).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.click();
    await page.waitForTimeout(1200);
    const table = page.locator(".library-summary-paper table").first();
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader")).toHaveText(["Estado", "Forma", "Volume"]);
    await expect(table.getByRole("cell", { name: "Do recipiente" }).first()).toBeVisible();
    await expect(table.locator("tbody tr")).toHaveCount(3);
    await table.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`tabela-pdf-${theme}.png`) });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
  });
}
