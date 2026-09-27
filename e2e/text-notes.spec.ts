import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

test("cria Note, escreve, mostra preview e reabre texto salvo", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((state) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    if (!localStorage.getItem("helenastudy.workspace.v1"))
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
  }, createInitialWorkspace());
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Note", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Ideias para amanhã");
  await page.getByRole("button", { name: "Criar Note", exact: true }).click();
  const editor = page.getByRole("region", { name: "Editor de Note" });
  await expect(editor).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Escrever à mão", exact: true })).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Texto da Note", exact: true })
    .fill(
      "Uma ideia pequena pode virar algo incrível.\nGuardar as referências e escrever todos os dias.",
    );
  await page
    .getByRole("textbox", { name: "Título da Note", exact: true })
    .fill("Meu diário de ideias");
  await page.screenshot({ path: info.outputPath("note-editor.png") });
  await page.getByRole("button", { name: "Voltar à vitrine", exact: true }).click();
  const card = page.getByRole("button", { name: "Abrir Meu diário de ideias", exact: true });
  await expect(card.locator(".text-note-preview__excerpt")).toContainText("Uma ideia pequena");
  await page.screenshot({ path: info.outputPath("note-preview.png") });
  await page.reload();
  await card.click();
  await expect(page.getByRole("textbox", { name: "Texto da Note", exact: true })).toHaveValue(
    /Guardar as referências/,
  );
  await page.evaluate(() => localStorage.setItem("helenastudy.theme", "dark"));
  await page.reload();
  await card.click();
  await expect(page.getByRole("textbox", { name: "Texto da Note", exact: true })).toHaveCSS(
    "color",
    "rgb(41, 36, 50)",
  );
  await page.screenshot({ path: info.outputPath("note-dark.png") });
  await page.getByRole("button", { name: "Voltar à vitrine", exact: true }).click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Pasta", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Minhas ideias");
  await page.getByRole("button", { name: "Criar pasta", exact: true }).click();
  const folder = page.locator(".paper-folder").first();
  await card.scrollIntoViewIfNeeded();
  const source = (await card.locator(".text-note-preview").boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + 30);
  await page.mouse.down();
  if (info.project.name === "mobile") {
    const shelf = (await page.locator(".notebook-shelf").first().boundingBox())!;
    await page.mouse.move(shelf.x + 14, source.y + 30, { steps: 8 });
    await expect
      .poll(() => folder.evaluate((element) => element.getBoundingClientRect().left >= 0))
      .toBe(true);
  }
  const target = (await folder.locator(".paper-folder-front").boundingBox())!;
  await page.mouse.move(target.x + target.width / 2, target.y + 30, { steps: 8 });
  await page.mouse.up();
  await expect(folder.locator(".paper-folder-copy")).toContainText("1 de 3 itens");
  await folder.getByRole("button", { name: "Abrir pasta Minhas ideias", exact: true }).click();
  await expect(folder.locator(".text-note-preview__excerpt")).toContainText("Uma ideia pequena");
  await page.screenshot({ path: info.outputPath("note-folder.png"), fullPage: true });
  await folder.getByRole("button", { name: "Abrir Meu diário de ideias", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Texto da Note", exact: true })).toHaveValue(
    /Guardar as referências/,
  );
  await page.getByRole("button", { name: "Voltar à vitrine", exact: true }).click();
  const mini = folder.locator(".paper-folder-book");
  await mini.scrollIntoViewIfNeeded();
  const miniRect = (await mini.boundingBox())!;
  const shelf = (await page.locator(".notebook-shelf").first().boundingBox())!;
  await page.mouse.move(miniRect.x + miniRect.width / 2, miniRect.y + 10);
  await page.mouse.down();
  await page.mouse.move(shelf.x + 4, miniRect.y + 10, { steps: 8 });
  await page.mouse.up();
  await expect(folder.locator(".paper-folder-book")).toHaveCount(0);
  await expect(page.locator(".notebook-card .text-note-preview")).toHaveCount(1);
});
