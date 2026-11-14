import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`preferências atuais compartilhadas entre perfil e caderno: ${theme}`, async ({
    page,
  }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    const notice = page.getByRole("button", { name: "Entendi", exact: true });
    if (await notice.isVisible()) await notice.click();
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Seções do Perfil" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
    const fields = page.locator(".profile-notebook-fields");
    await expect(fields.getByRole("checkbox")).toHaveCount(10);
    await fields.getByRole("checkbox", { name: /^Encaixar objetos/ }).uncheck();
    await fields.getByRole("checkbox", { name: /^Guias de alinhamento/ }).uncheck();
    await fields.locator("summary").filter({ hasText: "Atalhos de teclado" }).click();
    await fields.getByRole("button", { name: "Editar atalho: Texto", exact: true }).click();
    await page.keyboard.press("q");
    await expect(
      fields.getByRole("button", { name: "Editar atalho: Texto", exact: true }),
    ).toHaveText("Q");
    await fields.locator("summary").filter({ hasText: "Atalhos de caneta e mesa" }).click();
    await fields
      .getByRole("combobox", { name: "Botão lateral", exact: true })
      .selectOption("highlighter");
    await fields.locator("summary").filter({ hasText: "Atalhos de teclado" }).click();
    await fields.locator("summary").filter({ hasText: "Atalhos de caneta e mesa" }).click();
    expect(await fields.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await fields.screenshot({ path: info.outputPath(`profile-notebook-${theme}.png`) });

    await page.goto("/cadernos");
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    await page.locator(".notebook-spine").first().click();
    await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    await page.getByRole("button", { name: "Configurações do editor", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Configurações do editor", exact: true });
    await expect(dialog.locator("fieldset")).toHaveCount(5);
    await expect(dialog.getByRole("checkbox", { name: /^Encaixar objetos/ })).not.toBeChecked();
    await expect(dialog.getByRole("checkbox", { name: /^Guias de alinhamento/ })).not.toBeChecked();
    await expect(dialog.getByRole("checkbox", { name: /Avanço da janela/ })).toHaveCount(0);
    await dialog.getByRole("checkbox", { name: /^Guias de alinhamento/ }).check();
    await dialog.locator("summary").filter({ hasText: "Atalhos de teclado" }).click();
    await expect(
      dialog.getByRole("button", { name: "Editar atalho: Texto", exact: true }),
    ).toHaveText("Q");
    const penBinding = dialog.getByRole("button", { name: "Editar atalho: Caneta", exact: true });
    await penBinding.click();
    await page.keyboard.press("q");
    await expect(dialog.getByRole("alert")).toContainText("já está em uso");
    await page.keyboard.press("Escape");
    await expect(penBinding).toHaveText("P");
    await dialog.getByRole("button", { name: /^Editar atalho: Adicionar tabela$/ }).click();
    await page.keyboard.press("F8");
    await dialog.locator("summary").filter({ hasText: "Atalhos de caneta e mesa" }).click();
    await expect(dialog.getByText("Botões da mesa", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Botão lateral", exact: true })).toHaveValue(
      "highlighter",
    );
    await dialog
      .locator(".notebook-shortcut-section")
      .last()
      .screenshot({ path: info.outputPath(`pen-shortcuts-${theme}.png`) });
    await dialog.evaluate((el) => el.scrollTo(0, 0));
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await dialog.screenshot({ path: info.outputPath(`editor-settings-${theme}.png`) });
    await dialog.getByRole("button", { name: "Fechar configurações", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
    await editor.locator(".handwriting-canvas").focus();
    await page.keyboard.press("q");
    await expect(editor.locator(".handwriting-sticky--text")).toHaveCount(1);
    await page.keyboard.press("t");
    await expect(editor.locator(".handwriting-sticky--text")).toHaveCount(1);
    await page.keyboard.press("n");
    await expect(editor.locator(".handwriting-sticky--yellow")).toHaveCount(1);
    await page.keyboard.press("F8");
    await expect(editor.locator(".handwriting-sticky--table")).toHaveCount(1);

    await page.goto("/perfil");
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Seções do Perfil" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
    await expect(fields.getByRole("checkbox", { name: /^Guias de alinhamento/ })).toBeChecked();
    await expect(fields.getByRole("checkbox", { name: /^Encaixar objetos/ })).not.toBeChecked();
    await fields.locator("summary").filter({ hasText: "Atalhos de teclado" }).click();
    await expect(
      fields.getByRole("button", { name: "Editar atalho: Texto", exact: true }),
    ).toHaveText("Q");
    await fields.getByRole("button", { name: "Restaurar atalhos padrão", exact: true }).click();
    await expect(
      fields.getByRole("button", { name: "Editar atalho: Texto", exact: true }),
    ).toHaveText("T");
    await fields.locator("summary").filter({ hasText: "Atalhos de caneta e mesa" }).click();
    await expect(fields.getByRole("combobox", { name: "Botão lateral", exact: true })).toHaveValue(
      "hand",
    );
    await expect(fields.getByRole("combobox", { name: "Ponta traseira", exact: true })).toHaveValue(
      "eraser",
    );
    await page.reload();
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Seções do Perfil" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
    await fields.locator("summary").filter({ hasText: "Atalhos de teclado" }).click();
    await expect(
      fields.getByRole("button", { name: "Editar atalho: Texto", exact: true }),
    ).toHaveText("T");
  });
}
