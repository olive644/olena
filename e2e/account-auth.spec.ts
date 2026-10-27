import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`email registration, recovery and provider controls work on ${theme}`, async ({
    page,
    isMobile,
  }) => {
    if (isMobile) await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript((value) => localStorage.setItem("helenastudy.theme", value), theme);
    await page.goto("/?onboarding=1&login=1");
    await expect(
      page.getByRole("button", { name: "Entrar com Google", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Entrar com Discord", exact: true }),
    ).toBeVisible();
    const google = page.getByRole("button", { name: "Entrar com Google", exact: true });
    const discord = page.getByRole("button", { name: "Entrar com Discord", exact: true });
    await expect(google.locator("img")).toHaveAttribute(
      "src",
      "/navigation-icons/paper/profile-google.svg",
    );
    expect((await google.boundingBox())!.width).toBeLessThanOrEqual(68);
    expect((await discord.boundingBox())!.width).toBeLessThanOrEqual(68);
    expect(
      await page
        .locator(".login-page")
        .evaluate((element) => getComputedStyle(element).backgroundImage),
    ).toContain(theme === "dark" ? "paper-sky-pattern.svg" : "paper-sky-pattern-light.svg");
    if (theme === "dark")
      expect(await discord.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
        "rgb(116, 51, 224)",
      );
    await page.screenshot({ path: test.info().outputPath("initial.png"), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
    ).toBe(true);
    await page.locator(".login-page__consent input").check();
    await page.getByRole("button", { name: "Entrar ou criar conta com e-mail" }).click();
    await expect(page.locator(".login-page__consent")).toBeHidden();
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await page.getByLabel("Seu nome", { exact: true }).fill("Learner");
    await page.getByLabel("E-mail", { exact: true }).fill("learner@example.test");
    const password = page.getByLabel("Senha", { exact: true });
    await password.fill("A unique long passphrase");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByLabel("Mostrar senha", { exact: true }).check();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByLabel("Confirmar senha", { exact: true }).fill("A unique long passphrase");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
    ).toBe(true);
    await expect(page.getByRole("meter", { name: "Força da senha" })).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("email-registration.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect(page.getByRole("button", { name: "Enviar recuperação" })).toBeVisible();
    await expect(password).toHaveCount(0);
    await page.getByRole("button", { name: "Outros métodos de acesso" }).click();
    await expect(
      page.getByRole("button", { name: "Entrar com Google", exact: true }),
    ).toBeVisible();
  });
}
