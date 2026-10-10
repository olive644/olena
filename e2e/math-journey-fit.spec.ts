import { test, expect } from "@playwright/test";

test("math places fit without scrolling, clipped controls or separated background", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await expect(page.locator(".math-journey")).toHaveClass(/is-map/);
  const sizes =
    info.project.name === "mobile"
      ? [
          { width: 390, height: 664 },
          { width: 360, height: 600 },
          { width: 430, height: 780 },
        ]
      : [
          { width: 1280, height: 720 },
          { width: 1000, height: 600 },
          { width: 1440, height: 900 },
        ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme,
      );
      const surface = await page.locator(".math-journey").evaluate((element) => ({
        height: element.clientHeight,
        scroll: element.scrollHeight,
      }));
      expect(surface.scroll).toBe(surface.height);
      const island = (await page.locator(".math-journey-island.is-current").boundingBox())!;
      const dock = (await page.locator(".math-chest-dock").boundingBox())!;
      const title = (await page.locator(".math-journey-label").boundingBox())!;
      const button = (await page.getByRole("button", { name: "Explorar lugar" }).boundingBox())!;
      expect(dock.y).toBeGreaterThanOrEqual(island.y + island.height);
      expect(title.y).toBeGreaterThanOrEqual(dock.y + dock.height + 4);
      expect(button.y + button.height + 5).toBeLessThanOrEqual(size.height);
      await page.screenshot({
        path: info.outputPath(`fit-${size.width}-${size.height}-${theme}.png`),
      });
    }
  }
});
