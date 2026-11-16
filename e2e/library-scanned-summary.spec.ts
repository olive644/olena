import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// PDF escaneado (só imagem): o resumo automático lê as páginas com OCR em português, no aparelho,
// usando o idioma servido pelo próprio domínio (sem CDN) e sem chamar a Olena.
const scanned = readFileSync(new URL("./fixtures/escaneado-fotossintese.pdf", import.meta.url));

for (const theme of ["light", "dark"]) {
  test(`resume um PDF escaneado com OCR em português: ${theme}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", appearance);
    }, theme);
    const external: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol.startsWith("http")) {
        external.push(request.url());
      }
      if (/\/api\/helena/.test(request.url())) external.push(request.url());
    });
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
    await create.getByLabel("Nome da pasta", { exact: true }).fill("biologia");
    await create.getByRole("button", { name: "Criar pasta", exact: true }).click();
    await page.waitForTimeout(800);
    await dismiss();
    await page
      .getByRole("button", { name: /biologia/ })
      .first()
      .click();

    await page.locator('input[type="file"]').setInputFiles({
      name: "escaneado.pdf",
      mimeType: "application/pdf",
      buffer: scanned,
    });
    await page.getByRole("button", { name: "Resumo", exact: true }).click();
    await page.getByRole("button", { name: "Criar resumo", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("checkbox", { name: "Selecionar escaneado.pdf" }).click();
    await dialog.getByRole("button", { name: "Resumo automático", exact: true }).click();

    const card = page.locator(".library-summary-card").filter({ hasText: "escaneado.pdf" }).first();
    await expect(card).toBeVisible({ timeout: 90_000 });
    await card.click();
    await page.waitForTimeout(1200);
    const paper = page.locator(".library-summary-paper");
    await expect(paper).toContainText(/fotoss[ií]ntese/i);
    await expect(paper).toContainText(/clorofila|glicose|oxig[eê]nio/i);
    await page.screenshot({ path: info.outputPath(`escaneado-${theme}.png`) });

    expect(external).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
  });
}
