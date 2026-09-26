import { expect, test } from "@playwright/test";

test("índice de folhas: ver miniaturas, reordenar e ir a uma folha", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo do editor verificado no desktop.");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Caderno de teste");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await expect(dialog).toBeVisible();

  // Sem segunda folha não há índice; criar a próxima folha o habilita.
  await expect(page.getByRole("button", { name: "Abrir índice de folhas" })).toHaveCount(0);
  await page.getByRole("button", { name: "Criar próxima folha" }).click();
  await expect(page.getByText("Folha 2 de 2")).toBeVisible();

  await page.getByRole("button", { name: "Abrir índice de folhas" }).click();
  const index = page.getByRole("dialog", { name: "Índice de folhas" });
  await expect(index.getByText("2 folhas")).toBeVisible();
  await expect(index.getByRole("button", { name: /^Folha 2:/ })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // Reordenar: a folha atual (2) passa para trás; ela vira a folha 1.
  await index.getByRole("button", { name: "Mover a folha 2 para trás" }).click();
  await expect(index.getByRole("button", { name: /^Folha 1:/ })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // Ir para a outra folha fecha o índice e troca a folha.
  await index.getByRole("button", { name: /^Folha 2:/ }).click();
  await expect(index).toHaveCount(0);
  await expect(page.getByText("Folha 2 de 2")).toBeVisible();
});
