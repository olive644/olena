import { expect, test, type Locator } from "@playwright/test";
import { openHandwritingA4, activateHandwritingPen, openNotebooksView } from "./notebook-helpers";

async function inkPixels(canvas: Locator): Promise<number> {
  return canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const { data } = target.getContext("2d")!.getImageData(0, 0, target.width, target.height);
    let count = 0;
    for (let index = 0; index < data.length; index += 4)
      if (data[index + 3]! > 200 && data[index]! < 90 && data[index + 1]! < 90) count += 1;
    return count;
  });
}

test("o segundo botão da caneta, configurado como borracha, apaga a tinta", async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Caneta simulada pelo Chromium.");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.notebookShortcuts.v1", JSON.stringify({ penSecond: "eraser" }));
  });
  await page.goto("/");
  await openNotebooksView(page);
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await activateHandwritingPen(page);
  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  await sheet.scrollIntoViewIfNeeded();
  const box = (await sheet.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const pen = (
    x: number,
    y: number,
    type: "mousePressed" | "mouseMoved" | "mouseReleased",
    middle: boolean,
  ) =>
    cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: type === "mouseMoved" ? "none" : middle ? "middle" : "left",
      buttons: type === "mouseReleased" ? 0 : middle ? 4 : 1,
      clickCount: type === "mouseMoved" ? 0 : 1,
      pointerType: "pen",
      force: 0.5,
    });

  const x0 = box.x + box.width * 0.2;
  const y0 = box.y + 160;
  const stroke = async (middle: boolean) => {
    await pen(x0, y0, "mousePressed", middle);
    for (let step = 1; step <= 30; step += 1) await pen(x0 + step * 8, y0, "mouseMoved", middle);
    await pen(x0 + 240, y0, "mouseReleased", middle);
  };
  await stroke(false);
  const ink = dialog.locator(".handwriting-committed-ink");
  await expect.poll(() => inkPixels(ink)).toBeGreaterThan(200);
  const before = await inkPixels(ink);
  await stroke(true);
  await expect.poll(() => inkPixels(ink)).toBeLessThan(before / 4);
});
