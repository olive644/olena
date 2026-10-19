import { expect, test } from "@playwright/test";
import { setTestTheme } from "./theme-setup";

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
    const profile = navigation.getByRole("button", { name: "Perfil", exact: true });
    if (mobile) {
      await expect(profile).toBeVisible();
      await expect(profile.locator("img").first()).toBeVisible();
      const more = page.getByRole("button", { name: "Mais ferramentas", exact: true });
      await expect(more).toBeVisible();
      await more.click();
      const moreDialog = page.getByRole("dialog", { name: "Mais ferramentas" });
      await expect(moreDialog).toBeVisible();
      await expect(moreDialog.locator(".user-profile")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(more).toBeFocused();
      const practice = navigation.getByRole("button", { name: "Praticar", exact: true });
      const agenda = navigation.getByRole("button", { name: "Agenda", exact: true });
      await practice.click();
      await expect(practice).toHaveAttribute("aria-current", "page");
      await expect(page.locator(".loading-view")).toHaveCount(0);
      await expect(page.getByRole("main")).toHaveCSS("opacity", "1");
      await expect(practice).not.toHaveClass(/mobile-nav__item--featured/);
      const practiceIcon = practice.locator(".mobile-nav__icon");
      const practiceBox = await practiceIcon.boundingBox();
      await expect(practiceIcon).toHaveCSS("margin-top", "0px");
      await agenda.click();
      await expect(agenda).toHaveAttribute("aria-current", "page");
      await expect(page.locator(".loading-view")).toHaveCount(0);
      await expect(page.getByRole("main")).toHaveCSS("opacity", "1");
      const agendaBox = await agenda.locator(".mobile-nav__icon").boundingBox();
      expect(practiceBox!.width).toBe(agendaBox!.width);
      expect(practiceBox!.height).toBe(agendaBox!.height);
      expect(practiceBox!.y).toBeCloseTo(agendaBox!.y, 0);
    } else {
      await expect(profile).toBeVisible();
      await expect(page.locator(".page-header .user-profile")).toHaveCount(0);
      const sidebarBox = await page
        .getByRole("complementary", { name: "", exact: true })
        .boundingBox();
      const mainBox = await page.getByRole("main").boundingBox();
      expect(mainBox!.x).toBeCloseTo(sidebarBox!.x + sidebarBox!.width, 0);
      await expect(page.getByRole("complementary", { name: "", exact: true })).toHaveCSS(
        "box-shadow",
        "none",
      );
    }
    await navigation.getByRole("button", { name: "Foco", exact: true }).click();
    if (mobile) {
      await expect(page.locator("body")).toHaveCSS("overscroll-behavior-y", "none");
    }
    for (const mode of ["Cronômetro", "Pomodoro"]) {
      await expect(page.locator(".focus-mode-name")).toHaveText(mode);
      const digits = page.locator(".timer .paper-digits");
      await expect(digits.locator("svg")).toHaveCount(mode === "Cronômetro" ? 6 : 4);
      const digitsBox = await digits.boundingBox();
      const timerBox = await page.locator(".timer").boundingBox();
      expect(digitsBox!.width).toBeLessThanOrEqual(timerBox!.width + 1);
      const startButton = page.getByRole("button", { name: "Começar", exact: true });
      await expect(startButton.locator(".focus-paper-control-icon.is-play")).toBeVisible();
      await expect(startButton.locator(".focus-paper-control-icon__face")).toHaveCSS(
        "fill",
        "rgb(255, 249, 239)",
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
    await expect(page.locator(".page-header__theme")).toHaveCount(0);
    await setTestTheme(page, "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({
      path: testInfo.outputPath(`Pomodoro-${width}-dark.png`),
      fullPage: true,
    });
  });
}
