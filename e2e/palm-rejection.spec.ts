import { expect, test, type Locator } from "@playwright/test";
import { openHandwritingA4 } from "./notebook-helpers";

async function inkPixels(canvas: Locator): Promise<number> {
  return canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const context = target.getContext("2d")!;
    const { data } = context.getImageData(0, 0, target.width, target.height);
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3]! > 200 && data[index]! < 90 && data[index + 1]! < 90) count += 1;
    }
    return count;
  });
}

test("a palma apoiada com a caneta escrevendo não cancela o traço", async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Caneta e toque simulados pelo Chromium.");
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
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  await sheet.scrollIntoViewIfNeeded();
  const box = (await sheet.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const penAt = (x: number, y: number, type: "mousePressed" | "mouseMoved" | "mouseReleased") =>
    cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: type === "mouseMoved" ? "none" : "left",
      buttons: type === "mouseReleased" ? 0 : 1,
      clickCount: type === "mouseMoved" ? 0 : 1,
      pointerType: "pen",
      force: 0.5,
    });

  const startX = box.x + box.width * 0.2;
  const startY = box.y + 120;
  await penAt(startX, startY, "mousePressed");
  for (let step = 1; step <= 10; step += 1) {
    await penAt(startX + step * 10, startY + Math.sin(step / 2) * 10, "mouseMoved");
  }
  // A palma toca em dois pontos enquanto a caneta segue escrevendo.
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: startX + 200, y: startY + 150, id: 1 },
      { x: startX + 260, y: startY + 170, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: startX + 210, y: startY + 100, id: 1 },
      { x: startX + 300, y: startY + 120, id: 2 },
    ],
  });
  for (let step = 11; step <= 20; step += 1) {
    await penAt(startX + step * 10, startY + Math.sin(step / 2) * 10, "mouseMoved");
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await penAt(startX + 210, startY, "mouseReleased");

  await expect.poll(() => inkPixels(sheet)).toBeGreaterThan(200);
  await expect(dialog.getByRole("button", { name: "Desfazer", exact: true })).toBeEnabled();
});
