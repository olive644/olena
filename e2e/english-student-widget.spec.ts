import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`widget inglês alterna e abre o percurso: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
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
    const selector = page.getByRole("button", { name: "Mostrar Inglês", exact: true });
    await selector.click();
    await expect(selector).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("heading", { name: "Uma nova conversa começa aqui." }),
    ).toBeVisible();
    const art = page.getByRole("img", { name: "Olena convida você a praticar Inglês" });
    await expect(art).toBeVisible();
    await expect.poll(() => art.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(900);
    expect(await art.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page
      .locator(".math-hero-carousel")
      .screenshot({ path: info.outputPath(`english-widget-${theme}.png`), animations: "disabled" });
    await selector.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("button", { name: "Explorar Matemática", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Explorar Inglês", exact: true })).toBeVisible();
    const carousel = page.locator(".math-hero-carousel");
    await carousel.dispatchEvent("touchstart", {
      touches: [{ identifier: 0, clientX: 100, clientY: 200 }],
    });
    await carousel.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 0, clientX: 240, clientY: 205 }],
    });
    await expect(page.getByRole("button", { name: "Mostrar Matemática" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await carousel.dispatchEvent("touchstart", {
      touches: [{ identifier: 0, clientX: 240, clientY: 200 }],
    });
    await carousel.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 0, clientX: 100, clientY: 205 }],
    });
    await expect(selector).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Explorar Inglês", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Cais das Boas-vindas", exact: true }),
    ).toBeVisible();
  });
}
