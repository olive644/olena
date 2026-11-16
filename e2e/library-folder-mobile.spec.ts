import { expect, test } from "@playwright/test";

// No celular as cinco abas da pasta (Fontes, Resumo, Flashcards, Quizzes e Simulados) aparecem
// juntas na largura da tela, sem rolar de lado, e a tela não ganha rolagem horizontal.
for (const theme of ["light", "dark"]) {
  for (const [width, height] of [
    [320, 568],
    [360, 800],
    [412, 915],
  ] as const) {
    test(`abas da pasta cabem em ${width}x${height}: ${theme}`, async ({ page }, info) => {
      test.skip(info.project.name !== "mobile", "Layout específico do celular.");
      await page.setViewportSize({ width, height });
      await page.addInitScript((appearance) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", appearance);
      }, theme);
      await page.goto("/cadernos");
      const dismiss = async () => {
        for (const name of ["Entendi", "Fechar conquista"]) {
          const button = page.getByRole("button", { name });
          while (await button.first().isVisible()) await button.first().click();
        }
      };
      await page.waitForTimeout(1200);
      await dismiss();
      await page.getByRole("button", { name: "Criar pasta", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Nova pasta", exact: true });
      await dialog.getByLabel("Nome da pasta", { exact: true }).fill("tese");
      await dialog.getByRole("button", { name: "Criar pasta", exact: true }).click();
      await page.waitForTimeout(800);
      await dismiss();
      await page.getByRole("button", { name: /tese/ }).first().click();
      const tabs = page.getByRole("navigation", { name: "Seções da pasta" });
      await expect(tabs.getByRole("button")).toHaveCount(5);

      const layout = await page.evaluate(() => {
        const nav = document.querySelector(".library-folder-contents nav")!;
        return {
          tabsOverflow: nav.scrollWidth > nav.clientWidth + 1,
          lefts: [...nav.querySelectorAll("button")].map((button) =>
            button.getBoundingClientRect(),
          ),
          viewportWidth: window.innerWidth,
          horizontal: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      expect(layout.tabsOverflow).toBe(false);
      expect(layout.horizontal).toBe(false);
      for (const box of layout.lefts) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(layout.viewportWidth);
      }
      await page.screenshot({ path: info.outputPath(`pasta-${width}x${height}-${theme}.png`) });
    });
  }
}
