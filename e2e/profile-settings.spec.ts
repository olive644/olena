import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createInitialWorkspace } from "../src/domain/workspace";
import { loadWorkspace, WORKSPACE_STORAGE_KEY } from "../src/data/local-workspace";

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
    localStorage.setItem("firebase:authUser:do-not-export", "credential-not-for-export");
    if (!localStorage.getItem("helenastudy.workspace.v1"))
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
  }, seed);
  await page.goto("/perfil");
  await expect(page.getByRole("navigation", { name: "Seções do Perfil" })).toHaveCount(0);
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Seções do Perfil" });
  await expect(page.getByRole("heading", { name: "Configurações", exact: true })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Meu progresso", exact: true })).toHaveCount(0);
  await expect(page.getByText("Como você aparece", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar perfil", exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Voltar ao perfil" }).locator("img"),
  ).toHaveAttribute("src", "/paper-arrow.svg");
  await expect(page.getByRole("button", { name: "Hábitos", exact: true })).toHaveCount(0);
  await expect(page.getByText("Em produção", { exact: true })).toHaveCount(0);
  async function choose(label: string) {
    const back = page.getByRole("button", { name: "Voltar às configurações", exact: true });
    if (await back.isVisible()) await back.click();
    await menu.getByRole("button", { name: label, exact: true }).click();
  }
  for (const theme of ["Claro", "Escuro"]) {
    await choose("Aparência e acessibilidade");
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
      "Privacidade e dados",
    ]) {
      await choose(label);
      await expect(page.locator(".profile-section-title")).toHaveText(label);
      // A prontidão pertence ao painel visível, não a animações de toda a subárvore.
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
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("olena-estudos.json");
  const downloaded = await readFile((await download.path())!, "utf8");
  expect(downloaded).not.toContain("credential-not-for-export");
  const exported = JSON.parse(downloaded) as { version: number; storage: Record<string, string> };
  expect(exported.version).toBe(1);
  expect(exported.storage[WORKSPACE_STORAGE_KEY]).toBeTruthy();
  const restored = loadWorkspace({ getItem: (key) => exported.storage[key] ?? null });
  expect(restored.focusSessions).toEqual(seed.focusSessions);
  expect(restored.habits).toEqual(seed.habits);
  await expect(page.getByText("Recuperação local", { exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await choose("Cadernos");
  await expect(page.getByRole("checkbox", { name: /Só caneta, dedo move/ })).toBeChecked();
  await choose("Aparência e acessibilidade");
  await expect(page.getByRole("checkbox", { name: /Efeitos sonoros/ })).not.toBeChecked();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).habits),
  ).toEqual(seed.habits);
  await page.goto("/habitos");
  await expect(page.getByRole("region", { name: "Seu perfil" })).toBeVisible();
});
