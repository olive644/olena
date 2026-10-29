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

test("o X de remover folha é o colorido sem placa e as setas de virar são as roxas de Foco", async ({
  page,
}, info) => {
  await openVolume(page, {});
  const remove = page.getByRole("button", { name: /^Remover folha 1/ });
  await expect(remove).toBeVisible({ timeout: 20_000 });
  // O mesmo X do perfil (agenda-close.svg), sem fundo nem sombra de botão.
  await expect(remove.locator("img.agenda-close-icon")).toHaveAttribute(
    "src",
    "/navigation-icons/paper/agenda-close.svg",
  );
  await expect(remove).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(remove).toHaveCSS("box-shadow", "none");
  // Virar a folha: seta roxa de Foco sem texto, com o nome no aria-label.
  const next = page.getByRole("button", { name: "Próxima ›", exact: true });
  await expect(next.locator("svg.focus-paper-arrow")).toBeVisible();
  await expect(next).toHaveText("");
  await next.click();
  await expect(page.getByText("Folhas 3 e 4 de 6")).toBeVisible();
  // No celular o caderno (com as abas) e a barra de baixo ficam centralizados na tela.
  if (info.project.name === "mobile") {
    const width = page.viewportSize()!.width;
    const dock = (await page.locator(".notebook-2d-dock").boundingBox())!;
    expect(Math.abs(dock.x + dock.width / 2 - width / 2)).toBeLessThan(6);
    const book = (await page.locator(".notebook-paper-spread").boundingBox())!;
    const tab = (await page.locator(".notebook-attached-tab.is-exposed").first().boundingBox())!;
    const left = book.x;
    const right = Math.max(book.x + book.width, tab.x + tab.width);
    expect(Math.abs((left + right) / 2 - width / 2)).toBeLessThan(14);
  }
});
