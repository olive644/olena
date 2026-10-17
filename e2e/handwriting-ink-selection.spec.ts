import { expect, test } from "@playwright/test";
import { openHandwritingA4, activateHandwritingPen } from "./notebook-helpers";

for (const theme of ["light", "dark"]) {
  test(`seleção de linha e espessura visível em papel: ${theme}`, async ({ page }, info) => {
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", appearance);
    }, theme);
    await page.goto("/");
    const mobile = (page.viewportSize()?.width ?? 1280) < 900;
    if (mobile) await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
    await (
      mobile
        ? page.getByRole("dialog", { name: "Mais ferramentas" })
        : page.getByRole("navigation", { name: "Navegação principal" })
    )
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    await openHandwritingA4(page);
    await activateHandwritingPen(page);
    const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
    for (const label of [
      "Linha tracejada",
      "Linha pontilhada",
      "Linha contínua",
      "Traço Forte",
      "Traço Fino",
      "Traço Regular",
    ]) {
      const button = dialog.getByRole("button", { name: label, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(button).toHaveCSS("background-color", "rgb(250, 204, 21)");
      await expect(button).toHaveCSS("color", "rgb(41, 36, 50)");
      await expect(button.locator(".ink-selection-mark")).toHaveCSS("opacity", "1");
    }
    await expect(
      dialog
        .getByRole("button", { name: "Traço Forte", exact: true })
        .locator(".ink-selection-mark"),
    ).toHaveCSS("opacity", "0");
    for (const [label, icon] of [
      ["Curva", "curve"],
      ["Espaço vertical", "space"],
    ]) {
      const button = dialog.getByRole("button", { name: label, exact: true });
      await button.click();
      await expect(button.locator(`[data-paper-object="${icon}"]`)).toBeVisible();
      await expect(button).toHaveAttribute("aria-pressed", "true");
    }
    await dialog.screenshot({ path: info.outputPath(`ink-selection-${theme}.png`) });
  });
}
