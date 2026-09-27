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
  await expect(folder.locator(".paper-folder-content")).toHaveCount(0);
  await expect(folder.locator(".paper-folder-copy")).toContainText("0 de 3 cadernos");
  await page.screenshot({ path: info.outputPath("pastas-papercraft.png") });
  await page.getByRole("button", { name: "Selecionar", exact: true }).click();
  await page.getByRole("button", { name: "Selecionar pasta Pasta 1", exact: true }).click();
  await page.getByRole("button", { name: "Excluir (1)", exact: true }).click();
  await expect(page.locator(".notebook-card")).toHaveCount(4);
});

for (const count of [1, 3]) {
  test(`pasta compacta com ${count} cadernos mantém capas e marcadores dentro da vitrine`, async ({
    page,
  }, info) => {
    let workspace = createInitialWorkspace();
    workspace = workspaceReducer(workspace, {
      type: "notebook/added",
      id: "folder-preview",
      kind: "collection",
      shelf: 0,
      title: "Constelação",
      subjectId: "",
      createdAt: "2026-09-26",
    });
    workspace = workspaceReducer(workspace, {
      type: "notebook/added",
      id: "book-preview",
      title: "Meu universo",
      subjectId: "",
      createdAt: "2026-09-26",
    });
    workspace = workspaceReducer(workspace, {
      type: "note/added",
      id: "page-preview",
      notebookId: "book-preview",
      subjectId: "",
      updatedAt: "2026-09-26",
    });
    workspace = workspaceReducer(workspace, {
      type: "notebook/organized",
      id: "book-preview",
      changes: {
        paperTabs: [
          {
            id: "divider-preview",
            kind: "divider",
            pageId: "page-preview",
            label: "Divisória",
            color: "#7c3aed",
            position: 0.25,
          },
          {
            id: "bookmark-preview",
            kind: "bookmark",
            pageId: "page-preview",
            label: "Lua",
            color: "#facc15",
            position: 0.55,
            motif: "moon",
          },
        ],
      },
    });
    workspace = workspaceReducer(workspace, {
      type: "notebook/stored",
      id: "book-preview",
      folderId: "folder-preview",
    });
    for (let index = 1; index < count; index++) {
      workspace = workspaceReducer(workspace, {
        type: "notebook/added",
        id: `extra-${index}`,
        title: `Ideias ${index}`,
        subjectId: "",
        createdAt: "2026-09-27",
      });
      workspace = workspaceReducer(workspace, {
        type: "notebook/stored",
        id: `extra-${index}`,
        folderId: "folder-preview",
      });
    }
    await page.addInitScript(
      (state) => localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state)),
      workspace,
    );
    if (count === 3)
      await page.addInitScript(() => localStorage.setItem("helenastudy.theme", "dark"));
    await page.reload();
    const folder = page.locator('[data-folder-drop="folder-preview"]');
    const folderRect = (await folder.boundingBox())!;
    expect(folderRect.width).toBe(info.project.name === "mobile" ? 164 : 220);
    const rail = (await page.locator(".notebook-shelf__rail").first().boundingBox())!;
    for (const book of await folder.locator(".paper-folder-book").all()) {
      const rect = (await book.boundingBox())!;
      expect(rect.y + rect.height).toBeLessThan(rail.y);
    }
    await page.screenshot({ path: info.outputPath("pasta-compacta-fechada.png"), fullPage: true });
    await folder.getByRole("button", { name: "Abrir pasta Constelação" }).click();
    const cover = folder.locator('[data-notebook-drop="book-preview"] .book-cover');
    await expect(cover).toBeVisible();
    await expect(cover.locator(".book-cover__mark.is-divider")).toHaveCount(1);
    await expect(cover.locator(".book-cover__mark.is-bookmark")).toHaveCount(1);
    const rect = (await cover.boundingBox())!;
    expect(rect.width).toBeGreaterThan(info.project.name === "mobile" ? 100 : 140);
    await page.screenshot({
      path: info.outputPath("pasta-capa-grande-marcadores.png"),
      fullPage: true,
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const animatedBook = folder.locator(".paper-folder-book").first();
    await expect(animatedBook).toHaveCSS("transition-property", "transform");
    await expect(animatedBook).toHaveCSS("transition-duration", "0.62s");
    await expect(folder.locator(".paper-folder-label")).toHaveCount(0);
    const openedTransform = await animatedBook.evaluate((node) => getComputedStyle(node).transform);
    await folder.getByRole("button", { name: "Fechar pasta Constelação" }).click();
    await expect
      .poll(() => animatedBook.evaluate((node) => node.getAnimations().length))
      .toBeGreaterThan(0);
    await expect.poll(() => animatedBook.evaluate((node) => node.getAnimations().length)).toBe(0);
    await expect(animatedBook).not.toHaveCSS("transform", openedTransform);
    await folder.getByRole("button", { name: "Abrir pasta Constelação" }).click();
    await expect
      .poll(() => animatedBook.evaluate((node) => node.getAnimations().length))
      .toBeGreaterThan(0);
    await expect(animatedBook).toHaveCSS("transform", openedTransform);
    await folder.getByRole("button", { name: "Abrir Meu universo" }).click();
    const journey = page.locator(".notebook-journey");
    await expect(journey).toBeVisible();
    await expect(journey.locator(".book-cover__mark.is-divider")).toHaveCount(1);
    await expect(journey.locator(".book-cover__mark.is-bookmark")).toHaveCount(1);
    await expect(journey).toHaveCount(0);
  });
}

test("salvamento confirmado, índice legível e capa personalizável", async ({ page }, info) => {
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
  await page.getByRole("button", { name: "Personalizar", exact: true }).click();
  const inventory = page.getByRole("region", { name: "Inventário de capas" });
  await expect(inventory.locator(".notebook-cover-inventory__item")).toHaveCount(2);
  const inventoryBounds = await inventory.boundingBox();
  const coverBounds = await page.locator(".notebook-concept-cover").boundingBox();
  expect(inventoryBounds).not.toBeNull();
  expect(coverBounds).not.toBeNull();
  expect(inventoryBounds!.x + inventoryBounds!.width).toBeLessThanOrEqual(coverBounds!.x + 2);
  await expect(
    inventory.getByRole("button", { name: "Usar capa Helena e as estrelas" }),
  ).toHaveAttribute("aria-pressed", "true");
  await inventory.getByRole("button", { name: "Usar capa Oliver e as estrelas" }).click();
  await expect(
    inventory.getByRole("button", { name: "Usar capa Oliver e as estrelas" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".notebook-concept-cover .book-cover__concept")).toHaveAttribute(
    "src",
    "/notebook-covers/oliver-estrelas.webp",
  );
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("capa-oliver.png") });
  await page.reload();
  await expect(page.locator('[data-notebook-drop="book-1"] .book-cover__concept')).toHaveAttribute(
    "src",
    "/notebook-covers/oliver-estrelas.webp",
  );
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
  await expect(page.locator("input.notebook-sheet-title")).toHaveCSS(
    "background-color",
    "rgb(255, 249, 239)",
  );
});

test("arrastar caderno para pasta e retirar, com viagem e nomes fora da prateleira", async ({
  page,
}, info) => {
  await page.evaluate(() => localStorage.setItem("helenastudy.theme", "dark"));
  await page.reload();
  await page.getByRole("button", { name: "Abrir Caderno 4", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha" }).click();
  await page
    .getByRole("dialog", { name: "Escrever à mão", exact: true })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Pasta", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Meu arquivo lunar");
  await page.getByRole("button", { name: "Criar pasta", exact: true }).click();
  const folder = page.locator(".paper-folder").first();
  const card = page.locator('.notebook-card[data-notebook-drop="book-4"]');
  await card.scrollIntoViewIfNeeded();
  const source = (await card.locator(".book-cover").boundingBox())!;
  const x = source.x + source.width / 2;
  const y = source.y + source.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (info.project.name === "mobile") {
    const shelf = (await page.locator(".notebook-shelf--objects").first().boundingBox())!;
    await page.mouse.move(shelf.x + 14, y, { steps: 8 });
    await expect
      .poll(() =>
        folder.locator(".paper-folder-front").evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left >= 0 && rect.right <= window.innerWidth;
        }),
      )
      .toBe(true);
  }
  const target = (await folder.locator(".paper-folder-front").boundingBox())!;
  await page.mouse.move(target.x + target.width / 2, target.y + 30, { steps: 8 });
  await page.mouse.up();
  await expect(folder.locator(".paper-folder-copy")).toContainText("1 de 3 cadernos");
  await folder.getByRole("button", { name: "Abrir pasta Meu arquivo lunar" }).click();
  const rail = (await page.locator(".notebook-shelf__rail").first().boundingBox())!;
  const title = (await folder.locator(".paper-folder-copy > span").boundingBox())!;
  await expect(folder.locator(".paper-folder-content")).toHaveCount(0);
  const bookTitle = (await page.locator(".notebook-card__copy strong").first().boundingBox())!;
  expect(title.y).toBeGreaterThanOrEqual(rail.y + rail.height);
  expect(bookTitle.y).toBeGreaterThanOrEqual(rail.y + rail.height);
  await page.screenshot({ path: info.outputPath("pasta-branca-aberta.png"), fullPage: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await folder.getByRole("button", { name: "Abrir Caderno 4", exact: true }).click();
  await expect(page.locator(".notebook-journey")).toBeVisible();
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  await expect(page.locator(".notebook-journey[data-returning=true]")).toBeVisible();
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  await expect(folder).toHaveClass(/is-open/);
  const mini = folder.locator('.paper-folder-book[data-notebook-drop="book-4"]');
  await mini.scrollIntoViewIfNeeded();
  const miniRect = (await mini.boundingBox())!;
  const shelf = (await page.locator(".notebook-shelf").first().boundingBox())!;
  await page.mouse.move(miniRect.x + miniRect.width / 2, miniRect.y + 10);
  await page.mouse.down();
  await page.mouse.move(shelf.x + 4, miniRect.y + 10, { steps: 8 });
  await page.mouse.up();
  await expect(folder.locator(".paper-folder-copy")).toContainText("0 de 3 cadernos");
  await expect(card).toHaveCount(1);
});
