import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

test("imagem local persiste e abre sem enviar o arquivo", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/biblioteca");
  await page.getByRole("button", { name: "Adicionar material", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título", { exact: true }).fill("Imagem de revisão");
  await dialog.getByRole("button", { name: "Tipo", exact: true }).click();
  await page.getByRole("option", { name: "Imagem", exact: true }).click();
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "paper.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9b8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Imagem de revisão/ }).click();
  dialog = page.getByRole("dialog", { name: "Imagem de revisão", exact: true });
  await expect
    .poll(() =>
      dialog
        .getByRole("img", { name: "Imagem de revisão", exact: true })
        .evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /Imagem de revisão/ }).click();
  await expect
    .poll(() =>
      page
        .getByRole("img", { name: "Imagem de revisão", exact: true })
        .evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
});

for (const theme of ["light", "dark"]) {
  test(`Note cria cartão com fonte e busca encontra o material: ${theme}`, async ({
    page,
  }, info) => {
    const workspace = createInitialWorkspace();
    const subjectId = workspace.subjects[0]!.id;
    workspace.notes = [
      {
        id: "note-source",
        title: "Note de revisão",
        content: "Uma equação preserva a igualdade.",
        subjectId,
        assets: [],
        updatedAt: "2026-10-25",
      },
    ];
    workspace.notebooks = [
      {
        id: "book-source",
        title: "Note de revisão",
        kind: "note",
        subjectId,
        pageIds: ["note-source"],
        createdAt: "2026-10-25",
      },
    ];
    workspace.materials = [
      {
        id: "material-source",
        title: "Material de álgebra",
        kind: "text",
        content: "Equação e igualdade",
        subjectId,
        createdAt: "2026-10-25",
      },
    ];
    await page.addInitScript(
      ({ workspace, theme }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", theme);
        if (!localStorage.getItem("helenastudy.workspace.v1"))
          localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
      },
      { workspace, theme },
    );
    await page.goto("/cadernos?caderno=book-source");
    await page.getByRole("button", { name: "Criar flashcard do trecho", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Criar flashcard do trecho", exact: true });
    await expect(dialog.getByRole("textbox", { name: "Frente", exact: true })).toHaveValue(
      "Uma equação preserva a igualdade.",
    );
    await dialog.getByRole("textbox", { name: "Verso", exact: true }).fill("Dois lados iguais");
    await dialog.getByRole("button", { name: "Criar flashcard", exact: true }).click();
    await page.getByRole("button", { name: "Vincular material", exact: true }).click();
    await page.getByRole("button", { name: "Material da Biblioteca", exact: true }).click();
    await page.getByRole("option", { name: "Material de álgebra", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Material de álgebra", exact: true }),
    ).toHaveAttribute("href", "/biblioteca?material=material-source");
    await page.getByRole("link", { name: "Material de álgebra", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Material de álgebra", exact: true }),
    ).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Ver fonte", exact: true })).toBeVisible();
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Buscar no Espaço", exact: true }).fill("algebra");
    await expect(
      page.getByRole("link", { name: "Material de álgebra", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`busca-biblioteca-${theme}.png`),
      animations: "disabled",
    });
  });
}
