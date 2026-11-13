import { expect, test } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";
for (const theme of ["light", "dark"]) {
  test(`encadernação conectada ${theme}`, async ({ page }, info) => {
    let state = workspaceReducer(createInitialWorkspace(), {
      type: "notebook/added",
      id: "binding",
      title: "Conexões",
      subjectId: "",
      createdAt: "2026-11-13",
    });
    for (let i = 0; i < 4; i++)
      state = workspaceReducer(state, {
        type: "note/added",
        id: `p${i}`,
        notebookId: "binding",
        subjectId: "",
        updatedAt: "2026-11-13",
        append: true,
      });
    state = workspaceReducer(state, {
      type: "notebook/organized",
      id: "binding",
      changes: {
        coverStyle: "pride",
        paperTabs: [
          {
            id: "divider",
            kind: "divider",
            pageId: "p3",
            label: "Revisão",
            color: "#5887C9",
            position: 0.3,
          },
          {
            id: "bookmark",
            kind: "bookmark",
            pageId: "p0",
            label: "",
            color: "#E04F7A",
            position: 0.4,
          },
        ],
      },
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
    const book = page.getByRole("button", { name: "Abrir Conexões", exact: true });
    await book.hover();
    const anchor = book.locator(".book-cover__clasp-anchor");
    await expect(anchor).toHaveCount(1);
    const connection = await anchor.evaluate((node) => {
      const edge = (element: HTMLElement) => element.offsetLeft + element.offsetWidth;
      return {
        a: edge(node as HTMLElement),
        b: edge(node.parentElement!.querySelector<HTMLElement>(".book-cover__backboard")!),
        p: edge(node.parentElement!.querySelector<HTMLElement>(".book-cover__pages")!),
      };
    });
    expect(connection.a).toBeGreaterThanOrEqual(connection.b - 1);
    expect(connection.a).toBeGreaterThan(connection.p);
    await book.click();
    const journey = page.locator(".notebook-journey");
    await expect(journey).toBeVisible();
    for (const fraction of [0.2, 0.65, 0.99]) {
      await journey.evaluate(
        (node, f) =>
          node.getAnimations({ subtree: true }).forEach((a) => {
            a.pause();
            a.currentTime = Number(a.effect!.getTiming().duration) * f;
          }),
        fraction,
      );
      await expect(journey.locator(".notebook-journey-marks .notebook-attached-tab")).toHaveCount(
        2,
      );
      await expect(journey.locator(".notebook-journey-marks .is-divider")).toBeVisible();
      await expect(journey.locator(".notebook-journey-marks .is-bookmark")).toBeVisible();
      await expect(journey.locator(".notebook-journey-leaf .book-cover__mark")).toHaveCount(0);
      await page.screenshot({ path: info.outputPath(`abertura-${fraction}.png`) });
    }
    await journey.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => {
        a.currentTime = Number(a.effect!.getTiming().duration) - 1;
      }),
    );
    const moving = await journey.locator(".notebook-journey-marks .is-bookmark").boundingBox();
    await journey.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => a.finish()),
    );
    await expect(journey).toHaveCount(0);
    const resting = await page.locator(".notebook-attached-tab.is-bookmark").boundingBox();
    expect(Math.abs(moving!.x - resting!.x)).toBeLessThan(5);
    await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
    await expect(journey).toBeVisible();
    await journey.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => {
        a.pause();
        a.currentTime = Number(a.effect!.getTiming().duration) * 0.3;
      }),
    );
    await expect(journey.locator(".notebook-journey-marks .notebook-attached-tab")).toHaveCount(2);
    await page.screenshot({ path: info.outputPath("fechamento.png") });
    await journey.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => a.finish()),
    );
    await expect(journey).toHaveCount(0);
    await expect(book).toBeVisible();
  });
}
