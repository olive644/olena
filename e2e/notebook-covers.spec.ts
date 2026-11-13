import { upgradeMasteryProgress } from "../src/domain/math-mastery-progress";
import { expect, test, type Page } from "@playwright/test";

// A gravação no IndexedDB é assíncrona: recarregar antes dela terminar faz a página ler o
// estado antigo e a verificação falha de vez em quando. Espera a capa nova aparecer gravada.
function savedWorkspace(page: Page) {
  return page.evaluate(
    () =>
      new Promise<string | undefined>((resolve) => {
        const request = indexedDB.open("helenastudy", 1);
        request.onerror = () => resolve(undefined);
        request.onsuccess = () => {
          const read = request.result
            .transaction("workspace", "readonly")
            .objectStore("workspace")
            .get("current");
          read.onsuccess = () => resolve(read.result as string | undefined);
          read.onerror = () => resolve(undefined);
        };
      }),
  );
}

for (const theme of ["light", "dark"]) {
  for (const unlocked of [false, true]) {
    test(`capas da prateleira ${theme} ${unlocked ? "obtidas" : "bloqueadas"}`, async ({
      page,
    }, info) => {
      await page.addInitScript(
        ({ theme, unlocked, progress }) => {
          if (unlocked)
            localStorage.setItem("helena.mathGame.v5", JSON.stringify({ foundations: progress }));
          localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
          localStorage.setItem("helenastudy.theme", theme);
          localStorage.setItem(
            "olena:accessibility:v1",
            JSON.stringify({
              reduceMotion: true,
              highlightSelections: false,
              notebook3dOptIn: true,
            }),
          );
          if (!sessionStorage.getItem("covers-seeded")) {
            sessionStorage.setItem("covers-seeded", "1");
            localStorage.setItem(
              "helena.profile.v1",
              JSON.stringify({
                name: "Teste",
                achievementHistory: unlocked
                  ? {
                      "correct-100": "2026-11-13T12:00:00Z",
                      "english-correct-100": "2026-11-13T12:00:00Z",
                    }
                  : {},
              }),
            );
          }
        },
        { theme, unlocked, progress: { ...upgradeMasteryProgress(), correct: 100 } },
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/cadernos");
      await page.getByRole("button", { name: "Crie", exact: true }).click();
      await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Caderno de teste");
      await page
        .locator(".notebook-create-dialog")
        .getByRole("button", { name: "Criar caderno", exact: true })
        .click();
      const popup = page.getByRole("dialog", { name: /Nova conquista/ });
      if (await popup.isVisible())
        await popup.getByRole("button", { name: "Fechar", exact: true }).click();
      await page.getByRole("button", { name: "Editar prateleira", exact: true }).click();
      await page
        .getByRole("button", { name: "Inspecionar caderno Caderno de teste", exact: true })
        .click();
      const dialog = page.getByRole("dialog", { name: "Caderno de teste", exact: true });
      await dialog.getByRole("tab", { name: "Capas", exact: true }).click();
      await dialog.getByRole("tab", { name: "Capas", exact: true }).press("ArrowLeft");
      await expect(dialog.getByRole("tab", { name: "Caderno", exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await dialog.getByRole("tab", { name: "Caderno", exact: true }).press("ArrowRight");
      const math = dialog.getByRole("button", { name: /Guardião dos números/ });
      const english = dialog.getByRole("button", { name: /Guardião das palavras/ });
      await expect(math).toHaveAttribute("aria-disabled", String(!unlocked));
      await expect(english).toHaveAttribute("aria-disabled", String(!unlocked));
      if (!unlocked) {
        await math.evaluate((button) => (button as HTMLButtonElement).click());
        await expect(math).toHaveAttribute("aria-pressed", "false");
        await expect(
          dialog.getByText("Acerte 100 questões de Matemática.", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Salvar prateleira", exact: true }),
        ).toBeDisabled();
        await dialog.screenshot({ path: info.outputPath(`covers-locked-${theme}.png`) });
        const pride = dialog.getByRole("button", { name: /Todas as cores/ });
        await expect(pride).toHaveAttribute("aria-disabled", "false");
        await pride.click();
        await expect(pride).toHaveAttribute("aria-pressed", "true");
        await dialog.screenshot({ path: info.outputPath(`pride-free-${theme}.png`) });
        await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
        await page.getByRole("button", { name: "Salvar prateleira", exact: true }).click();
        await page.reload();
        await expect(page.locator(".notebook-spine").first()).toHaveAttribute(
          "data-cover-theme",
          "pride",
        );
        await page.getByRole("button", { name: "Abrir Caderno de teste", exact: true }).click();
        await expect(page.locator(".notebook-spread-workspace")).toHaveAttribute(
          "data-cover-theme",
          "pride",
        );
        await page.screenshot({ path: info.outputPath(`pride-open-${theme}.png`) });
        return;
      }
      for (const [button, style] of [
        [math, "mathematics"],
        [english, "english"],
      ] as const) {
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(dialog.locator(".shelf-book-preview .book-cover__concept")).toHaveAttribute(
          "src",
          `/notebook-covers/capa-${style}.webp`,
        );
        await expect(page.locator(".notebook-spine").first()).toHaveAttribute(
          "data-cover-theme",
          style,
        );
      }
      await dialog.screenshot({ path: info.outputPath(`covers-earned-${theme}.png`) });
      await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
      await page
        .getByRole("button", { name: "Cancelar edição da prateleira", exact: true })
        .click();
      await expect(page.locator(".notebook-spine").first()).toHaveAttribute(
        "data-cover-theme",
        "stars",
      );
      await page.getByRole("button", { name: "Editar prateleira", exact: true }).click();
      await page
        .getByRole("button", { name: "Inspecionar caderno Caderno de teste", exact: true })
        .click();
      await dialog.getByRole("tab", { name: "Capas", exact: true }).click();
      await english.click();
      await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
      await page.getByRole("button", { name: "Salvar prateleira", exact: true }).click();
      await expect.poll(() => savedWorkspace(page)).toContain('"coverStyle":"english"');
      await page.reload();
      await expect(page.locator(".notebook-spine").first()).toHaveAttribute(
        "data-cover-theme",
        "english",
      );
      await page
        .locator(".notebook-shelves")
        .screenshot({ path: info.outputPath(`shelf-english-${theme}.png`) });
      await page.getByRole("button", { name: "Abrir Caderno de teste", exact: true }).click();
      await expect(page.locator(".notebook-spread-workspace")).toBeVisible();
      await expect(page.locator("[data-notebook-3d]")).toHaveCount(0);
      await expect(page.locator(".notebook-preview-heading h1")).toHaveCount(0);
      await expect(page.getByText(/folhas guardadas/)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Ver folhas", exact: true })).toHaveCount(0);
      const spread = await page.locator(".notebook-paper-spread").boundingBox();
      const clasp = await page.locator(".notebook-open-clasp").boundingBox();
      expect(clasp!.x).toBeGreaterThan(spread!.x + spread!.width * 0.9);
      await page.screenshot({ path: info.outputPath(`opened-english-${theme}.png`) });
      await page.getByRole("button", { name: "‹ Capa", exact: true }).click();
      await expect(page.locator(".notebook-shelves")).toBeVisible();
      await expect(page.locator(".notebook-concept-cover")).toHaveCount(0);
    });
  }
}
