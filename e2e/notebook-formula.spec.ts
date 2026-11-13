import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`insere e edita fórmula na folha em tema ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/cadernos");
    for (const name of [
      "Crie",
      "Criar caderno",
      "Abrir Meu caderno",
      "Criar primeira folha",
      "Selecionar traços",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    const editor = page.getByRole("dialog", { name: "Escrever à mão" });
    await editor
      .getByRole("textbox", { name: "Fórmula matemática" })
      .fill(String.raw`\frac{1}{2}+x^{2}`);
    await editor.getByRole("button", { name: "Inserir fórmula", exact: true }).click();
    const formula = editor.locator(".handwriting-sticky--formula");
    await expect(formula.locator("output")).toHaveAttribute(
      "aria-label",
      String.raw`\frac{1}{2}+x^{2}`,
    );
    await expect(formula.locator("svg rect")).toHaveCount(1);
    await formula
      .getByRole("textbox", { name: "Fórmula matemática" })
      .fill(String.raw`\sqrt{\frac{x^{3}}{2}}`);
    await expect(formula.locator("output")).toHaveAttribute(
      "aria-label",
      String.raw`\sqrt{\frac{x^{3}}{2}}`,
    );
    await expect(formula.locator("svg rect")).toHaveCount(2);
    await formula.screenshot({ path: info.outputPath("formula.png") });
    await editor.getByRole("button", { name: "Salvar caderno" }).click();
    await page.reload();
    await page.getByRole("button", { name: "Abrir Meu caderno", exact: true }).click();
    await page
      .getByRole("button", { name: /^Abrir preview de/ })
      .first()
      .click();
    await expect(formula.getByRole("textbox", { name: "Fórmula matemática" })).toHaveValue(
      String.raw`\sqrt{\frac{x^{3}}{2}}`,
    );
    await expect(formula.locator("svg rect")).toHaveCount(2);
  });
}
