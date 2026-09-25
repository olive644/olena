import { expect, test } from "@playwright/test";

test("preview limpo e abas das folhas navegam pelo caderno", async ({ page }, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  const preview = page.getByRole("region", { name: "Preview do caderno" });
  await expect(preview.getByText("MEU UNIVERSO PARTICULAR")).toHaveCount(0);
  await expect(preview.getByText("Escolha uma folha para continuar suas ideias.")).toHaveCount(0);
  await preview.getByRole("button", { name: "Criar primeira folha" }).click();
  await page
    .getByRole("dialog", { name: "Escrever à mão" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await preview.getByRole("button", { name: "Criar nova folha" }).click();
  await page
    .getByRole("dialog", { name: "Escrever à mão" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  const tabs = preview.getByRole("navigation", { name: "Abas das folhas" });
  await expect(tabs.getByRole("button")).toHaveCount(2);
  await tabs.getByRole("button", { name: /Ir para folha 1:/ }).click();
  await expect(preview.getByText("Folha 1 de 2")).toBeVisible();
  await tabs.getByRole("button", { name: /Ir para folha 2:/ }).click();
  await expect(preview.getByText("Folha 2 de 2")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("abas-do-caderno.png") });
  await preview.getByRole("button", { name: /Abrir preview de / }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão" });
  const gear = editor.locator('[data-paper-editor-icon="settings"]');
  await expect(gear.locator('path[fill="#17151C"]')).toHaveCount(0);
  await editor.getByRole("button", { name: "Configurações do editor" }).click();
  const close = page.getByRole("button", { name: "Fechar configurações" });
  await expect(close.locator("path[transform]")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("configuracoes-e-fechar.png") });
});
