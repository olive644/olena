import { expect, test } from "@playwright/test";
import { ENGLISH_ACHIEVEMENTS } from "../src/domain/english-achievement-catalog";
for (const theme of ["light", "dark"]) {
  test(`galeria inglesa, Olena e PNG: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript(
      ({ theme, ids }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", theme);
        localStorage.setItem(
          "helena.profile.v1",
          JSON.stringify({
            name: "Ana",
            achievementHistory: Object.fromEntries(ids.map((id) => [id, "2026-11-01T12:00:00Z"])),
            achievementFavorites: [],
          }),
        );
      },
      { theme, ids: ENGLISH_ACHIEVEMENTS.map((item) => item.id) },
    );
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Ver todas as conquistas" }).click();
    const gallery = page.getByRole("dialog", { name: "Todas as conquistas", exact: true });
    await gallery.getByRole("tab", { name: "Inglês", exact: true }).click();
    await expect(gallery.locator(".achievement-tile")).toHaveCount(22);
    expect(await gallery.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await gallery.screenshot({
      path: info.outputPath(`english-gallery-${theme}.png`),
      animations: "disabled",
    });
    for (const part of [0, 1, 2, 3, 6, 4, 7, 5]) {
      await gallery
        .locator(`.achievement-tile:has([data-art="english-part-${part}"])`)
        .first()
        .click();
      const inspection = page.locator(".achievement-inspection");
      await expect(inspection.locator("image:not([data-achievement-preview])")).toHaveAttribute(
        "href",
        `/achievement-badges/english/part-${part}.webp?v=20261107`,
      );
      await expect(inspection.locator("time")).toHaveAttribute("datetime", "2026-11-01T12:00:00Z");
      const tiers = inspection.locator(".achievement-tier-steps button");
      await expect(tiers).toHaveCount(3);
      for (const [index, target] of [25, 50].entries()) {
        await tiers.nth(index).click();
        await expect(inspection.locator("image:not([data-achievement-preview])")).toHaveAttribute(
          "href",
          `/achievement-badges/english/english-part-${part}-variety-${target}.webp?v=20261107`,
        );
        if (part === 0 && index === 0) {
          await inspection.screenshot({
            path: info.outputPath(`english-intermediate-${theme}.png`),
            animations: "disabled",
          });
        }
      }
      await tiers.last().click();
      expect(await inspection.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      if (part === 0) {
        await inspection.screenshot({
          path: info.outputPath(`english-olena-${theme}.png`),
          animations: "disabled",
        });
        await inspection
          .getByRole("button", { name: "Compartilhar conquista", exact: true })
          .click();
        const preview = inspection.getByRole("img", {
          name: "Card da conquista para compartilhar",
        });
        await expect
          .poll(() => preview.evaluate((node) => (node as HTMLImageElement).naturalWidth))
          .toBe(1080);
        expect(await preview.evaluate((node) => (node as HTMLImageElement).naturalHeight)).toBe(
          1350,
        );
      }
      await page.getByRole("button", { name: "Fechar conquista", exact: true }).click();
    }
  });
}
