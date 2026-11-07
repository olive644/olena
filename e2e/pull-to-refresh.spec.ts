import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`atualização em papel cancela, anuncia e recarrega: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Explorar Matemática", exact: true }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/paper-refresh-enabled/);
    const main = page.locator("#main-content");
    const pull = async (y: number) => {
      await main.dispatchEvent("touchstart", {
        touches: [{ identifier: 0, clientX: 80, clientY: 180 }],
      });
      await main.dispatchEvent("touchmove", {
        cancelable: true,
        touches: [{ identifier: 0, clientX: 80, clientY: 180 + y }],
      });
    };
    await pull(60);
    await expect(
      page.getByRole("status", { name: "" }).filter({ hasText: "Puxe para atualizar" }),
    ).toBeVisible();
    await main.dispatchEvent("touchend", { touches: [] });
    await expect(page.locator(".paper-refresh")).toHaveCount(0);
    await page.getByRole("button", { name: "Mostrar Inglês", exact: true }).click();
    await expect(
      page.getByRole("img", { name: "Olena convida você a praticar Inglês" }),
    ).toBeVisible();
    await pull(250);
    await expect(page.locator(".paper-refresh")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".paper-refresh")).toContainText("Solte para atualizar");
    await page.locator(".helena-refresh-book").evaluate((img: HTMLImageElement) => img.decode());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`refresh-${theme}.png`),
      animations: "disabled",
    });
    const navigation = page.waitForEvent("framenavigated", (frame) => frame === page.mainFrame());
    await main.dispatchEvent("touchend", { touches: [] });
    await navigation;
    await expect(
      page.getByRole("button", { name: "Explorar Matemática", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Explorar Matemática", exact: true }).click();
    await expect(page.locator("html")).not.toHaveClass(/paper-refresh-enabled/);
  });
}

test("gesto de toque do Chromium substitui a atualização nativa no topo", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/paper-refresh-enabled/);
  await expect(
    page.getByRole("button", { name: "Explorar Matemática", exact: true }),
  ).toBeVisible();
  const box = (await page.locator(".math-hero-copy p").first().boundingBox())!;
  const x = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: startY }],
  });
  for (const offset of [20, 60, 120, 180, 250])
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: startY + offset }],
    });
  await expect(page.locator(".paper-refresh")).toHaveAttribute("data-ready", "true");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const navigation = page.waitForEvent("framenavigated", (frame) => frame === page.mainFrame());
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await navigation;
  await expect(
    page.getByRole("button", { name: "Explorar Matemática", exact: true }),
  ).toBeVisible();
  await cdp.detach();
});
