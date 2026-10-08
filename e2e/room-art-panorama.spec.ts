import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"])
  test(`artes completas e sempre visíveis, ${theme}`, async ({ page }, testInfo) => {
    await page.addInitScript((value) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", value);
    }, theme);
    await page.goto("/sala");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const arts = page.locator(".local-room-activity__art");
    await expect(arts).toHaveCount(4);
    for (const art of await arts.all()) {
      await expect(art).toHaveCSS("opacity", "1");
      const image = await art.locator("img").evaluate(async (element: HTMLImageElement) => {
        await element.decode();
        return { w: element.naturalWidth, h: element.naturalHeight };
      });
      expect(image.w).toBe(image.h);
      const button = await art.locator("..").boundingBox();
      const bounds = await art.boundingBox();
      expect(bounds!.width / button!.width).toBeLessThan(0.5);
      expect(bounds!.x).toBeGreaterThan(button!.x + button!.width * 0.5);
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
      expect(artBox!.width / box!.width).toBeLessThan(0.5);
      const copy = await mode.locator(".bingo-mode-copy").boundingBox();
      expect(copy!.x + copy!.width).toBeLessThanOrEqual(artBox!.x + 6);
    }
    await expect(
      page.getByText("Bingo presencial", { exact: true }).locator("..").locator(".."),
    ).toHaveCSS("background-color", "rgb(41, 36, 50)");
    await page.screenshot({
      path: testInfo.outputPath(`bingo-modos-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
