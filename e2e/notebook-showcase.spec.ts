import { expect, test } from "@playwright/test";

test("caderno usa uma única prévia para criar, abrir, folhear e remover", async ({
  page,
}, testInfo) => {
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
  await page.getByLabel("Nome", { exact: true }).fill("Meu universo");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();

  const preview = page.getByRole("region", { name: "Preview do caderno" });
  await expect(preview).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar PDF" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /Anotações/ })).toHaveCount(0);
  await preview.getByRole("button", { name: "Criar primeira folha" }).click();

  let editor = page.getByRole("dialog", { name: "Escrever à mão" });
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Criar próxima folha" }).click();
  await editor.getByRole("button", { name: "Fechar", exact: true }).click();
  if (await editor.getByRole("button", { name: "Fechar e manter rascunho" }).isVisible())
    await editor.getByRole("button", { name: "Fechar e manter rascunho" }).click();
  await expect(preview).toBeVisible();
  await expect(preview.getByText("2 folhas guardadas")).toBeVisible();
  await expect(preview.getByRole("button", { name: "Criar nova folha" })).toBeVisible();

  const book = preview.getByLabel("Prévia folheável do caderno");
  const bounds = await book.boundingBox();
  if (!bounds) throw new Error("Livro não foi renderizado");
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(preview.getByText("Folhas 1 e 2 de 2")).toBeVisible();

  await preview.getByRole("button", { name: "Remover folha 2", exact: true }).click();
  await expect(preview.getByText("1 folha guardada")).toBeVisible();
  await preview.getByRole("button", { name: /Abrir preview de Nova folha/ }).click();
  editor = page.getByRole("dialog", { name: "Escrever à mão" });
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("button", { name: /Remover Nova folha/ })).toBeVisible();
});
