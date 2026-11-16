import { expect, test } from "@playwright/test";

// No celular a prateleira dupla (cadernos em cima, pastas embaixo) cabe entre o cabeçalho e a
// navegação, sem rolar, e os vasos dos cantos ficam dentro da tela.
for (const theme of ["light", "dark"]) {
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [412, 915],
  ] as const) {
    test(`prateleira de cadernos e pastas cabe em ${width}x${height}: ${theme}`, async ({
      page,
    }, info) => {
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
      await page.getByRole("button", { name: "Crie", exact: true }).click();
      await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
      await dismiss();
      const back = page.getByRole("button", { name: "Meus Cadernos", exact: true });
      if (await back.isVisible()) await back.click();
      await page.getByRole("button", { name: "Criar pasta", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Nova pasta", exact: true });
      await dialog.getByLabel("Nome da pasta", { exact: true }).fill("tese");
      await dialog.getByRole("button", { name: "Criar pasta", exact: true }).click();
      await expect(page.locator(".library-folder-row")).toBeVisible();

      const layout = await page.evaluate(() => {
        const rect = (selector: string) =>
          document.querySelector(selector)!.getBoundingClientRect();
        const showcase = document.querySelector(".notebooks-showcase")!;
        return {
          shelfBottom: rect(".notebook-display-shelf").bottom,
          navTop: rect("nav[aria-label='Navegação móvel']").top,
          vineRight: rect(".notebook-shelf-vines.is-right").right,
          viewportWidth: window.innerWidth,
          scrolls: showcase.scrollHeight > showcase.clientHeight + 1,
          horizontal: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      expect(layout.scrolls).toBe(false);
      expect(layout.horizontal).toBe(false);
      expect(layout.shelfBottom).toBeLessThanOrEqual(layout.navTop);
      expect(layout.vineRight).toBeLessThanOrEqual(layout.viewportWidth);
      await page.screenshot({
        path: info.outputPath(`prateleira-${width}x${height}-${theme}.png`),
      });
    });
  }
}
