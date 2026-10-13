import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

test.beforeEach(async ({ page }) => {
  const workspace = createInitialWorkspace();
  workspace.tasks = [0, 1].map((index) => ({
    id: `task-${index}`,
    title: `Revisão ${index + 1}`,
    subjectId: "subject-english",
    dueDate: "2026-10-14",
    completed: false,
    color: "#2d8a67",
  }));
  await page.addInitScript((state) => {
    if (!sessionStorage.getItem("task-nav-seeded")) {
      localStorage.clear();
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
      sessionStorage.setItem("task-nav-seeded", "1");
    }
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  }, workspace);
  await page.goto("/planejador");
});

test("task colors and unclipped day/week strips stay current on desktop and mobile", async ({
  page,
}) => {
  const search = page.getByRole("searchbox", { name: "Buscar na agenda" });
  await search.fill("Revisão 1");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await page.getByRole("button", { name: "Editar Revisão 1", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Editar", exact: true });
  await expect(page.getByText("Cor da tarefa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cor Azul", exact: true }).click();
  await page.getByRole("button", { name: "Salvar alterações", exact: false }).click();
  await page.reload();
  await search.fill("Revisão");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await expect(page.locator(".agenda-item--task").first()).toHaveCSS(
    "border-left-color",
    "rgb(64, 112, 201)",
  );
  await page
    .getByRole("button", { name: /qua.*, 14 de out/ })
    .first()
    .click();
  await search.fill("");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  for (const mode of ["Dia", "Semana"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    const strip = page.locator(
      '.agenda-time-column[data-column-date="2026-10-14"] .agenda-all-day-strip',
    );
    const buttons = strip.getByRole("button", { name: /Ver tarefa/ });
    await expect(buttons).toHaveCount(2);
    const bounds = await strip.boundingBox();
    for (const button of await buttons.all()) {
      const item = await button.boundingBox();
      expect(item!.height).toBeGreaterThanOrEqual(44);
      expect(item!.y + item!.height + 4).toBeLessThanOrEqual(bounds!.y + bounds!.height);
    }
    await expect(buttons.first()).toHaveCSS("border-bottom-color", "rgb(64, 112, 201)");
  }
  await expect(dialog).not.toBeVisible();
});

test("desktop rail extends labels on hover and keyboard without shifting content", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Desktop hover rail only");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset["theme"] = value;
    }, theme);
    const mainBefore = await page.locator(".main-content").boundingBox();
    const rail = page.locator(".sidebar");
    await expect(rail).toHaveCSS("width", "84px");
    const item = rail.getByRole("button", { name: "Hábitos", exact: true });
    const label = item.locator("span").last();
    await item.hover();
    await expect(rail).toHaveCSS("width", "260px");
    await expect(label).toBeVisible();
    await expect(rail.locator(".nav-item--active > span:last-child")).toHaveCSS(
      "color",
      "rgb(255, 249, 239)",
    );
    expect((await page.locator(".main-content").boundingBox())!.x).toBe(mainBefore!.x);
    await page.mouse.move(500, 100);
    await expect(rail).toHaveCSS("width", "84px");
    await expect(label).not.toBeVisible();
    await page.keyboard.press("Tab");
    await item.focus();
    await expect(rail).toHaveCSS("width", "260px");
    await expect(label).toBeVisible();
    await page.screenshot({ path: `test-results/agenda-nav-${theme}.png` });
    await item.blur();
    const profile = page.locator(".sidebar").getByRole("button", { name: "Perfil", exact: true });
    await profile.hover();
    await expect(rail).toHaveCSS("width", "260px");
    await expect(profile.locator("span").last()).toBeVisible();
    await page.mouse.move(500, 100);
    await expect(rail).toHaveCSS("width", "84px");
  }
});
