import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"])
  test(`artes completas e sempre visíveis, ${theme}`, async ({ page }, testInfo) => {
    await page.addInitScript(() =>
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
    );
    await page.goto("/sala");
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const arts = page.locator(".local-room-activity__art");
    await expect(arts).toHaveCount(4);
    for (const art of await arts.all()) {
      await expect(art).toHaveCSS("opacity", "1");
      await expect(art).toHaveCSS("clip-path", "none");
      const image = await art.locator("img").evaluate(async (element: HTMLImageElement) => {
        await element.decode();
        return { w: element.naturalWidth, h: element.naturalHeight };
      });
      if (testInfo.project.name === "desktop") expect(image.w).toBeGreaterThan(image.h * 2.8);
      else expect(image.w).toBe(image.h);
    }
    await page.screenshot({
      path: testInfo.outputPath(`modalidades-${theme}.png`),
      fullPage: true,
    });
    await page.getByRole("radio", { name: /^Bingo/ }).click();
    const modes = page.locator(".bingo-mode");
    await expect(modes).toHaveCount(5);
    await expect(page.getByText("Preparando atividade…", { exact: true })).toHaveCount(0);
    await expect(page.locator(".main-content")).toHaveCSS("opacity", "1");
    for (const mode of await modes.all()) {
      const box = await mode.boundingBox();
      const art = mode.locator(".bingo-mode-art");
      await expect(art).toHaveCSS("opacity", "1");
      const artBox = await art.boundingBox();
      expect(Math.abs(artBox!.width - box!.width)).toBeLessThan(6);
    }
    await expect(
      page.getByText("Bingo presencial", { exact: true }).locator("..").locator(".."),
    ).toHaveCSS("background-color", "rgb(255, 232, 141)");
    await page.screenshot({
      path: testInfo.outputPath(`bingo-modos-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
