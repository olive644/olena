import { expect, test } from "@playwright/test";

// Tela de alta densidade (como um celular ou notebook 2x): o bitmap da folha precisa
// ter mais pixels que os 1200 de largura da folha, senão a tinta sai borrada.
test.use({ deviceScaleFactor: 2 });

test("a folha ganha resolução em tela densa e com zoom, e a tinta cai onde a caneta está", async ({
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
  await page.getByRole("button", { name: "Escrever à mão" }).click();
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  const live = dialog.locator(".handwriting-live-layer");
  await sheet.scrollIntoViewIfNeeded();

  // Tela 2x: o bitmap tem mais pixels que os 1200 da folha, nas duas camadas.
  const bitmapWidth = () => sheet.evaluate((element) => (element as HTMLCanvasElement).width);
  await expect.poll(bitmapWidth).toBeGreaterThan(1200);
  const initial = await bitmapWidth();
  expect(await live.evaluate((element) => (element as HTMLCanvasElement).width)).toBe(initial);
  expect(await sheet.evaluate((element) => (element as HTMLCanvasElement).height)).toBe(
    Math.round((initial / 1200) * 1600),
  );

  // A tinta cai onde a caneta está, mesmo com o bitmap em outra escala.
  const box = (await sheet.boundingBox())!;
  const target = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.1 };
  await page.mouse.move(target.x - 60, target.y);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(target.x - 60 + step * 6, target.y);
    await page.waitForTimeout(8);
  }
  await page.mouse.up();
  await page.waitForTimeout(100);
  const inkAtPointer = await sheet.evaluate((element, position) => {
    const canvas = element as HTMLCanvasElement;
    const bounds = canvas.getBoundingClientRect();
    const x = Math.round(((position.x - bounds.left) / bounds.width) * canvas.width);
    const y = Math.round(((position.y - bounds.top) / bounds.height) * canvas.height);
    const { data } = canvas.getContext("2d")!.getImageData(x - 6, y - 6, 12, 12);
    for (let index = 0; index < data.length; index += 4) {
      if (data[index]! < 90 && data[index + 1]! < 90 && data[index + 2]! < 100) return true;
    }
    return false;
  }, target);
  expect(inkAtPointer).toBe(true);

  // Ampliar a folha aumenta a resolução do bitmap, e o traço continua no lugar.
  await dialog.getByRole("button", { name: "Lupa para ampliar" }).click();
  for (let click = 0; click < 6; click += 1) {
    const current = (await sheet.boundingBox())!;
    await page.mouse.click(current.x + current.width * 0.5, current.y + 120);
    await page.waitForTimeout(60);
  }
  await expect.poll(bitmapWidth, { timeout: 5000 }).toBeGreaterThan(initial);
  const zoomed = await bitmapWidth();
  expect(zoomed).toBeLessThanOrEqual(Math.round(1200 * Math.sqrt(9_000_000 / (1200 * 1600))));
  await expect
    .poll(() =>
      sheet.evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
        let dark = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index]! < 90 && data[index + 1]! < 90 && data[index + 2]! < 100) dark += 1;
        }
        return dark;
      }),
    )
    .toBeGreaterThan(300);
});
