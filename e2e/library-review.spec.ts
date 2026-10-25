import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

for (const theme of ["light", "dark"]) {
  test(`baralhos, edição, TSV e limite diário: ${theme}`, async ({ page }, info) => {
    const workspace = createInitialWorkspace();
    workspace.flashcards = [
      {
        id: "card",
        subjectId: workspace.subjects[0]!.id,
        front: "Pergunta inicial",
        back: "Resposta inicial",
        intervalDays: 0,
        nextReview: "2020-01-01",
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
    await page.goto("/biblioteca");
    await page.getByRole("button", { name: "Editar flashcard", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "Editar flashcard", exact: true });
    await dialog.getByRole("textbox", { name: "Frente", exact: true }).fill("Pergunta corrigida");
    await dialog.getByRole("textbox", { name: "Baralho", exact: true }).fill("Revisão ENEM");
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Pergunta corrigida", { exact: true })).toBeVisible();
    await page.getByLabel("Cartões novos por dia").fill("0");
    await expect(
      page.getByRole("button", { name: "Revisar flashcards", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Cartões novos por dia").fill("20");
    await page.getByRole("button", { name: "Revisar flashcards", exact: true }).click();
    await expect(page.getByText("Resposta inicial", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Revelar resposta", exact: true }).click();
    await expect(page.getByText("Resposta inicial", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fácil", exact: true }).click();
    await expect(page.getByText("Revisão concluída!", { exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByRole("button", { name: "Importar TSV", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Importar TSV", exact: true });
    await dialog
      .getByLabel("Conteúdo TSV", { exact: true })
      .fill("Capital do Brasil\tBrasília\tGeografia");
    await dialog.getByRole("button", { name: "Prévia da importação", exact: true }).click();
    await expect(dialog.getByText("1 cartões para importar", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Confirmar importação", exact: true }).click();
    await expect(page.getByText("Capital do Brasil", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Pergunta corrigida", { exact: true })).toBeVisible();
    await expect(page.getByText("Capital do Brasil", { exact: true })).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`biblioteca-baralhos-${theme}.png`),
      animations: "disabled",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Excluir flashcard", exact: true }).last().click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByText("Capital do Brasil", { exact: true })).toBeVisible();
  });
}
