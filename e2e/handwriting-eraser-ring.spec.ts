import { openHandwritingA4 } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

// Antes de apagar, a pessoa vê a área que a borracha vai apagar (um anel que segue o ponteiro).
test("a borracha mostra um anel ao pairar e ele some ao sair da folha", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo de desenho verificado no desktop.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await dialog.getByRole("button", { name: "Borracha", exact: true }).click();
  const live = dialog.locator(".handwriting-live-layer");
  const shell = dialog.locator(".handwriting-page-shell");
  await shell.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const box = (await shell.boundingBox())!;
  const pixels = () =>
    live.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let index = 3; index < data.length; index += 4) if (data[index]! > 40) count += 1;
      return count;
    });
  expect(await pixels()).toBe(0);
  await page.mouse.move(box.x + box.width / 2 - 20, box.y + 200);
  await page.mouse.move(box.x + box.width / 2, box.y + 200, { steps: 4 });
  await expect.poll(pixels).toBeGreaterThan(200);
  await page.screenshot({ path: testInfo.outputPath("anel-da-borracha.png") });
  // Fora da folha o anel sai.
  await page.mouse.move(box.x - 60, box.y + 200, { steps: 4 });
  await expect.poll(pixels).toBe(0);

  // Apagando (mouse apertado): o anel continua acompanhando a borracha em vez de sumir.
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await expect.poll(pixels).toBeGreaterThan(200);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + 260, { steps: 8 });
  await expect.poll(pixels).toBeGreaterThan(200);
  // O anel está onde a borracha está agora, não parado no ponto onde apertou.
  const ringCenter = () =>
    live.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3]! <= 40) continue;
        const pixel = index / 4;
        sumX += pixel % canvas.width;
        sumY += Math.floor(pixel / canvas.width);
        count += 1;
      }
      const bounds = canvas.getBoundingClientRect();
      return {
        x: bounds.left + (sumX / count / canvas.width) * bounds.width,
        y: bounds.top + (sumY / count / canvas.height) * bounds.height,
      };
    });
  const during = await ringCenter();
  expect(Math.abs(during.x - (box.x + box.width / 2 + 80))).toBeLessThan(12);
  expect(Math.abs(during.y - (box.y + 260))).toBeLessThan(12);
  await page.mouse.up();
  // Ao soltar, o anel fica onde a borracha parou (como ao pairar).
  await expect.poll(pixels).toBeGreaterThan(200);
});
