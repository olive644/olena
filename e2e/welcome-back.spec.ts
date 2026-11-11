import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`conta existente abre login sem perguntas e permite criar uma conta ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((value) => localStorage.setItem("helenastudy.theme", value), theme);
    // Navegador que já teve uma conta (marca sem identidade) e pede o login direto.
    await page.addInitScript(() => localStorage.setItem("olena.returning.v1", "1"));
    await page.goto("/?login=1");
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
    await expect(page.getByRole("heading", { name: "Vamos começar?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
    await expect(page.locator(".login-page__perched--returning")).toHaveCount(0);
  });
}

test("navegador reconhecido abre a capa e leva ao login sem identificar uma pessoa", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("olena.returning.v1", "1"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Estude do seu jeito" })).toBeVisible();
  await expect(page.locator(".onboarding__choices")).toHaveCount(0);
  await page.getByRole("button", { name: "Começar agora" }).click();
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await expect(page.locator(".onboarding__choices")).toHaveCount(0);
});

test("convidado antigo sem onboarding concluído abre a capa, não as perguntas", async ({
  page,
}) => {
  // A marca de convidado sobrevive de quando existia "Entrar como convidado".
  await page.addInitScript(() => localStorage.setItem("helena.guest.v1", "1"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Estude do seu jeito" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Começar agora" })).toBeVisible();
  await expect(page.locator(".onboarding__helena")).toHaveCount(0);
});
