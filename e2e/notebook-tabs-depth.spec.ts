import { expect, test } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";

// Divisórias e marcadores do caderno em 2D têm volume (inclinação, sombra e balanço), sem mudar o uso.
function seededWorkspace() {
  let workspace = workspaceReducer(createInitialWorkspace(), {
    type: "notebook/added",
    id: "volume",
    title: "Volume",
    subjectId: "",
    createdAt: "2026-09-26",
  });
  for (let index = 0; index < 6; index++)
    workspace = workspaceReducer(workspace, {
      type: "note/added",
      id: `p${index}`,
      notebookId: "volume",
      subjectId: "",
      updatedAt: "2026-09-26",
      append: true,
    });
  return workspaceReducer(workspace, {
    type: "notebook/organized",
    id: "volume",
    changes: {
      paperTabs: [
        { id: "t1", kind: "divider", pageId: "p3", label: "Bio", color: "#5887C9", position: 0.3 },
        { id: "t2", kind: "bookmark", pageId: "p0", label: "", color: "#E04F7A", position: 0.4 },
      ],
    },
  });
}

async function openVolume(page: import("@playwright/test").Page, preferences: object) {
  await page.addInitScript(
    ([state, prefs]) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("olena:accessibility:v1", JSON.stringify(prefs));
      if (!localStorage.getItem("helenastudy.workspace.v1"))
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
    },
    [seededWorkspace(), preferences] as const,
  );
  await page.goto("/cadernos");
  await page.locator(".notebook-card").filter({ hasText: "Volume" }).click();
}

test("divisória e marcador têm volume e a divisória continua levando à folha", async ({ page }) => {
  await openVolume(page, {});
  // O caderno é o 2D de sempre: não há cena 3D.
  await expect(page.locator("[data-notebook-3d]")).toHaveCount(0);
  const divider = page.getByRole("button", { name: /^Divisória Bio/ });
  await expect(divider).toBeVisible({ timeout: 20_000 });
  const style = (selector: string, property: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property);
  expect(await style(".notebook-attached-tab.is-divider", "transform")).toContain("matrix3d");
  // O marcador fica parado e balança uma vez só ao ser apontado ou focado.
  expect(await style(".notebook-attached-tab.is-bookmark", "animation-name")).toBe("none");
  await page.locator(".notebook-attached-tab.is-bookmark").first().hover();
  expect(await style(".notebook-attached-tab.is-bookmark", "animation-name")).toBe(
    "notebook-bookmark-sway",
  );
  await divider.click();
  await expect(page.getByText("Folhas 3 e 4 de 6")).toBeVisible();
});

test("com movimento reduzido o marcador fica parado", async ({ page }) => {
  await openVolume(page, { reduceMotion: true });
  await expect(page.locator(".notebook-attached-tab.is-bookmark").first()).toBeVisible({
    timeout: 20_000,
  });
  await page.locator(".notebook-attached-tab.is-bookmark").first().hover();
  const name = await page
    .locator(".notebook-attached-tab.is-bookmark")
    .first()
    .evaluate((node) => getComputedStyle(node).animationName);
  expect(name).toBe("none");
});
