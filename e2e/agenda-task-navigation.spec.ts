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
      const privacyRead = localStorage.getItem("helena.privacyNotice.v1");
      localStorage.clear();
      if (privacyRead) localStorage.setItem("helena.privacyNotice.v1", privacyRead);
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
  await page
    .getByRole("region", { name: "Calendário", exact: true })
    .getByRole("button", { name: "Editar Revisão 1", exact: true })
    .click();
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
    await strip.evaluate(async (element) => {
      const animations = new Set<Animation>();
      for (let node: Element | null = element; node; node = node.parentElement)
        node.getAnimations().forEach((animation) => animations.add(animation));
      await Promise.all([...animations].map((animation) => animation.finished));
    });
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

test("desktop sidebar stays expanded with paper labels in both themes", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop sidebar only");
  await expect(page.getByRole("searchbox", { name: "Buscar na agenda" })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset["theme"] = value;
    }, theme);
    const mainBefore = await page.locator(".main-content").boundingBox();
    const rail = page.locator(".sidebar");
    await expect(rail).toHaveCSS("width", "260px");
    const item = rail.getByRole("button", { name: "Biblioteca", exact: true });
    const label = item.locator("span").last();
    // Os nomes ficam sempre visíveis, sem depender de hover, e o conteúdo não se move.
    await expect(label).toBeVisible();
    await item.hover();
    await expect(rail).toHaveCSS("width", "260px");
    await expect(label).toBeVisible();
    expect((await page.locator(".main-content").boundingBox())!.x).toBe(mainBefore!.x);
    await page.mouse.move(500, 100);
    await expect(rail).toHaveCSS("width", "260px");
    await expect(label).toBeVisible();
    await page.keyboard.press("Tab");
    await item.focus();
    await expect(label).toBeVisible();
    await page.screenshot({ path: `test-results/agenda-nav-${theme}.png` });
    await item.blur();
    const profile = rail.getByRole("button", { name: "Perfil", exact: true });
    await expect(profile.locator("span").last()).toBeVisible();
    const active = rail.getByRole("button", { name: "Agenda", exact: true });
    await expect(active).toHaveAttribute("aria-current", "page");
    await page.mouse.move(500, 100);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page
        .locator(".sidebar .nav-item > span:last-child")
        .first()
        .evaluate((label) =>
          Math.max(...getComputedStyle(label).transitionDuration.split(",").map(parseFloat)),
        ),
    )
    .toBeLessThanOrEqual(0.001);
  await expect(
    page.getByRole("button", { name: "Expandir menu lateral", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".sidebar")).toHaveCSS("width", "260px");
});
