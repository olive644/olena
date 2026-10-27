import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`calendar scrolling does not select dates ${theme}`, async ({ page }, info) => {
    await page.addInitScript(() =>
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
    );
    await page.goto("/planejador");
    const grid = page.locator(".agenda-month-grid");
    await expect(grid).toBeVisible();
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await grid.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    const bounds = await grid.boundingBox();
    const x = bounds!.x + bounds!.width / 2;
    const y = Math.min(bounds!.y + bounds!.height / 2, 500);
    const before = await page.evaluate(() => window.scrollY);
    if (info.project.name === "mobile") {
      const touch = await page.context().newCDPSession(page);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      for (let step = 1; step <= 6; step++)
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y - step * 20, id: 1 }],
        });
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await touch.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(380); // Wheel must cancel even if the button stays held.
      await page.mouse.move(x - 40, y - 30);
      await page.mouse.up();
    }
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - before))
      .toBeGreaterThan(20);
    await expect(grid.locator(".is-in-range")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.screenshot({ path: info.outputPath(`calendar-scroll-${theme}.png`) });
  });
}
