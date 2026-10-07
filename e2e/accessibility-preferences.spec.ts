import { expect, test } from "@playwright/test";

test("Perfil salva acessibilidade geral, aplica à sala e restaura após recarregar", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/perfil");
  const settings = page.getByRole("region", { name: "Acessibilidade", exact: true });
  await settings.getByRole("checkbox", { name: /Reduzir movimento/ }).check();
  await settings.getByRole("checkbox", { name: /Realçar seleções/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await expect(page.locator("html")).toHaveAttribute("data-highlight-selections", "true");
  await settings.screenshot({ path: testInfo.outputPath("perfil-acessibilidade.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/sala");
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await page.goto("/perfil");
  await page.reload();
  await expect(settings.getByRole("checkbox", { name: /Reduzir movimento/ })).toBeChecked();
  await expect(settings.getByRole("checkbox", { name: /Realçar seleções/ })).toBeChecked();
  await settings.getByRole("checkbox", { name: /Reduzir movimento/ }).uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "false");
});
