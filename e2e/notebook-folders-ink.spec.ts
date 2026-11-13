import { expect, test } from "@playwright/test";
import { activateHandwritingPen } from "./notebook-helpers";
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
    if (!localStorage.getItem("helenastudy.workspace.v1"))
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
  }, workspace);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cadernos");
});

test("salvamento confirmado, índice legível e capa única", async ({ page }, info) => {
  await page.evaluate(() => localStorage.setItem("helenastudy.theme", "dark"));
  await page.reload();
  await page.getByRole("button", { name: "Abrir Caderno 1", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha" }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await editor.getByRole("button", { name: "Salvar caderno", exact: true }).click();
  await expect(editor.getByText("Folha salva no caderno", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Índice de folhas", exact: true }).click();
  const index = page.getByRole("dialog", { name: "Índice de folhas" });
  await expect(index.getByRole("button", { name: "Só favoritas" })).toHaveCSS(
    "color",
    "rgb(41, 36, 50)",
  );
  await page.screenshot({ path: info.outputPath("indice-legivel.png") });
  await index.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Personalizar", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "‹ Capa", exact: true }).click();
  await expect(page.locator(".notebook-cover-inventory")).toHaveCount(0);
  await expect(page.locator(".notebook-card .book-cover__concept").first()).toHaveAttribute(
    "src",
    "/notebook-covers/capa-estrelas.webp",
  );
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("capa-fixa.png") });
});

test("tamanho percentual e fundos corretos no modo escuro", async ({ page }, info) => {
  await page.evaluate(() => localStorage.setItem("helenastudy.theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".notebook-card").filter({ hasText: "Caderno 1" }).click();
  await page.getByRole("button", { name: "Criar primeira folha" }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await expect(editor).toBeVisible();
  await activateHandwritingPen(page);
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
  await expect(page.locator("input.notebook-sheet-title")).toHaveCount(0);
});
