import { expect, test } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";

test("títulos, marcadores celestes e viagem entre vitrine e preview", async ({
  page,
}, testInfo) => {
  test.slow();
  let workspace = workspaceReducer(createInitialWorkspace(), {
    type: "notebook/added",
    id: "celestial",
    title: "Meu atlas de ideias",
    subjectId: "",
    createdAt: "2026-09-26",
  });
  for (const id of ["one", "two", "three", "four"])
    workspace = workspaceReducer(workspace, {
      type: "note/added",
      id,
      notebookId: "celestial",
      subjectId: "",
      updatedAt: "2026-09-26",
      append: true,
    });
  await page.addInitScript((state) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    if (!localStorage.getItem("helenastudy.workspace.v1"))
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
  }, workspace);
  await page.goto("/cadernos");
  const card = page.locator(".notebook-card").filter({ hasText: "Meu atlas de ideias" });
  await card.click();
  await expect(page.locator(".notebook-journey")).toBeVisible();
  await page.locator(".notebook-journey").evaluate(() =>
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 570;
    }),
  );
  await page.screenshot({ path: testInfo.outputPath("abertura.png") });
  const clasp = await page.locator(".notebook-journey-clasp").boundingBox();
  const carrier = await page.locator(".notebook-journey").boundingBox();
  expect(clasp!.x).toBeGreaterThan(carrier!.x + carrier!.width * 0.9);
  await expect(page.locator(".notebook-journey-pages .notebook-sheet")).toHaveCount(2);
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.play()));
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  const toolbar = page.getByRole("toolbar", { name: "Ferramentas do caderno" });
  await expect(toolbar.getByRole("button")).toHaveText([
    "",
    "Personalizar",
    "Divisória",
    "Marcador",
    "Editar marcas",
    "Índice de folhas",
  ]);
  const title = page.getByRole("textbox", { name: "Título da folha 1", exact: true });
  await title.fill("Mapa das estrelas");
  await title.press("Enter");
  await expect(title).toHaveValue("Mapa das estrelas");
  await expect(page.getByRole("dialog", { name: "Escrever à mão" })).toHaveCount(0);
  await page.getByRole("button", { name: "Colocar marcador" }).click();
  await page.locator('.notebook-sheet[data-page-id="one"]').click();
  await page.getByRole("button", { name: "Sol", exact: true }).click();
  await page.getByRole("button", { name: "Pronto", exact: true }).click();
  await expect(page.locator('.notebook-attached-tab svg[data-motif="sun"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Colocar marcador" }).click();
  await page.locator('.notebook-sheet[data-page-id="two"]').click();
  await page.getByRole("button", { name: "Pronto", exact: true }).click();
  await expect(page.locator('.notebook-attached-tab svg[data-motif="moon"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Colocar divisória" }).click();
  const book = page.locator(".notebook-paper-spread");
  const rect = (await book.boundingBox())!;
  await page.mouse.click(rect.x + rect.width - 6, rect.y + rect.height * 0.32);
  await page.getByRole("button", { name: "Pronto", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("caderno-celeste.png") });
  await page.getByRole("button", { name: "Próxima ›" }).click();
  await expect(book).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".notebook-attached-tab.is-buried")).toHaveCount(3);
  for (const mark of await page.locator(".notebook-attached-tab.is-buried").all()) {
    expect(
      await mark.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        const divider = node.classList.contains("is-divider");
        const x = divider ? bounds.right - 12 : bounds.x + bounds.width / 2;
        const y = divider ? bounds.y + bounds.height / 2 : bounds.bottom - 16;
        return node.contains(document.elementFromPoint(x, y));
      }),
    ).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("marcas-sob-folhas.png") });
  await page.getByRole("button", { name: "Personalizar", exact: true }).click();
  await expect(page.locator(".notebook-journey")).toBeVisible();
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  await expect(page.locator(".notebook-concept-cover .book-cover")).toBeVisible();
  await page.getByRole("button", { name: "Ver folhas", exact: true }).click();
  await expect(page.locator(".notebook-journey")).toBeVisible();
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  await expect(page.locator(".notebook-journey")).toBeVisible();
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  await expect(card).toBeFocused();
  await expect(card.locator('[data-motif="sun"]')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("capa-celeste.png") });
  await page.reload();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await card.click();
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  await expect(title).toHaveValue("Mapa das estrelas");
  await expect(page.locator('.notebook-attached-tab svg[data-motif="sun"]')).toHaveCount(1);
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
    await expect(page.getByRole("button", { name: "Criar nova folha" })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath("celeste-320.png") });
  }
});
