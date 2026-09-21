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
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByLabel("Nome", { exact: true }).fill(title);
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  }
  await expect(page.locator(".book-cover")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("vitrine.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Abrir Meu universo", exact: true }).click();
  await page.getByRole("button", { name: "Ver todas as folhas" }).click();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByLabel("Título da folha").fill("Uma ideia sem matéria.");
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByLabel("Título da folha").fill("Segunda ideia");
  await page.reload();
  await openShelf();
  await page.getByRole("button", { name: "Abrir Meu universo", exact: true }).click();
  await expect(page.getByRole("region", { name: "Preview do caderno" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir preview de Segunda ideia" })).toBeVisible();
  await expect(page.locator(".notebook-page-grid")).toHaveCount(0);
  await page.waitForTimeout(2700);
  await expect(page.getByRole("region", { name: "Preview do caderno" })).toBeVisible();
  await page.getByRole("button", { name: "Próxima ›" }).click();
  await expect(
    page.getByRole("button", { name: "Abrir preview de Uma ideia sem matéria." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "‹ Anterior" }).click();
  await expect(page.getByRole("button", { name: "Abrir preview de Segunda ideia" })).toBeVisible();
  await page.getByRole("button", { name: "Próxima ›" }).click();
  await expect(page.getByRole("button", { name: "‹ Anterior" })).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("preview-folhas.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Abrir preview de Uma ideia sem matéria." }).click();
  await expect(page.getByLabel("Título da folha")).toHaveValue("Uma ideia sem matéria.");
  await page.getByRole("button", { name: "Folhas do caderno", exact: true }).click();
  await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: /Anotações/ }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Ideias soltas");
  await page.getByRole("button", { name: "Criar pasta" }).click();
  await page.getByRole("button", { name: "Nova nota", exact: true }).click();
  await page.getByLabel("Título da folha").fill("Meu primeiro rascunho");
  await page.getByLabel("Conteúdo da folha").fill("Uma ideia guardada na pasta.");
  await expect(page.getByRole("button", { name: "Escrever à mão" })).toHaveCount(0);
  await page.getByRole("button", { name: "Anotações", exact: true }).click();
  await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  const folder = page.getByRole("button", { name: "Abrir Ideias soltas", exact: true });
  const book = page.getByRole("button", { name: "Abrir Meu universo", exact: true });
  await folder.scrollIntoViewIfNeeded();
  const from = await folder.boundingBox();
  const to = await book.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  if (!from || !to) throw new Error("Capas ausentes");
  await page.mouse.move(from.x + 40, from.y + 80);
  await page.mouse.down();
  await page.mouse.move(to.x + 20, to.y + 80, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole("status")).toContainText("Pasta guardada");
  await page.reload();
  await openShelf();
  await expect(page.getByRole("button", { name: "Abrir Ideias soltas", exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Abrir Meu universo", exact: true }).click();
  await page.getByRole("button", { name: "Ver todas as folhas" }).click();
  await page.getByRole("tab", { name: /Anotações/ }).click();
  await page.getByRole("button", { name: /Ideias soltas/ }).click();
  await page.getByRole("button", { name: /Meu primeiro rascunho/ }).click();
  await expect(page.getByLabel("Conteúdo da folha")).toHaveValue("Uma ideia guardada na pasta.");
  await page.getByRole("button", { name: "Anotações", exact: true }).click();
  await page.getByRole("button", { name: "Abrir caderno", exact: true }).click();
  await page.getByRole("button", { name: "Devolver à vitrine" }).click();
  await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Abrir Ideias soltas", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("vitrine-com-pasta.png"),
    fullPage: true,
    animations: "disabled",
  });
});
