import { expect, test } from "@playwright/test";
import { activateHandwritingPen, openHandwritingA4 } from "./notebook-helpers";

for (const theme of ["light", "dark"]) {
  test(`medidor da caneta liga pelas configurações e mostra números ao escrever: ${theme}`, async ({
    page,
  }, info) => {
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", appearance);
      localStorage.setItem(
        "helena.notebookPreferences.v1",
        JSON.stringify({ penDiagnostics: true }),
      );
    }, theme);
    await page.goto("/cadernos");
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    await page.locator(".notebook-spine").first().click();
    await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    await openHandwritingA4(page);
    await activateHandwritingPen(page);
    const meter = page.getByRole("complementary", { name: "Medidor da caneta" });
    await expect(meter).toBeVisible();
    await expect(meter.getByText("Escreva uma palavra para medir")).toBeVisible();
    if (info.project.name === "mobile") {
      // O desenho com o ponteiro só é verificado no desktop; no celular vale o painel visível.
      await page.screenshot({ path: info.outputPath(`medidor-${theme}.png`) });
      return;
    }
    const canvas = page.locator(".handwriting-canvas").first();
    const box = (await canvas.boundingBox())!;
    const x = Math.max(box.x, 0) + 80;
    const y = Math.max(box.y, 0) + 200;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 160, y + 40, { steps: 30 });
    await page.mouse.up();
    await expect(meter.getByText(/^Entrada: \d+ eventos\/s/)).toBeVisible();
    await expect(meter.getByText(/^Quadros: mediana/)).toBeVisible();
    await expect(meter.getByText(/^Folha: \d+ x \d+ px/)).toBeVisible();
    await page.screenshot({ path: info.outputPath(`medidor-${theme}.png`) });
  });
}
