import { openHandwritingA4, openNotebooksView } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

// Formas profissionais: segurar acerta, continuar arrastando ajusta (ângulo, tamanho, giro) com selo
// na tela; e a paleta de cores fica à vista em qualquer ferramenta até a pessoa minimizar.
for (const theme of ["light", "dark"] as const) {
  test(`forma ajustável e paleta sempre à vista: ${theme}`, async ({ page }, testInfo) => {
    await page.addInitScript(() =>
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
    );
    await page.goto("/");
    await page.evaluate((value) => {
      document.documentElement.dataset["theme"] = value;
    }, theme);
    await openNotebooksView(page);
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    await page.locator(".notebook-spine").first().click();
    await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    await openHandwritingA4(page);
    const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
    const dock = dialog.locator(".handwriting-color-dock");

    // Sem abrir opção nenhuma e em várias ferramentas, a paleta está à vista.
    for (const tool of ["Caneta", "Borracha", "Selecionar traços"]) {
      await dialog.getByRole("button", { name: tool, exact: true }).click();
      await expect(dialog.getByRole("group", { name: "Cores rápidas", exact: true })).toBeVisible();
    }
    // Escolher cor com a borracha volta para a caneta.
    await dialog.getByRole("button", { name: "Borracha", exact: true }).click();
    await dialog
      .getByRole("group", { name: "Cores rápidas", exact: true })
      .getByRole("button", { name: "Tinta Rosa", exact: true })
      .click();
    await expect(dialog.getByRole("button", { name: "Caneta", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.screenshot({ path: testInfo.outputPath(`paleta-${theme}.png`) });

    // No celular o seletor de papel abre aberto e cobre a folha: fecha para desenhar.
    const paperPicker = dialog.getByRole("button", { name: "Tipo de papel", exact: true });
    if ((await paperPicker.getAttribute("aria-expanded")) === "true") await paperPicker.click();
    // Reta: segura, arrasta e o selo mostra o ângulo encaixado.
    const sheet = dialog.locator(".handwriting-committed-ink");
    await sheet.scrollIntoViewIfNeeded();
    const box = (await sheet.boundingBox())!;
    const view = (await dialog.locator(".handwriting-viewport").boundingBox())!;
    const top = Math.max(box.y, view.y);
    const bottom = Math.min(box.y + box.height, view.y + view.height);
    const x0 =
      Math.max(box.x, view.x) +
      (Math.min(box.x + box.width, view.x + view.width) - Math.max(box.x, view.x)) * 0.35;
    const y0 = top + (bottom - top) * 0.3;
    const badge = dialog.locator(".handwriting-shape-badge");
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    for (let step = 1; step <= 24; step += 1) {
      await page.mouse.move(x0 + step * 8, y0 + step * 0.4);
      await page.waitForTimeout(5);
    }
    await page.waitForTimeout(900);
    await expect(badge).toContainText("Reta");
    // Arrasta para ~30 graus: ímã em 30°.
    await page.mouse.move(x0 + 200, y0 + 200 * Math.tan(0.5236) + 1, { steps: 6 });
    await expect(badge).toContainText("30°");
    await page.screenshot({ path: testInfo.outputPath(`reta-${theme}.png`) });
    await page.mouse.up();
    await expect(badge).toHaveText("");

    // Minimizar tira a paleta; abrir o estojo traz de volta; a escolha é lembrada.
    await dialog.getByRole("button", { name: "Minimizar paleta de cores" }).click();
    await expect(dialog.getByRole("group", { name: "Cores rápidas", exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Borracha", exact: true }).click();
    await expect(dialog.getByRole("group", { name: "Cores rápidas", exact: true })).toHaveCount(0);
    await expect(dock).toBeVisible();
    await dialog.getByRole("button", { name: "Abrir estojo de cores" }).click();
    await expect(dialog.getByRole("group", { name: "Cores rápidas", exact: true })).toBeVisible();
  });
}
