import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`email registration, recovery and provider controls work on ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("helenastudy.theme", value), theme);
    await page.goto("/?onboarding=1&login=1");
    await expect(page.getByRole("button", { name: "Entrar com Apple", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Entrar com Discord", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Entrar ou criar conta com e-mail" }).click();
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
    await page.screenshot({
      path: test.info().outputPath("email-registration.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect(page.getByRole("button", { name: "Enviar recuperação" })).toBeVisible();
    await expect(password).toHaveCount(0);
    await page.getByRole("button", { name: "Outros métodos de acesso" }).click();
    await expect(page.getByRole("button", { name: "Entrar com Apple", exact: true })).toBeVisible();
  });
}
