import { expect, test } from "@playwright/test";

test("cria cadernos gerais e mantém folhas após recarregar", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  async function openShelf() {
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Mais", exact: true }).click();
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
  }
  await openShelf();
  for (const title of [
    "Ideias que florescem",
    "Além do horizonte",
    "Pequenas descobertas",
    "Meu universo",
  ]) {
    await page.getByLabel("Nome do novo caderno").fill(title);
    await page.getByRole("button", { name: "Novo caderno", exact: true }).click();
    await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  }
  await expect(page.locator(".book-cover")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("vitrine.png"), fullPage: true });
  await page.getByRole("button", { name: "Abrir Meu universo", exact: true }).click();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByLabel("Conteúdo da folha").fill("Uma ideia sem matéria.");
  await page.reload();
  await openShelf();
  await page.getByRole("button", { name: "Abrir Meu universo", exact: true }).click();
  await page.locator(".notebook-page-card").click();
  await expect(page.getByLabel("Conteúdo da folha")).toHaveValue("Uma ideia sem matéria.");
});
