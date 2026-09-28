import { expect, test } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";

test("formas aparecem na área visível e borracha alterna pelos ícones", async ({ page }, info) => {
  await page.addInitScript((dark) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helenastudy.theme", dark ? "dark" : "light");
  }, info.project.name === "mobile");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.screenshot({ path: info.outputPath("criar.png") });
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await editor.getByRole("button", { name: "Inserir forma", exact: true }).click();
  const shapes = page.getByRole("dialog", { name: "Inserir forma", exact: true });
  await expect(shapes).toBeVisible();
  await expect(shapes).toHaveCSS("color", "rgb(41, 36, 50)");
  await page.screenshot({ path: info.outputPath("formas.png") });
  await shapes.getByRole("button", { name: "Retângulo", exact: true }).click();
  await expect(shapes).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Selecionar traços", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  // Há pixels de tinta na parte da folha que está dentro do viewport, sem rolar até o centro do quadro.
  await expect
    .poll(() =>
      editor.locator(".handwriting-canvas").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const bounds = canvas.getBoundingClientRect();
        const viewport = canvas.closest(".handwriting-viewport")!.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.round(((viewport.left - bounds.left) * canvas.width) / bounds.width),
        );
        const y = Math.max(
          0,
          Math.round(((viewport.top - bounds.top) * canvas.height) / bounds.height),
        );
        const width = Math.min(
          canvas.width - x,
          Math.floor((viewport.width * canvas.width) / bounds.width),
        );
        const height = Math.min(
          canvas.height - y,
          Math.floor((viewport.height * canvas.height) / bounds.height),
        );
        const { data } = canvas.getContext("2d")!.getImageData(x, y, width, height);
        let ink = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i]! < 80 && data[i + 1]! < 80 && data[i + 2]! < 100) ink++;
        return ink;
      }),
    )
    .toBeGreaterThan(100);
  await editor.getByRole("button", { name: "Borracha", exact: true }).click();
  const whole = editor.getByRole("button", { name: "Apagar o traço inteiro", exact: true });
  await whole.click();
  await expect(whole).toHaveAttribute("aria-pressed", "true");
  const partial = editor.getByRole("button", { name: "Apagar só o trecho tocado", exact: true });
  await partial.click();
  await expect(partial).toHaveAttribute("aria-pressed", "true");
  await expect(whole).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({ path: info.outputPath("borracha.png") });
});

test("vitrines limitam todos os objetos e exibem marcadores na frente da prateleira", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let state = createInitialWorkspace();
  for (let i = 0; i < 7; i++)
    state = workspaceReducer(state, {
      type: "notebook/added",
      id: `item-${i}`,
      title: `Objeto ${i}`,
      subjectId: "",
      createdAt: "2026-09-28",
      ...(i < 3 ? { kind: "collection" as const, shelf: 0 } : {}),
    });
  state = workspaceReducer(state, {
    type: "note/added",
    id: "sheet",
    notebookId: "item-3",
    subjectId: "",
    updatedAt: "2026-09-28",
  });
  state = workspaceReducer(state, {
    type: "notebook/organized",
    id: "item-3",
    changes: {
      paperTabs: [
        {
          id: "mark",
          kind: "bookmark",
          pageId: "sheet",
          label: "Lua",
          color: "#7c3aed",
          position: 0.3,
          motif: "moon",
        },
      ],
    },
  });
  await page.addInitScript((workspace) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
  }, state);
  await page.goto("/cadernos");
  const shelves = page.locator(".notebook-shelf");
  await expect(shelves).toHaveCount(2);
  await expect(
    shelves.first().locator(".notebook-grid > :is(.notebook-card, .paper-folder)"),
  ).toHaveCount(4);
  const cover = page
    .getByRole("button", { name: "Abrir Objeto 3", exact: true })
    .locator(".book-cover");
  await cover.scrollIntoViewIfNeeded();
  await expect(cover.locator(".book-cover__mark.is-bookmark")).toBeVisible();
  expect(
    Number(await cover.evaluate((element) => getComputedStyle(element).zIndex)),
  ).toBeGreaterThan(
    Number(
      await shelves
        .first()
        .locator(".notebook-shelf__rail")
        .evaluate((element) => getComputedStyle(element).zIndex),
    ),
  );
  await page.screenshot({ path: info.outputPath("vitrines.png"), fullPage: true });
});
