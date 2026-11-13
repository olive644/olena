import { expect, test } from "@playwright/test";

test("Perfil salva acessibilidade geral, aplica à Biblioteca e restaura após recarregar", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await page.getByRole("button", { name: "Aparência e acessibilidade", exact: true }).click();
  const settings = page.getByRole("region", { name: "Acessibilidade", exact: true });
  await settings.getByRole("checkbox", { name: /Reduzir movimento/ }).check();
  await settings.getByRole("checkbox", { name: /Realçar seleções/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await expect(page.locator("html")).toHaveAttribute("data-highlight-selections", "true");
  await settings.screenshot({ path: testInfo.outputPath("perfil-acessibilidade.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/biblioteca");
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await page.goto("/perfil");
  await page.reload();
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await page.getByRole("button", { name: "Aparência e acessibilidade", exact: true }).click();
  await expect(settings.getByRole("checkbox", { name: /Reduzir movimento/ })).toBeChecked();
  await expect(settings.getByRole("checkbox", { name: /Realçar seleções/ })).toBeChecked();
  await settings.getByRole("checkbox", { name: /Reduzir movimento/ }).uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "false");
});

for (const theme of ["light", "dark"]) {
  test(`programmatic reading focus respects selection preferences globally: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await page.getByRole("button", { name: "Aparência e acessibilidade", exact: true }).click();
    const settings = page.getByRole("region", { name: "Acessibilidade", exact: true });
    await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.innerHTML =
        '<h2 id="reading-probe" tabindex="-1">Leitura de teste</h2><button id="selection-probe" aria-pressed="true">Escolha de teste</button><div id="interactive-probe" role="checkbox" tabindex="-1" aria-checked="false">Controle de teste</div>';
      document.body.append(probe);
    });
    for (const enabled of [true, false]) {
      await settings.getByRole("checkbox", { name: /Realçar seleções/ }).setChecked(enabled);
      await page.keyboard.press("Tab");
      await page.locator("#reading-probe").focus();
      await expect(page.locator("#reading-probe")).toBeFocused();
      await expect(page.locator("#reading-probe")).toHaveCSS("text-decoration-line", "none");
      await expect(page.locator("#reading-probe")).toHaveCSS("filter", "none");
      await expect(page.locator("#selection-probe")).toHaveCSS(
        "text-decoration-line",
        enabled ? "underline" : "none",
      );
      await page.keyboard.press("Tab");
      await expect(page.locator("#selection-probe")).toBeFocused();
      await expect(page.locator("#selection-probe")).toHaveCSS(
        "text-decoration-line",
        enabled ? "underline" : "none",
      );
      await expect(page.locator("#selection-probe")).toHaveCSS(
        "filter",
        enabled ? /drop-shadow/ : "brightness(1.2)",
      );
      await page.locator("#interactive-probe").focus();
      await expect(page.locator("#interactive-probe")).toHaveCSS(
        "text-decoration-line",
        enabled ? "underline" : "none",
      );
      await expect(page.locator("#interactive-probe")).toHaveCSS(
        "filter",
        enabled ? /drop-shadow/ : "brightness(1.2)",
      );
    }
  });
}
