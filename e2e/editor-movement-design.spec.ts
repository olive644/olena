import { expect, test } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";
import { SHARED_PAGE_PLACEHOLDER } from "../src/domain/handwriting";

test.beforeEach(async ({ page }) => {
  let workspace = workspaceReducer(createInitialWorkspace(), {
    type: "notebook/added",
    id: "move",
    title: "Meu caderno",
    subjectId: "",
    createdAt: "2026-09-27",
  });
  workspace = workspaceReducer(workspace, {
    type: "note/added",
    id: "sheet",
    notebookId: "move",
    subjectId: "",
    updatedAt: "2026-09-27",
  });
  workspace.notes[0]!.assets = [
    {
      id: "drawing",
      kind: "drawing",
      name: "Folha",
      createdAt: "2026-09-27",
      dataUrl: SHARED_PAGE_PLACEHOLDER,
      handwriting: {
        version: 1,
        paper: "board",
        canvasSize: { width: 3200, height: 2400 },
        strokes: [
          {
            id: "stroke",
            tool: "pen",
            color: "#292432",
            width: 4,
            points: [
              { x: 100, y: 100, pressure: 0.5 },
              { x: 300, y: 100, pressure: 0.5 },
            ],
          },
        ],
        stickies: [
          {
            id: "formula",
            kind: "text",
            formula: true,
            color: "yellow",
            ink: "#292432",
            x: 150,
            y: 160,
            width: 460,
            height: 140,
            text: "y = 2x + 1",
          },
        ],
      },
    },
  ];
  await page.addInitScript((state) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
    localStorage.setItem("helenastudy.theme", "dark");
    localStorage.setItem("helena.notebookPreferences.v1", JSON.stringify({ penOnly: true }));
  }, workspace);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Abrir Meu caderno", exact: true }).click();
  await page.getByRole("button", { name: /^Abrir preview/ }).click();
});

for (const pointerType of ["mouse", "pen", "touch"]) {
  test(`desativa caneta, move seleção com ${pointerType} e desfaz`, async ({ page }) => {
    const editor = page.locator(".handwriting-studio");
    const pen = page.getByRole("button", { name: "Caneta", exact: true });
    await expect(pen).toHaveAttribute("aria-pressed", "true");
    await pen.click();
    await expect(pen).toHaveAttribute("aria-pressed", "false");
    await expect(editor).toHaveAttribute("data-tool", "hand");
    const canvas = editor.locator(".handwriting-canvas");
    await canvas.evaluate((element) => {
      element.setPointerCapture = () => {};
    });
    const send = async (type: string, x: number, y: number) => {
      await canvas.evaluate(
        (element, input) => {
          const bounds = element.getBoundingClientRect();
          element.dispatchEvent(
            new PointerEvent(input.type, {
              bubbles: true,
              pointerType: input.pointerType,
              pointerId: 21,
              button: 0,
              buttons: input.type === "pointerup" ? 0 : 1,
              pressure: 0.5,
              clientX: bounds.x + input.x,
              clientY: bounds.y + input.y,
            }),
          );
        },
        { type, x, y, pointerType },
      );
    };
    const viewport = editor.locator(".handwriting-viewport");
    await viewport.evaluate((element) => {
      element.scrollLeft = 100;
      element.scrollTop = 100;
    });
    const scrollBefore = await viewport.evaluate((element) => element.scrollTop);
    await send("pointerdown", 100, 200);
    await send("pointermove", 100, 160);
    await send("pointerup", 100, 160);
    expect(await viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(scrollBefore);
    await page.getByRole("button", { name: "Selecionar traços" }).click();
    await page.getByRole("button", { name: "Selecionar tudo", exact: true }).click();
    await page.getByRole("button", { name: "Mover", exact: true }).click();
    const formula = editor.locator(".handwriting-sticky--formula").first();
    const before = await formula.evaluate((element) => parseFloat(element.style.left));
    await send("pointerdown", 150, 150);
    await send("pointermove", 180, 165);
    await send("pointerup", 180, 165);
    await expect
      .poll(() => formula.evaluate((element) => parseFloat(element.style.left)))
      .toBeGreaterThan(before);
    if (await page.getByRole("button", { name: "Histórico e zoom" }).isVisible())
      await page.getByRole("button", { name: "Histórico e zoom" }).click();
    await page.getByRole("button", { name: "Desfazer", exact: true }).click();
    await expect
      .poll(() => formula.evaluate((element) => parseFloat(element.style.left)))
      .toBe(before);
  });
}

test("fórmula branca e comandos compactos em ambos os temas", async ({ page }, info) => {
  const editor = page.locator(".handwriting-studio");
  for (const theme of ["dark", "light"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const formula = editor.locator(".handwriting-sticky--formula").first();
    await expect(formula).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(formula.locator("textarea")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(formula.locator("textarea")).toHaveCSS("color", "rgb(41, 36, 50)");
    await page.getByRole("button", { name: "Selecionar traços" }).click();
    await page.getByRole("button", { name: "Selecionar tudo", exact: true }).click();
    await expect(editor.locator(".handwriting-formula-assist")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await page.getByRole("textbox", { name: "Fórmula matemática" }).fill("x² + y² = 1");
    await page.getByRole("button", { name: "Inserir fórmula", exact: true }).click();
    await expect(editor.locator(".handwriting-sticky--formula")).toHaveCount(
      theme === "dark" ? 2 : 3,
    );
    if (await page.getByRole("button", { name: "Histórico e zoom" }).isVisible())
      await page.getByRole("button", { name: "Histórico e zoom" }).click();
    const undo = (await page.getByRole("button", { name: "Desfazer", exact: true }).boundingBox())!;
    const redo = (await page.getByRole("button", { name: "Refazer", exact: true }).boundingBox())!;
    expect(redo.x - undo.x - undo.width).toBeLessThanOrEqual(10);
    await page.screenshot({ path: info.outputPath(`formula-${theme}.png`) });
  }
});
