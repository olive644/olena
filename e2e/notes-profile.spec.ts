import { expect, test } from "@playwright/test";

test("Perfil desktop e ícones dos Cadernos nos dois temas", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Navegação lateral do desktop");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Navegação principal" });
  for (const theme of ["Claro", "Escuro"]) {
    await page.locator(".page-header__theme .appearance-picker__trigger").click();
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
      await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    } else {
      await page.getByRole("button", { name: /Abrir Meu caderno/i }).click();
      await page.getByRole("button", { name: /Abrir preview de Nova folha/ }).click();
    }
    const editor = page.getByRole("dialog", { name: "Escrever à mão" });
    for (const name of ["Configurações do editor", "Upload", "Exportar", "Salvar"]) {
      const button = editor.getByRole("button", { name, exact: true });
      await expect(button).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath(`cadernos-${theme}.png`) });
    await editor.getByRole("button", { name: "Fechar", exact: true }).click();
  }
});
