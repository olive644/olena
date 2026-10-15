import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

test("Perfil centraliza preferências, mantém painéis alinhados e remove Hábitos nos dois temas", async ({
  page,
}, info) => {
  const seed = createInitialWorkspace();
  seed.habits = [{ id: "legacy", title: "Registro antigo", completedDates: ["2026-10-12"] }];
  seed.focusSessions = [
    {
      id: "focus",
      subjectId: "subject-english",
      durationMinutes: 25,
      completedAt: "2026-10-12T14:00:00Z",
    },
  ];
  await page.addInitScript((workspace) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    if (!localStorage.getItem("helenastudy.workspace.v1"))
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
  }, seed);
  await page.goto("/perfil");
  const menu = page.getByRole("navigation", { name: "Seções do Perfil" });
  await expect(page.getByRole("heading", { name: "Seu espaço, do seu jeito." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hábitos", exact: true })).toHaveCount(0);
  await expect(page.getByText("Em produção", { exact: true })).toHaveCount(0);
  for (const theme of ["Claro", "Escuro"]) {
    await menu.getByRole("button", { name: "Aparência e acessibilidade", exact: true }).click();
    await page
      .getByRole("region", { name: "Seu papel, sua luz" })
      .getByRole("button", { name: theme, exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme === "Claro" ? "light" : "dark",
    );
    await page.getByRole("checkbox", { name: /Efeitos sonoros/ }).uncheck();
    for (const label of [
      "Conta",
      "Estudo e foco",
      "Cadernos",
      "Agenda e notificações",
      "Meu progresso",
      "Privacidade e dados",
    ]) {
      await menu.getByRole("button", { name: label, exact: true }).click();
      await expect(page.locator(".profile-section-title")).toHaveText(label);
      await page.locator("main").evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      await expect(page.locator("main")).toHaveCSS("opacity", "1");
      await expect(page.locator(".profile-settings-grid")).toHaveCSS("opacity", "1");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const panels = await page
        .locator(".profile-settings-grid > section:visible")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            width: element.getBoundingClientRect().width,
            right: element.getBoundingClientRect().right,
            left: element.getBoundingClientRect().left,
            top: element.getBoundingClientRect().top,
          })),
        );
      if (panels.length === 2)
        expect(Math.abs(panels[0]!.width - panels[1]!.width)).toBeLessThan(2);
      for (const panel of panels)
        expect(panel.right).toBeLessThanOrEqual(page.viewportSize()!.width);
      if (label === "Cadernos")
        await page.getByRole("checkbox", { name: /Só caneta, dedo move/ }).check();
      if (label === "Meu progresso")
        await expect(page.getByText("25", { exact: true })).toBeVisible();
      if (label === "Conta" || label === "Estudo e foco")
        await page.screenshot({
          path: info.outputPath(`perfil-${label}-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
    }
  }
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar meus dados", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("olena-estudos.json");
  await page.reload();
  await menu.getByRole("button", { name: "Cadernos", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Só caneta, dedo move/ })).toBeChecked();
  await menu.getByRole("button", { name: "Aparência e acessibilidade", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Efeitos sonoros/ })).not.toBeChecked();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).habits),
  ).toEqual(seed.habits);
  await page.goto("/habitos");
  await expect(page.getByRole("heading", { name: "Seu espaço, do seu jeito." })).toBeVisible();
});
