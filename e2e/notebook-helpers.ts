import { expect, type Page } from "@playwright/test";

export async function activateHandwritingPen(page: Page) {
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  const pen = editor.getByRole("button", { name: "Caneta", exact: true });
  if ((await pen.getAttribute("aria-pressed")) !== "true") await pen.click();
  const options = editor.getByRole("button", { name: "Opções", exact: true });
  if ((await options.isVisible()) && (await options.getAttribute("aria-expanded")) !== "true")
    await options.click();
}

// Os testes de ferramentas conservam a geometria A4. O quadro padrão tem uma
// suíte própria que cobre dimensões, troca de páginas e persistência.
export async function openHandwritingA4(page: Page, reopen = false) {
  const dialog = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  if (reopen) await page.getByRole("button", { name: /^Abrir preview de / }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Tipo de papel", exact: true }).click();
  await dialog.getByRole("button", { name: "Pautado", exact: true }).click();
  await dialog.getByRole("button", { name: "Tipo de papel", exact: true }).click();
}
