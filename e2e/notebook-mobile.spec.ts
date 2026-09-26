import { expect, test } from "@playwright/test";

test("celular distribui ações e recolhe as opções para liberar a folha", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Mais ferramentas" })
    .getByRole("button", { name: "Cadernos", exact: true })
    .click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  const preview = page.getByRole("region", { name: "Preview do caderno" });
  const book = await preview.locator(".notebook-paper-spread").boundingBox();
  expect(book!.x).toBeGreaterThanOrEqual(0);
  expect(book!.x + book!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: info.outputPath("preview-mobile.png") });
  await preview.getByRole("button", { name: "Criar primeira folha" }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await expect(editor.getByRole("button", { name: "Mover folha", exact: true })).toBeHidden();
  await expect(editor.getByRole("button", { name: "Tinta Roxo" })).toBeHidden();
  const paper = await editor
    .getByRole("button", { name: "Tipo de papel", exact: true })
    .boundingBox();
  const canvas = await editor.locator(".handwriting-viewport").boundingBox();
  const tools = await editor.locator(".handwriting-tool-group").boundingBox();
  expect(paper!.y).toBeLessThan(canvas!.y);
  expect(tools!.y).toBeGreaterThanOrEqual(canvas!.y + canvas!.height - 1);
  expect(canvas!.height).toBeGreaterThan(page.viewportSize()!.height * 0.5);
  await page.screenshot({ path: info.outputPath("editor-mobile.png") });
  await editor.getByRole("button", { name: "Caneta", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Tinta Roxo" })).toBeVisible();
  await editor.getByRole("button", { name: "Tinta Roxo" }).click();
  expect(await editor.evaluate((node) => node.scrollTop)).toBe(0);
  await page.screenshot({ path: info.outputPath("caneta-mobile.png") });
  await editor.getByRole("button", { name: "Borracha", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Tinta Roxo" })).toBeHidden();
  await editor.getByRole("button", { name: "Histórico e zoom", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Lupa para ampliar" })).toBeVisible();
  await editor.getByRole("button", { name: "Recolher opções" }).click();
  await expect(editor.getByRole("button", { name: "Lupa para ampliar" })).toBeHidden();
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await editor.getByRole("button", { name: "Caneta", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Tinta Roxo" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("caneta-360-dark.png") });
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(editor.getByRole("button", { name: "Mover folha", exact: true })).toBeVisible();
  await expect(editor.locator(".notebook-mobile-dock")).toHaveCount(0);
});

test("navegação escura e gavetas do caderno mantêm contraste e ações separadas", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  await page.locator(".page-header__theme .appearance-picker__trigger").click();
  await page.getByRole("button", { name: "Escuro", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Navegação móvel" });
  const header = page.locator(".page-header");
  await expect(nav).toHaveCSS("background-color", "rgb(41, 36, 50)");
  await expect(header).toHaveCSS("background-color", "rgb(41, 36, 50)");
  await expect(page.getByRole("button", { name: "Mais ferramentas", exact: true })).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await page.screenshot({ path: info.outputPath("navegacao-escura.png") });
  await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Mais ferramentas" });
  await expect(menu.getByRole("button", { name: "Planos de aula" })).toHaveCount(0);
  await menu.getByRole("button", { name: "Cadernos", exact: true }).click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha" }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await editor.getByRole("button", { name: "Tipo de papel" }).click();
  const typeBox = await editor.locator(".handwriting-paper-options").boundingBox();
  await editor.getByRole("button", { name: "Cor da folha" }).click();
  const colorBox = await editor.locator(".handwriting-paper-options").boundingBox();
  expect(Math.abs(colorBox!.y - typeBox!.y)).toBeLessThan(5);
  await expect(editor.locator(".handwriting-paper-options")).toHaveCount(1);
  await editor.getByRole("button", { name: "Compartilhar", exact: true }).click();
  await expect(editor.locator(".handwriting-paper-options")).toHaveCount(0);
  await expect(editor.getByRole("button", { name: "PNG", exact: true })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Baixar PDF" })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Link de visualização" })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Download da folha atual" })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("compartilhar-mobile.png") });
  await editor.getByRole("button", { name: "Salvar caderno" }).click();
  await expect(editor.getByRole("button", { name: "PNG", exact: true })).toBeHidden();
});
