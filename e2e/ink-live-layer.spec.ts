import { openHandwritingA4 } from "./notebook-helpers";
import { expect, test, type Locator } from "@playwright/test";

// Conta pixels com tinta (alfa alto) em uma faixa do canvas.
async function inkPixels(canvas: Locator): Promise<number> {
  return canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const context = target.getContext("2d")!;
    const { data } = context.getImageData(0, 0, target.width, target.height);
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      // Tinta escura e opaca; o papel e as pautas são claros.
      if (data[index + 3]! > 200 && data[index]! < 90 && data[index + 1]! < 90) count += 1;
    }
    return count;
  });
}

test("o traço em andamento fica na camada ao vivo e vai para a folha ao soltar", async ({
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
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  const live = dialog.locator(".handwriting-live-layer");
  await sheet.scrollIntoViewIfNeeded();
  const box = (await sheet.boundingBox())!;
  const at = (fx: number, fy: number) => ({
    x: box.x + box.width * fx,
    y: box.y + box.height * fy * 0.5,
  });

  await expect(live).toHaveCount(1);
  expect(await inkPixels(live)).toBe(0);

  const path = Array.from({ length: 40 }, (_, index) => at(0.15 + index * 0.015, 0.2));
  await page.mouse.move(path[0]!.x, path[0]!.y);
  await page.mouse.down();
  for (const point of path.slice(1)) {
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(8);
  }
  await page.waitForTimeout(80);

  // Durante o traço: a tinta está só na camada ao vivo, nunca duplicada na folha.
  expect(await inkPixels(live)).toBeGreaterThan(200);
  expect(await inkPixels(sheet)).toBe(0);

  await page.mouse.up();

  // Depois de soltar: a tinta está só na folha e a camada esvazia.
  await expect.poll(() => inkPixels(live)).toBe(0);
  expect(await inkPixels(sheet)).toBeGreaterThan(200);
});

test("a camada ao vivo mostra o traço inteiro de novo a cada quadro, sem falhas nem duplicar", async ({
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
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  await dialog.getByRole("button", { name: /Pincel macio/ }).click();
  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  const live = dialog.locator(".handwriting-live-layer");
  await sheet.scrollIntoViewIfNeeded();
  const box = (await sheet.boundingBox())!;
  const at = (fx: number, fy: number) => ({
    x: box.x + box.width * fx,
    y: box.y + box.height * fy * 0.5,
  });
  // Traço translúcido que volta sobre si mesmo: se a camada acumulasse quadros, o
  // trecho repetido ficaria mais escuro do que o traço final na folha.
  const path = [
    ...Array.from({ length: 30 }, (_, index) => at(0.2 + index * 0.02, 0.2)),
    ...Array.from({ length: 30 }, (_, index) => at(0.78 - index * 0.02, 0.2)),
  ];
  await page.mouse.move(path[0]!.x, path[0]!.y);
  await page.mouse.down();
  for (const point of path.slice(1)) {
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(8);
  }
  await page.waitForTimeout(80);
  const darkestLive = await live.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const { data } = target.getContext("2d")!.getImageData(0, 0, target.width, target.height);
    let max = 0;
    for (let index = 3; index < data.length; index += 4) max = Math.max(max, data[index]!);
    return max;
  });
  await page.mouse.up();
  const darkestSheet = await sheet.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const { data } = target.getContext("2d")!.getImageData(0, 0, target.width, target.height);
    let darkest = 255;
    for (let index = 0; index < data.length; index += 4) darkest = Math.min(darkest, data[index]!);
    return darkest;
  });
  // O pincel macio é translúcido: a opacidade máxima na camada não passa da soma de
  // corpo e fios de um único desenho (o traço não é acumulado quadro a quadro).
  expect(darkestLive).toBeLessThan(215);
  expect(darkestSheet).toBeGreaterThan(20);
});
