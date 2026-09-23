import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helenastudy.theme", "light");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const width of [320, 360, 390, 768, 1280]) {
  test(`navegação e foco sem recortes em ${width}px`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Larguras verificadas explicitamente com Chromium.",
    );
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const mobile = width < 900;
    const navigation = page.getByRole("navigation", {
      name: mobile ? "Navegação móvel" : "Navegação principal",
    });
    const profile = page.locator(
      mobile ? ".mobile-top-bar__profile" : ".page-header .user-profile",
    );
    if (mobile) {
      await expect(profile).toBeVisible();
      await expect(profile.locator("img")).toBeVisible();
      const more = page.getByRole("button", { name: "Mais ferramentas", exact: true });
      await expect(more).toBeVisible();
      await more.click();
      const moreDialog = page.getByRole("dialog", { name: "Mais ferramentas" });
      await expect(moreDialog).toBeVisible();
      await expect(moreDialog.locator(".user-profile")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(more).toBeFocused();
      await navigation.getByRole("button", { name: "Praticar", exact: true }).click();
      await expect(navigation.locator(".mobile-nav__item--featured .mobile-nav__icon")).toHaveCSS(
        "background-color",
        "rgb(116, 51, 224)",
      );
      await expect(
        navigation.locator(".mobile-nav__item--featured .navigation-icon__variant--escuro"),
      ).toBeVisible();
      await expect(
        navigation.locator(".mobile-nav__item--featured .mobile-nav__icon"),
      ).not.toHaveCSS("border-radius", "50%");
    } else {
      await expect(profile).toBeVisible();
      await expect(profile).toHaveCSS("border-radius", "50%");
      const sidebarBox = await page.getByRole("complementary").boundingBox();
      const mainBox = await page.getByRole("main").boundingBox();
      expect(mainBox!.x).toBeCloseTo(sidebarBox!.x + sidebarBox!.width, 0);
      await expect(page.getByRole("complementary")).toHaveCSS("box-shadow", "none");
    }
    await navigation.getByRole("button", { name: "Foco", exact: true }).click();
    if (mobile) {
      await expect(page.locator("body")).toHaveCSS("overscroll-behavior-y", "none");
    }
    for (const mode of ["Cronômetro", "Pomodoro"]) {
      await expect(page.locator(".focus-mode-name")).toHaveText(mode);
      const startButton = page.getByRole("button", { name: "Começar", exact: true });
      await expect(startButton.locator(".focus-paper-control-icon.is-play")).toBeVisible();
      await expect(startButton.locator(".focus-paper-control-icon__face")).toHaveCSS(
        "fill",
        "rgb(41, 36, 50)",
      );
      if (mode === "Pomodoro") {
        const tomatoes = page.locator(".streak-tomato");
        await expect(tomatoes).toHaveCount(7);
        const week = await page.locator(".pomodoro-week").boundingBox();
        for (const tomato of await tomatoes.all()) {
          const box = await tomato.boundingBox();
          expect(box!.width).toBeGreaterThan(20);
          expect(box!.x).toBeGreaterThanOrEqual(week!.x);
          expect(box!.x + box!.width).toBeLessThanOrEqual(week!.x + week!.width + 1);
        }
      }
      const finish = page.getByRole("button", { name: "Encerrar e registrar" });
      await finish.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const finishBox = await finish.boundingBox();
      const viewportBox = await page.locator(".focus-mode-viewport").boundingBox();
      expect(finishBox!.y + finishBox!.height + 4).toBeLessThanOrEqual(
        viewportBox!.y + viewportBox!.height,
      );
      if (mobile) {
        const navBox = await navigation.boundingBox();
        expect(finishBox!.y + finishBox!.height + 4).toBeLessThan(navBox!.y);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: testInfo.outputPath(`${mode}-${width}-light.png`),
        fullPage: true,
      });
      if (mode === "Cronômetro") await page.getByRole("button", { name: "Próximo modo" }).click();
    }
    await page
      .locator(
        mobile
          ? ".mobile-nav .appearance-picker summary"
          : ".page-header__theme .appearance-picker__trigger",
      )
      .click();
    if (mobile) {
      const appearanceBox = await page
        .locator(".mobile-nav .appearance-picker__sheet")
        .boundingBox();
      expect(appearanceBox!.x).toBeGreaterThanOrEqual(0);
      expect(appearanceBox!.x + appearanceBox!.width).toBeLessThanOrEqual(width);
    }
    await expect(
      page
        .locator(
          mobile
            ? '.mobile-nav .appearance-picker__sheet [data-icon="theme-light"] img'
            : '.page-header__theme .appearance-picker__sheet [data-icon="theme-light"] img',
        )
        .first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Escuro", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.locator(
        mobile
          ? '.mobile-nav .appearance-picker summary [data-icon="theme-light"] img:visible'
          : '.page-header__theme .appearance-picker__trigger [data-icon="theme-light"] img:visible',
      ),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`Pomodoro-${width}-dark.png`),
      fullPage: true,
    });
  });
}
