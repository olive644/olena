import { openHandwritingA4, activateHandwritingPen } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

// Conta quantos vãos (trechos sem tinta) existem ao longo de uma linha horizontal da folha.
async function gapsAlong(
  sheet: ReturnType<import("@playwright/test").Page["locator"]>,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  return sheet.evaluate(
    (element, args) => {
      const canvas = element as HTMLCanvasElement;
      const bounds = canvas.getBoundingClientRect();
      const scaleX = canvas.width / bounds.width;
      const scaleY = canvas.height / bounds.height;
      const y = Math.round((args.from.y - bounds.top) * scaleY);
      const x0 = Math.round((args.from.x - bounds.left) * scaleX);
      const x1 = Math.round((args.to.x - bounds.left) * scaleX);
      const { data } = canvas.getContext("2d")!.getImageData(x0, y - 3, x1 - x0, 7);
      const width = x1 - x0;
      let gaps = 0;
      let inGap = false;
      let started = false;
      for (let x = 0; x < width; x += 1) {
        let ink = false;
        for (let row = 0; row < 7; row += 1) {
          const i = (row * width + x) * 4;
          if (data[i]! < 110 && data[i + 1]! < 110 && data[i + 2]! < 120) ink = true;
        }
        if (ink) {
          if (started && inGap) gaps += 1;
          started = true;
          inGap = false;
        } else if (started) inGap = true;
      }
      return gaps;
    },
    { from, to },
  );
}

test("linha tracejada e pontilhada desenham vãos na folha, e a contínua não", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo de desenho verificado no desktop.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name: "Cadernos", exact: true })
    .click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await activateHandwritingPen(page);
  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  await sheet.scrollIntoViewIfNeeded();
  // A folha é maior que a janela: as linhas ficam só na parte visível.
  const box = (await sheet.boundingBox())!;
  const view = (await dialog.locator(".handwriting-viewport").boundingBox())!;
  const top = Math.max(box.y, view.y) + 20;
  const bottom = Math.min(box.y + box.height, view.y + view.height) - 20;
  const x0 = box.x + box.width * 0.2;
  const x1 = box.x + box.width * 0.8;

  async function drawLine(style: string, fraction: number) {
    await dialog.getByRole("button", { name: style, exact: true }).click();
    const y = top + (bottom - top) * fraction;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    for (let step = 1; step <= 60; step += 1) {
      await page.mouse.move(x0 + ((x1 - x0) * step) / 60, y);
      await page.waitForTimeout(6);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
    return y;
  }

  const solidY = await drawLine("Linha contínua", 0.1);
  const dashedY = await drawLine("Linha tracejada", 0.5);
  const dottedY = await drawLine("Linha pontilhada", 0.9);
  const from = (y: number) => ({ x: x0 + 12, y });
  const to = (y: number) => ({ x: x1 - 12, y });

  await sheet.screenshot({ path: testInfo.outputPath("estilos-de-linha.png") });
  expect(await gapsAlong(sheet, from(solidY), to(solidY))).toBe(0);
  expect(await gapsAlong(sheet, from(dashedY), to(dashedY))).toBeGreaterThanOrEqual(5);
  expect(await gapsAlong(sheet, from(dottedY), to(dottedY))).toBeGreaterThan(
    await gapsAlong(sheet, from(dashedY), to(dashedY)),
  );
});
