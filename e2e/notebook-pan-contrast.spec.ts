import { test, expect } from "@playwright/test";
import { openHandwritingA4, activateHandwritingPen } from "./notebook-helpers";

for (const theme of ["light", "dark"]) {
  test(`post-it contrast and middle mouse pan ${theme}`, async ({ page }, info) => {
    await page.addInitScript(() => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    });
    await page.goto("/cadernos");
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    await openHandwritingA4(page);
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
    const picker = editor.getByRole("button", { name: "Tipo de papel", exact: true });
    if ((await picker.getAttribute("aria-expanded")) === "true") await picker.click();
    await editor.getByRole("button", { name: "Adicionar post-it", exact: true }).click();
    const menu = editor.getByRole("button", { name: "Opções do post-it", exact: true });
    await expect(menu.locator("svg")).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(23, 21, 28)" : "rgb(41, 36, 50)",
    );
    await menu.click();
    await menu.click();
    await editor.screenshot({ path: info.outputPath(`sticky-${theme}.png`) });
    if (info.project.name === "mobile") return; // Middle mouse is a desktop hardware gesture.
    const pen = editor.getByRole("button", { name: "Caneta", exact: true });
    await activateHandwritingPen(page);
    await expect(pen).toHaveAttribute("aria-pressed", "true");
    const viewport = editor.locator(".handwriting-viewport");
    await viewport.evaluate((element) => {
      element.scrollTop = 150;
    });
    const before = await viewport.evaluate((element) => element.scrollTop);
    const inkBefore = await editor
      .locator("canvas.handwriting-canvas")
      .evaluateAll((canvases) => canvases.map((canvas) => canvas.toDataURL()));
    const bounds = await viewport.boundingBox();
    await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2 - 70, {
      steps: 8,
    });
    await expect(viewport).toHaveAttribute("data-middle-pan", "true");
    await page.mouse.up({ button: "middle" });
    await expect(viewport).not.toHaveAttribute("data-middle-pan");
    expect(await viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(before + 40);
    await expect(pen).toHaveAttribute("aria-pressed", "true");
    expect(
      await editor
        .locator("canvas.handwriting-canvas")
        .evaluateAll((canvases) => canvases.map((canvas) => canvas.toDataURL())),
    ).toEqual(inkBefore);
    await expect(editor.getByRole("textbox", { name: "Texto do post-it" })).toHaveCount(1);
  });
}
