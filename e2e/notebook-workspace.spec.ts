import { expect, test } from "@playwright/test";

test("quadro amplo, preferências e livro preservam páginas ao navegar e reabrir", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exportar PDF" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /Anotações/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await expect(editor).toBeVisible();
  await expect(editor).toHaveClass(/capture-dialog--expanded/);
  await expect(editor.getByRole("button", { name: /tela cheia/i })).toHaveCount(0);
  const canvas = editor.locator(".handwriting-canvas");
  await expect(canvas).toHaveAttribute("data-page-width", "3200");
  await expect(canvas).toHaveAttribute("data-page-height", "2400");
  await expect(editor.getByRole("group", { name: "Formato da folha" })).toHaveCount(0);
  await editor.getByRole("button", { name: "Configurações do editor" }).click();
  const settings = page.getByRole("dialog", { name: "Configurações do editor" });
  await expect(settings.getByRole("group")).toHaveCount(3);
  await settings.getByRole("checkbox", { name: /Ajuste inteligente/ }).uncheck();
  await page.screenshot({ path: testInfo.outputPath("preferencias-claro.png") });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.screenshot({ path: testInfo.outputPath("preferencias-escuro.png") });
  await settings.getByRole("button", { name: "Fechar configurações" }).click();
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await editor.getByRole("button", { name: "Adicionar post-it" }).click();
  await editor.getByRole("textbox", { name: "Texto do post-it" }).fill("Página um preservada");
  await expect(editor.getByText("Falha ao salvar a folha", { exact: false })).toHaveCount(0);
  await editor.getByRole("button", { name: "Criar próxima folha" }).click();
  await expect(editor.getByRole("textbox", { name: "Texto do post-it" })).toHaveCount(0);
  await editor.getByRole("button", { name: "Folha anterior" }).click();
  await expect(editor.getByRole("textbox", { name: "Texto do post-it" })).toHaveValue(
    "Página um preservada",
  );
  await expect(canvas).toHaveAttribute("data-page-width", "3200");
  const pageBook = editor.locator(".page-book");
  const bookBounds = await pageBook.boundingBox();
  if (!bookBounds) throw new Error("Navegador de páginas ausente");
  await page.mouse.move(
    bookBounds.x + bookBounds.width * 0.8,
    bookBounds.y + bookBounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bookBounds.x + bookBounds.width * 0.2,
    bookBounds.y + bookBounds.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(editor.getByRole("button", { name: "Folha anterior" })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("quadro-e-livro.png") });
  await editor.getByRole("button", { name: "Configurações do editor" }).click();
  await expect(settings.getByRole("checkbox", { name: /Ajuste inteligente/ })).not.toBeChecked();
  await settings.getByRole("button", { name: "Fechar configurações" }).click();
  // Simula outro dispositivo sem o identificador local, usando os dados da conta.
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("helenastudy.handwriting.")) localStorage.removeItem(key);
    }
  });
  await editor.getByRole("button", { name: "Folha anterior" }).click();
  await editor.getByRole("button", { name: "Próxima folha", exact: true }).click();
  await editor.getByRole("button", { name: "Folha anterior" }).click();
  await expect(editor.getByRole("textbox", { name: "Texto do post-it" })).toHaveValue(
    "Página um preservada",
  );
});
