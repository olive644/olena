import { expect, test, type Page } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";

async function openNotebook(page: Page, pageCount: number) {
  let workspace = workspaceReducer(createInitialWorkspace(), {
    type: "notebook/added",
    id: "turn",
    title: "Folheio",
    subjectId: "",
    createdAt: "2026-09-26",
  });
  for (let index = 0; index < pageCount; index++)
    workspace = workspaceReducer(workspace, {
      type: "note/added",
      id: `p${index}`,
      notebookId: "turn",
      subjectId: "",
      updatedAt: "2026-09-26",
      append: true,
    });
  workspace = workspaceReducer(workspace, {
    type: "notebook/organized",
    id: "turn",
    changes: {
      paperTabs: [
        { id: "d1", kind: "divider", pageId: "p1", label: "P1", color: "#7C3AED", position: 0.2 },
        {
          id: "b1",
          kind: "bookmark",
          pageId: "p1",
          label: "",
          color: "#E04F7A",
          position: 0.3,
          motif: "moon",
        },
        { id: "d4", kind: "divider", pageId: "p4", label: "P4", color: "#5887C9", position: 0.6 },
      ],
    },
  });
  await page.addInitScript((state) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    if (!localStorage.getItem("helenastudy.workspace.v1"))
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
  }, workspace);
  await page.goto("/cadernos");
  await page.locator(".notebook-card").filter({ hasText: "Folheio" }).click();
  await expect(page.locator(".notebook-journey")).toHaveCount(0, { timeout: 15_000 });
}

const next = (page: Page) => page.getByRole("button", { name: "Próxima ›", exact: true });
const settled = (page: Page) =>
  expect(page.locator(".notebook-paper-spread")).toHaveAttribute("aria-busy", "false");

test("divisória e marcador ficam na pilha da folha deles e viajam com ela ao virar", async ({
  page,
}) => {
  test.slow();
  await openNotebook(page, 6);
  const divider = page.getByRole("button", { name: /^Divisória P1/ });
  const bookmark = page.locator(".notebook-attached-tab.is-bookmark").first();
  // Folha 1 ainda está na pilha da direita: as duas marcas saem pela direita.
  await expect(divider).toHaveClass(/is-right/);
  await expect(bookmark).toHaveClass(/is-right/);
  await next(page).click();
  // Em pleno giro a marca viaja na folha (frente e verso) e a camada fixa não a repete.
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.pause()));
  await expect(page.locator(".notebook-turn .notebook-ride-tab.is-divider")).toHaveCount(2);
  await expect(page.locator(".notebook-turn .notebook-ride-tab.is-bookmark")).toHaveCount(2);
  await expect(
    page
      .locator(".notebook-attached-tabs .notebook-attached-tab:not(.notebook-ride-tab)")
      .filter({ hasText: "P1" }),
  ).toHaveCount(0);
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.play()));
  await settled(page);
  // Pousou: agora a folha 1 está na pilha da esquerda e as marcas vão para a esquerda.
  await expect(divider).toHaveClass(/is-left/);
  await expect(page.locator(".notebook-turn")).toHaveCount(0);
  // Voltar devolve as marcas para o lado de onde saíram.
  await page.getByRole("button", { name: "‹ Anterior", exact: true }).click();
  await settled(page);
  await expect(divider).toHaveClass(/is-right/);
  // Virar duas folhas seguidas não deixa marca para trás nem repetida.
  await next(page).click();
  await settled(page);
  await next(page).click();
  await settled(page);
  await expect(page.locator(".notebook-attached-tab.is-divider")).toHaveCount(2);
  await expect(page.locator(".notebook-attached-tab.is-bookmark")).toHaveCount(1);
});

test("a contracapa abre depois da última folha e volta a ela", async ({ page }) => {
  test.slow();
  await openNotebook(page, 4);
  await next(page).click();
  await settled(page);
  // Na última folha a seta de avançar passa a abrir a contracapa.
  const toBack = page.getByRole("button", { name: "Contracapa ›", exact: true });
  await expect(toBack).toBeEnabled();
  await toBack.click();
  await expect(page.locator(".notebook-journey")).toBeVisible();
  await expect(page.locator(".notebook-journey")).toHaveCount(0, { timeout: 10_000 });
  const back = page.getByRole("button", { name: "‹ Última folha", exact: true });
  await expect(back).toBeVisible();
  await expect(page.locator(".notebook-concept-cover.is-back")).toBeVisible();
  await expect(page.getByText("ESTE CADERNO PERTENCE A")).toBeVisible();
  await back.click();
  await expect(page.locator(".notebook-journey")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(".notebook-paper-spread")).toBeVisible();
  await expect(page.getByText("Folhas 3 e 4 de 4")).toBeVisible();
  // Teclado: seta para a direita na última folha também abre a contracapa.
  await page.locator(".notebook-paper-spread").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".notebook-journey")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(".notebook-concept-cover.is-back")).toBeVisible();
});

test("com movimento reduzido a contracapa abre sem animação", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openNotebook(page, 2);
  await page.getByRole("button", { name: "Contracapa ›", exact: true }).click();
  await expect(page.locator(".notebook-journey")).toHaveCount(0);
  await expect(page.locator(".notebook-concept-cover.is-back")).toBeVisible();
});
