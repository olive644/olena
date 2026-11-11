import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`account entry keeps its controls usable on ${theme}`, async ({ page, isMobile }) => {
    if (isMobile) await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript((value) => localStorage.setItem("helenastudy.theme", value), theme);
    await page.goto("/");
    const title = page.getByRole("heading", { name: "Estude do seu jeito" });
    const start = page.getByRole("button", { name: "Começar agora" });
    await expect(title).toBeVisible();
    expect(
      Math.abs((await title.boundingBox())!.width - (await start.boundingBox())!.width),
    ).toBeLessThanOrEqual(1);
    await start.click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
    await expect(modal.getByRole("button", { name: "Entrar com Discord" })).toBeVisible();
    await expect(modal.getByText("Já passei por isso", { exact: true })).toBeVisible();
    await expect(modal.getByText("Entrar como convidado", { exact: true })).toHaveCount(0);
    const email = modal.getByPlaceholder("eu@exemplo.com");
    const password = modal.getByPlaceholder("Coloque sua senha");
    await email.fill("learner@example.test");
    await password.fill("abcdefg");
    await expect(password).toHaveAttribute("minlength", "8");
    await expect(modal.getByRole("button", { name: "Criar conta com e-mail" })).toBeDisabled();
    await password.fill("abcdefgh");
    await modal.getByRole("button", { name: "Mostrar senha", exact: true }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(modal.getByRole("button", { name: "Mostrar senha", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await modal.getByRole("button", { name: "Mostrar senha", exact: true }).click();
    await expect(password).toHaveAttribute("type", "password");
    await email.fill("invalid");
    await modal
      .locator("form")
      .evaluate((form) =>
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
      );
    await expect(modal.getByRole("status")).toBeVisible();
    await modal.getByRole("button", { name: "Fechar aviso" }).click();
    await expect(modal.getByRole("status")).toHaveCount(0);
    await modal.getByRole("button", { name: "Já passei por isso" }).click();
    await expect(modal.getByRole("button", { name: "Esqueci minha senha" })).toBeVisible();
    await modal.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect(modal.getByRole("button", { name: "Enviar recuperação" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await modal.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(start).toBeVisible();
  });
}
