import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`conta existente abre login sem perguntas e permite criar uma conta ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((value) => localStorage.setItem("helenastudy.theme", value), theme);
    await page.goto("/?onboarding=1");
    await page.getByRole("button", { name: "Já tenho uma conta" }).click();
    await expect(page.getByRole("heading", { name: "Boas-vindas de volta!" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
    await expect(page.locator(".onboarding__choices")).toHaveCount(0);
    await expect(page.locator(".login-page__perched--returning")).toHaveAttribute(
      "src",
      "/helena-welcome-back.webp",
    );
    await expect
      .poll(() =>
        page
          .locator(".login-page__perched--returning")
          .evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: test.info().outputPath("welcome-back.png") });
    await page.getByRole("button", { name: "Primeira vez por aqui? Crie sua conta" }).click();
    await expect(page.getByRole("button", { name: "Ensino médio", exact: true })).toBeVisible();
  });
}

test("navegador reconhecido abre boas-vindas sem identificar uma pessoa", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("olena.returning.v1", "1"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Boas-vindas de volta!" })).toBeVisible();
  await expect(page.locator(".onboarding__choices")).toHaveCount(0);
});
