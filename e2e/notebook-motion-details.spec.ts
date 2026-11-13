import { test, expect } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";
for (const theme of ["light", "dark"]) {
  test("detalhes do caderno " + theme, async ({ page }, info) => {
    let state = workspaceReducer(createInitialWorkspace(), {
      type: "notebook/added",
      id: "details",
      title: "Detalhes",
      subjectId: "",
      createdAt: "2026-11-13",
    });
    for (let i = 0; i < 4; i++)
      state = workspaceReducer(state, {
        type: "note/added",
        id: "page" + i,
        notebookId: "details",
        subjectId: "",
        updatedAt: "2026-11-13",
        append: true,
      });
    await page.addInitScript(
      ({ state, theme }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
        localStorage.setItem("helenastudy.theme", theme);
      },
      { state, theme },
    );
    await page.goto("/cadernos");
    await page.getByRole("button", { name: "Abrir Detalhes", exact: true }).click();
    const journey = page.locator(".notebook-journey");
    await expect(journey).toBeVisible();
    await journey.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => {
        a.pause();
        a.currentTime = Number(a.effect!.getTiming().duration) - 1;
      }),
    );
    const claspFrames = await page
      .locator(".notebook-journey-clasp")
      .evaluate((node) =>
        (node.getAnimations()[0]!.effect as KeyframeEffect)
          .getKeyframes()
          .map((frame) => String(frame["transform"])),
      );
    expect(claspFrames.some((frame) => frame.includes("rotateY(180deg)"))).toBe(true);
    expect(claspFrames.some((frame) => frame.includes("rotateY(-180deg)"))).toBe(false);
    const moving = await page.locator(".notebook-journey-clasp").boundingBox();
    await journey.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => a.finish()),
    );
    await expect(journey).toHaveCount(0);
    const resting = await page.locator(".notebook-open-clasp").boundingBox();
    expect(Math.abs(moving!.x - resting!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(moving!.width - resting!.width)).toBeLessThanOrEqual(2);
    await expect(page.locator(".notebook-sheet-title")).toHaveCount(0);
    await expect(page.locator(".notebook-sheet footer .paper-digits")).toHaveCount(2);
    await expect(page.locator(".notebook-preview-controls > span")).toHaveClass(/visually-hidden/);
    if (info.project.name === "desktop") {
      const nav = page.locator(".sidebar .nav-item").first().locator("span").last();
      const style = await nav.evaluate((node) => {
        const s = getComputedStyle(node);
        return {
          background: s.backgroundColor,
          image: s.backgroundImage,
          radius: s.borderRadius,
          shadow: s.boxShadow,
        };
      });
      const tool = page.getByRole("button", { name: "Colocar divisória", exact: true });
      const tip = await tool.evaluate((node) => {
        const s = getComputedStyle(node, "::after");
        return {
          background: s.backgroundColor,
          image: s.backgroundImage,
          radius: s.borderRadius,
          shadow: s.boxShadow,
        };
      });
      expect(tip).toEqual(style);
    }
    const tools = page.getByRole("toolbar", { name: "Ferramentas do caderno" }).getByRole("button");
    for (const button of await tools.all()) {
      const label = await button.getAttribute("aria-label");
      await button.hover();
      await expect
        .poll(() => button.evaluate((node) => getComputedStyle(node, "::after").opacity))
        .toBe("1");
      expect(await button.evaluate((node) => getComputedStyle(node, "::after").content)).toBe(
        '"' + label + '"',
      );
    }
    await page.mouse.move(0, 0);
    await page.keyboard.press("Tab");
    for (const button of await tools.all()) {
      if (await button.isDisabled()) continue;
      await button.focus();
      await expect
        .poll(() => button.evaluate((node) => getComputedStyle(node, "::after").opacity))
        .toBe("1");
    }

    await page.getByRole("button", { name: "Colocar divisória", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Divisória", exact: true });
    await expect(dialog).toBeVisible();
    await expect(
      page.locator(".notebook-attached-tabs .notebook-attached-tab.is-divider"),
    ).toHaveCount(0);
    await dialog.getByRole("button", { name: "Verde", exact: true }).click();
    await expect(dialog.locator(".notebook-tab-preview")).toHaveCSS("--tab-color", "#287D69");
    await expect(dialog.locator(".notebook-tab-preview .is-divider")).toHaveCSS(
      "transform",
      "none",
    );
    await expect(dialog.locator(".notebook-tab-preview .is-divider > span")).toHaveCSS(
      "transform",
      "none",
    );
    await dialog.getByRole("textbox").fill("Planejamento de estudos");
    await expect(dialog.locator(".notebook-tab-preview .is-divider > span")).toHaveText(
      "Planejamento de estudos",
    );
    await dialog.getByRole("textbox").fill("Divisória");
    const dividerPreview = await dialog.locator(".notebook-tab-preview .is-divider").boundingBox();
    expect(dividerPreview!.width).toBeLessThanOrEqual(120);
    expect(dividerPreview!.height).toBeLessThanOrEqual(60);
    const modalBounds = await dialog.boundingBox();
    expect(modalBounds!.x).toBeGreaterThanOrEqual(0);
    expect(modalBounds!.x + modalBounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await dialog.screenshot({ path: info.outputPath("divisoria-" + theme + ".png") });
    await dialog.getByRole("button", { name: "Pronto", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const right = page.locator(".notebook-sheet").nth(1);
    const bounds = await right.boundingBox();
    await page.mouse.click(bounds!.x + bounds!.width - 12, bounds!.y + bounds!.height * 0.4);
    await expect(
      page.locator(".notebook-attached-tabs .notebook-attached-tab.is-divider"),
    ).toHaveCount(1);
    await expect(
      page.locator(".notebook-attached-tabs .notebook-attached-tab.is-divider"),
    ).toHaveCSS("--tab-color", "#287D69");
    await page.getByRole("button", { name: "Colocar marcador", exact: true }).click();
    const markerDialog = page.getByRole("dialog", { name: "Marcador", exact: true });
    await expect(markerDialog).toBeVisible();
    await markerDialog.getByRole("button", { name: "Rosa", exact: true }).click();
    await expect(markerDialog.locator(".notebook-tab-preview")).toHaveCSS(
      "--bookmark-color",
      "#AC365E",
    );
    const sun = markerDialog.getByRole("button", { name: "Sol", exact: true });
    await expect(sun).toHaveClass(/secondary-button/);
    await sun.click();
    await expect(sun).toHaveAttribute("aria-pressed", "true");
    await expect(markerDialog.locator(".notebook-tab-preview svg")).toHaveAttribute(
      "data-motif",
      "sun",
    );
    const markerPreview = await markerDialog
      .locator(".notebook-tab-preview .is-bookmark")
      .boundingBox();
    expect(markerPreview!.width).toBeLessThanOrEqual(50);
    expect(markerPreview!.height).toBeLessThanOrEqual(105);
    await markerDialog.screenshot({ path: info.outputPath("marcador-" + theme + ".png") });
    await markerDialog.getByRole("button", { name: "Pronto", exact: true }).click();
    await expect(markerDialog).toBeVisible();
    await expect(markerDialog).toHaveCount(0);
    await page.mouse.click(bounds!.x + bounds!.width * 0.55, bounds!.y + bounds!.height - 20);
    await page.getByRole("button", { name: "Próxima ›", exact: true }).click();
    const turn = page.locator(".notebook-turn");
    await expect(turn).toBeVisible();
    await turn.evaluate((node) =>
      node.getAnimations().forEach((a) => {
        a.pause();
        a.currentTime = 340;
      }),
    );
    await expect(turn.locator(".notebook-ride")).toHaveCount(2);
    await page.screenshot({ path: info.outputPath("folheando-" + theme + ".png") });
    await turn.evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
    await expect(turn).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("caderno-aberto-" + theme + ".png") });
    await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
    const closing = page.locator(".notebook-journey");
    await expect(closing).toBeVisible();
    await closing.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((animation) => {
        animation.pause();
        animation.currentTime = Number(animation.effect!.getTiming().duration) * 0.4;
      }),
    );
    await page.screenshot({ path: info.outputPath("lacre-fechando-" + theme + ".png") });
    await closing.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => a.finish()),
    );
    await expect(closing).toHaveCount(0);
    await expect(page.locator(".notebook-shelves")).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Abrir Detalhes", exact: true }).click();
    await expect(page.locator(".notebook-journey")).toHaveCount(0);
    await page.getByRole("button", { name: "Colocar marcador", exact: true }).click();
    const reduced = page.getByRole("dialog", { name: "Marcador", exact: true });
    await expect(reduced).toBeVisible();
    expect(await reduced.evaluate((node) => node.getAnimations().length)).toBe(0);
    await reduced.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(reduced).toHaveCount(0);
  });
}
