import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

test("imagem enviada em uma pasta da Biblioteca persiste e abre sem enviar o arquivo", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Criar na prateleira", exact: true }).click();
  await page.getByRole("button", { name: /^Pasta/ }).click();
  const folderDialog = page.getByRole("dialog", { name: "Criar pasta", exact: true });
  await folderDialog.getByLabel("Nome da pasta", { exact: true }).fill("Revisão");
  await folderDialog.getByRole("button", { name: "Criar pasta", exact: true }).click();
  await page
    .getByRole("button", { name: /Revisão/ })
    .first()
    .click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "paper.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9b8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("paper.png", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: /Revisão/ })
    .first()
    .click();
  await expect(page.getByText("paper.png", { exact: true })).toBeVisible();
});

for (const theme of ["light", "dark"]) {
  test(`Note cria cartão do trecho e vincula material da Biblioteca: ${theme}`, async ({
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
    await page.screenshot({
      path: info.outputPath(`nota-com-fonte-${theme}.png`),
      animations: "disabled",
    });
  });
}
