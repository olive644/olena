import { expect, test } from "@playwright/test";
import { openHandwritingA4 } from "./notebook-helpers";

// Na folha escura, post-its e tabelas trocam o fundo claro por tons escuros com texto claro.
test("post-it e tabela ficam escuros na folha noite e voltam ao claro na folha clara", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await editor.getByRole("button", { name: "Adicionar post-it", exact: true }).click();
  const note = editor.locator(".handwriting-sticky--yellow").first();
  await expect(note).toBeVisible();
  await expect(note).toHaveCSS("background-color", "rgb(255, 240, 181)");

  const color = editor.getByRole("button", { name: "Cor da folha", exact: true });
  if ((await editor.getByRole("button", { name: "Escura", exact: true }).count()) === 0)
    await color.click();
  await editor.getByRole("button", { name: "Escura", exact: true }).click();
  await expect(editor.locator(".handwriting-page-shell")).toHaveAttribute(
    "data-paper-color",
    "night",
  );
  await expect(note).toHaveCSS("background-color", "rgb(93, 79, 34)");
  await expect(note.locator("textarea")).toHaveCSS("color", "rgb(255, 249, 239)");

  await editor.getByRole("button", { name: "Adicionar tabela", exact: true }).click();
  const table = editor.locator(".handwriting-sticky--table").first();
  await expect(table).toBeVisible();
  await expect(table).toHaveCSS("background-color", "rgb(93, 79, 34)");
  // A tabela segue a cor escolhida (amarelo, azul ou lilás) também na folha noite.
  await expect(table.locator(".handwriting-sticky__table-grid")).toHaveCSS(
    "background-color",
    "rgb(93, 79, 34)",
  );
  await expect(table.locator("td textarea").first()).toHaveCSS("color", "rgb(255, 249, 239)");

  if ((await editor.getByRole("button", { name: "Clara", exact: true }).count()) === 0)
    await color.click();
  await editor.getByRole("button", { name: "Clara", exact: true }).click();
  await expect(note).toHaveCSS("background-color", "rgb(255, 240, 181)");
  await expect(table).toHaveCSS("background-color", "rgb(255, 240, 181)");
});
