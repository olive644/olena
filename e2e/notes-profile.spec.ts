import { expect, test } from "@playwright/test";

test("Perfil desktop e ícones dos Cadernos nos dois temas", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Navegação lateral do desktop");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Navegação principal" });
  for (const theme of ["Claro", "Escuro"]) {
    await page.getByLabel(/Aparência: tema/).click();
    await page.getByRole("button", { name: theme, exact: true }).click();
    await navigation.getByRole("button", { name: "Perfil", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Preferências de estudo" })).toBeVisible();
    await expect(navigation.getByRole("button", { name: "Perfil", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await navigation.getByRole("button", { name: "Cadernos", exact: true }).click();
    if (theme === "Claro") {
      await page.getByRole("button", { name: "Crie", exact: true }).click();
      await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
      await page.getByRole("button", { name: "Nova folha", exact: true }).click();
    } else {
      await page.getByRole("button", { name: /Abrir Meu caderno/i }).click();
      await page.getByRole("button", { name: "Ver todas as folhas" }).click();
      await page.getByRole("button", { name: "Nova folha", exact: true }).click();
    }
    for (const name of ["Digitalizar", "Escrever à mão"]) {
      const button = page.getByRole("button", { name, exact: true });
      await expect(button).toBeVisible();
      await expect(button.locator("svg")).toHaveCSS("width", "32px");
      await button.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Fechar", exact: true }).click();
    }
    await page.screenshot({ path: testInfo.outputPath(`cadernos-${theme}.png`) });
  }
});
