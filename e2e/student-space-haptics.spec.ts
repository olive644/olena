import { expect, test } from "@playwright/test";

test("espaço responsivo navega com vibração global e respeita acessibilidade", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: () => {
        document.documentElement.dataset["pulseCount"] = String(
          Number(document.documentElement.dataset["pulseCount"] ?? 0) + 1,
        );
        return true;
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Seu próximo destino" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("espaco-do-aluno.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => localStorage.setItem("helenastudy.theme", "dark"));
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Seu próximo destino" })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("espaco-do-aluno-escuro.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /Hora de focar/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-pulse-count", "1");
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await page.getByRole("button", { name: "Aparência e acessibilidade", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Vibrações/ }).uncheck();
  const before = await page.locator("html").getAttribute("data-pulse-count");
  await page
    .getByRole("button", {
      name: page.viewportSize()!.width <= 760 ? "Voltar às configurações" : "Voltar ao perfil",
      exact: true,
    })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-pulse-count", before!);
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("olena:accessibility:v1") ?? "{}").haptics,
    ),
  ).toBe(false);
});
