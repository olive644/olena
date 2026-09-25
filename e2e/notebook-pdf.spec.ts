import { expect, test } from "@playwright/test";
import { openHandwritingA4 } from "./notebook-helpers";

test("exportar o caderno em PDF abre a janela de impressão com as folhas", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo de desenho verificado no desktop.");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    // A impressão real abriria o diálogo do sistema; o teste só precisa saber que chegou lá.
    window.addEventListener("beforeprint", () => undefined);
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name: "Cadernos", exact: true })
    .click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Caderno de teste");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  // "Nova folha" já abre o editor; o auxiliar confirma e usa a geometria A4.
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  const canvas = dialog.locator(".handwriting-viewport canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + 80);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(
      box.x + box.width * 0.2 + step * 12,
      box.y + 80 + Math.sin(step / 3) * 20,
    );
    await page.waitForTimeout(8);
  }
  await page.mouse.up();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  if (await dialog.getByRole("button", { name: "Fechar e manter rascunho" }).isVisible())
    await dialog.getByRole("button", { name: "Fechar e manter rascunho" }).click();
  await expect(dialog).not.toBeVisible();

  // A folha salva abre no visualizador; o botão de exportar fica na lista de folhas.
  await page.getByRole("button", { name: /Folhas do caderno/ }).click();
  const exportButton = page.getByRole("button", { name: "Exportar PDF" });
  await expect(exportButton).toBeEnabled();
  const [popup] = await Promise.all([page.waitForEvent("popup"), exportButton.click()]);

  // A janela abriu, com o título do caderno e uma imagem por folha com conteúdo.
  await expect(popup.locator(".notebook-export-page img")).toHaveCount(1);
  expect(await popup.title()).toBe("Caderno de teste");
  // Nenhum aviso de "permita pop-ups" na página de origem.
  await expect(page.getByText("Permita pop-ups")).toHaveCount(0);
  // A janela não guarda vínculo com esta página: não consegue mexer nela.
  expect(await popup.evaluate(() => window.opener)).toBeNull();
});
