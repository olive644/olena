import { expect, test } from "@playwright/test";

test("percorre as preferências e revisa respostas sem iniciar login", async ({ page }) => {
  await page.goto("/?onboarding=1");
  for (let step = 1; step <= 9; step++) {
    const image = page.locator(".onboarding__helena");
    await expect(image).toHaveAttribute("src", new RegExp(`step-${Math.min(step, 5)}`));
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await page
      .getByRole(step === 5 ? "checkbox" : "radio")
      .first()
      .check();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await expect(page.locator(".onboarding__summary li")).toHaveCount(9);
  await page.getByRole("button", { name: "Entrar com Google" }).click();
  await expect(page.getByRole("heading", { name: "Vamos começar?" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.locator(".onboarding__summary li")).toHaveCount(9);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeChecked();
});
