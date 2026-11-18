import { expect, test, type Locator } from "@playwright/test";
import { openHandwritingA4, activateHandwritingPen, openNotebooksView } from "./notebook-helpers";

// Espessura da tinta (pixels escuros) em uma coluna do bitmap de tinta confirmada.
async function thicknessAt(canvas: Locator, fraction: number): Promise<number> {
  return canvas.evaluate((element, at) => {
    const target = element as HTMLCanvasElement;
    const context = target.getContext("2d")!;
    const { data, width, height } = context.getImageData(0, 0, target.width, target.height);
    let first = width;
    let last = 0;
    for (let x = 0; x < width; x += 1)
      for (let y = 0; y < height; y += 1)
        if (data[(y * width + x) * 4 + 3]! > 200) {
          first = Math.min(first, x);
          last = Math.max(last, x);
        }
    const column = Math.round(first + (last - first) * at);
    let count = 0;
    for (let y = 0; y < height; y += 1) if (data[(y * width + column) * 4 + 3]! > 128) count += 1;
    return count;
  }, fraction);
}

test("caneta com pressão alta desde o primeiro ponto nasce fina e termina fina, sem tremer", async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Caneta simulada pelo Chromium.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  await openNotebooksView(page);
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await activateHandwritingPen(page);
  await dialog.getByRole("button", { name: /Caneta-tinteiro/ }).click();
  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  await sheet.scrollIntoViewIfNeeded();
  const box = (await sheet.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const pen = (
    x: number,
    y: number,
    type: "mousePressed" | "mouseMoved" | "mouseReleased",
    force: number,
  ) =>
    cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: type === "mouseMoved" ? "none" : "left",
      buttons: type === "mouseReleased" ? 0 : 1,
      clickCount: type === "mouseMoved" ? 0 : 1,
      pointerType: "pen",
      force,
    });

  const startX = box.x + box.width * 0.2;
  const startY = box.y + 160;
  // Pressão alta e tremida (0,85 e 0,95 alternando) do começo ao fim.
  await pen(startX, startY, "mousePressed", 0.9);
  for (let step = 1; step <= 60; step += 1)
    await pen(startX + step * 6, startY, "mouseMoved", step % 2 === 0 ? 0.85 : 0.95);
  await pen(startX + 366, startY, "mouseReleased", 0);

  const ink = dialog.locator(".handwriting-committed-ink");
  await expect.poll(() => thicknessAt(ink, 0.5)).toBeGreaterThan(2);
  const start = await thicknessAt(ink, 0.02);
  const middle = await thicknessAt(ink, 0.5);
  const end = await thicknessAt(ink, 0.98);
  expect(start).toBeLessThan(middle);
  expect(end).toBeLessThan(middle);
  // O miolo não serrilha com o tremor da leitura: duas colunas vizinhas variam pouco.
  const near = await thicknessAt(ink, 0.52);
  expect(Math.abs(near - middle)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath("caneta-pontas-finas.png") });
});
