import { expect, test } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";

test.beforeEach(async ({ page }) => {
  let workspace = createInitialWorkspace();
  for (let i = 1; i <= 4; i++)
    workspace = workspaceReducer(workspace, {
      type: "notebook/added",
      id: `book-${i}`,
      title: `Caderno ${i}`,
      subjectId: "",
      createdAt: "2026-09-26",
    });
  await page.addInitScript((state) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
  }, workspace);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cadernos");
});

test("pastas papercraft guardam três cadernos e limitam três pastas por vitrine", async ({
  page,
}, info) => {
  for (let i = 1; i <= 3; i++) {
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Pasta", exact: true }).click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill(`Pasta ${i}`);
    await page.getByRole("button", { name: "Criar pasta", exact: true }).click();
  }
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await expect(page.getByRole("button", { name: "Criar pasta", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Abrir pasta Pasta 1", exact: true }).click();
  const folder = page
    .locator(".paper-folder")
    .filter({ has: page.getByRole("button", { name: "Fechar pasta Pasta 1", exact: true }) });
  for (let i = 1; i <= 3; i++) await folder.getByLabel("Guardar caderno").selectOption(`book-${i}`);
  await expect(folder.getByLabel("Guardar caderno")).toBeDisabled();
  await page.screenshot({ path: info.outputPath("pastas-papercraft.png") });
  await folder.getByRole("button", { name: "Retirar Caderno 2 da pasta" }).click();
  await expect(folder.getByLabel("Guardar caderno")).toBeEnabled();
  await folder.getByLabel("Guardar caderno").selectOption("book-4");
  await folder.getByRole("button", { name: "Desfazer pasta e manter cadernos" }).click();
  await expect(page.locator(".notebook-card")).toHaveCount(4);
});

test("tamanho percentual e fundos corretos no modo escuro", async ({ page }, info) => {
  await page.evaluate(() => localStorage.setItem("helenastudy.theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".notebook-card").filter({ hasText: "Caderno 1" }).click();
  await page.getByRole("button", { name: "Criar primeira folha" }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Caneta", exact: true }).click();
  const pen = editor.getByRole("slider", { name: "Espessura do pincel" });
  await expect(pen).toBeVisible();
  await pen.fill("0");
  await expect(pen).toHaveAttribute("aria-valuetext", "0%");
  await pen.fill("100");
  await expect(pen).toHaveAttribute("aria-valuetext", "100%");
  await editor.getByRole("button", { name: "Borracha", exact: true }).click();
  const eraser = editor.getByRole("slider", { name: "Tamanho da borracha" });
  await expect(eraser).toBeVisible();
  await eraser.fill("37");
  await expect(eraser).toHaveAttribute("aria-valuetext", "37%");
  await expect(editor.locator(".handwriting-tool-group")).toHaveCSS(
    "background-color",
    "rgb(41, 36, 50)",
  );
  await page.screenshot({ path: info.outputPath("borracha-escura-percentual.png") });
  await editor.getByRole("button", { name: "Compartilhar caderno", exact: true }).click();
  await editor.getByRole("button", { name: "Fechar painel de colaboração" }).click();
  await expect(editor.locator(".notebook-collaboration-panel")).toHaveCount(0);
  await editor.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.locator("input.notebook-sheet-title")).toHaveCSS(
    "background-color",
    "rgb(255, 249, 239)",
  );
});
