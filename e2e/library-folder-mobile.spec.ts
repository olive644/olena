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

// O botão de baixo de cada aba ("Adicionar fontes", "Criar resumo", "Criar flashcards"...) ficava
// escondido atrás da navegação do celular, porque a tela não rola e a pasta passava da altura.
for (const [width, height] of [
  [360, 800],
  [390, 844],
] as const) {
  test(`o botão de cada aba da pasta aparece acima da navegação em ${width}x${height}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "mobile", "Layout específico do celular.");
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
    });
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
    for (const [tab, action] of [
      ["Fontes", "Adicionar fontes"],
      ["Resumo", "Criar resumo"],
      ["Flashcards", "Criar flashcards"],
      ["Quizzes", "Criar quiz"],
      ["Simulados", "Criar simulado"],
    ] as const) {
      await tabs.getByRole("button", { name: tab, exact: true }).click();
      const button = page.getByRole("button", { name: action, exact: true });
      await expect(button).toBeVisible();
      // O clique da própria aba pode rolar o `main` (que não rola para a pessoa); volta ao topo e vê
      // o que está de fato sobre o botão.
      const covered = await button.evaluate((node) => {
        document.querySelector("main")!.scrollTop = 0;
        const box = node.getBoundingClientRect();
        const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return !top || !node.contains(top);
      });
      expect(covered, `${action} ficou coberto`).toBe(false);
    }
  });
}
