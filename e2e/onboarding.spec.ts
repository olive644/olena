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

test("entra como convidado no fim do onboarding e continua assim ao recarregar", async ({
  page,
}) => {
  await page.goto("/?onboarding=1");
  for (let step = 1; step <= 9; step++) {
    await page
      .getByRole(step === 5 ? "checkbox" : "radio")
      .first()
      .check();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
  await page.getByRole("button", { name: "Entrar com Google" }).click();
  await expect(page.getByRole("heading", { name: "Vamos começar?" })).toBeVisible();
  await expect(page.getByText(/você aparece como Guest/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("login-convidado.png") });

  await page.getByRole("button", { name: "Entrar como convidado" }).click();
  await expect(page.getByRole("heading", { name: "Vamos começar?" })).toHaveCount(0);
  await expect(page.locator("#main-content")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("helena.guest.v1"))).toBe("1");

  // O endereço sem ?onboarding=1 é o de quem volta ao app depois.
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.locator(".onboarding")).toHaveCount(0);

  await page.goto("/perfil");
  await expect(page.getByText("Guest (convidado)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("perfil-convidado.png") });
});
