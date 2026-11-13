import { expect, test, type Page } from "@playwright/test";

// A gravação no IndexedDB é assíncrona: recarregar antes dela terminar faz a página ler o
// estado antigo e a verificação falha de vez em quando. Espera a gravação aparecer de verdade.
function savedWorkspace(page: Page) {
  return page.evaluate(
    () =>
      new Promise<string | undefined>((resolve) => {
        const request = indexedDB.open("helenastudy", 1);
        request.onerror = () => resolve(undefined);
        request.onsuccess = () => {
          const read = request.result
            .transaction("workspace", "readonly")
            .objectStore("workspace")
            .get("current");
          read.onsuccess = () => resolve(read.result as string | undefined);
          read.onerror = () => resolve(undefined);
        };
      }),
  );
}

for (const theme of ["light", "dark"]) {
  test(`edita placa e inspeciona caderno na prateleira ${theme}`, async ({ page }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/cadernos");
    await expect(page.locator(".system-updates-trigger")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Editar prateleira", exact: true })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Ideias de teste");
    await page
      .locator(".notebook-create-dialog")
      .screenshot({ path: info.outputPath(`create-${theme}.png`) });
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    const achievementClose = page.getByRole("button", { name: "Fechar conquista", exact: true });
    await expect(achievementClose).toBeVisible();
    await achievementClose.click();
    await expect(achievementClose).toHaveCount(0);
    await page.getByRole("button", { name: "Editar prateleira", exact: true }).click();
    const save = page.getByRole("button", { name: "Salvar prateleira", exact: true });
    await expect(save).toBeDisabled();
    await expect
      .poll(async () => {
        const cluster = await page.locator(".shelf-editor-cluster").boundingBox();
        const shelf = await page.locator(".notebook-display-shelf").boundingBox();
        return cluster && shelf
          ? Math.abs(cluster.x + cluster.width / 2 - shelf.x - shelf.width / 2)
          : 999;
      })
      .toBeLessThan(1);
    await page.getByRole("button", { name: "Nome da prateleira", exact: true }).click();
    const nameDialog = page.getByRole("dialog", { name: "Nome da prateleira", exact: true });
    await nameDialog
      .getByRole("textbox", { name: "Nome", exact: true })
      .fill("Meu canto de estudos");
    await nameDialog.screenshot({ path: info.outputPath(`name-${theme}.png`) });
    await nameDialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.locator(".shelf-wood-sign")).toHaveText("Meu canto de estudos");
    await expect(save).toBeEnabled();
    expect(
      await page
        .locator(".shelf-wood-sign")
        .evaluate((element) =>
          element
            .getAnimations()
            .some((animation) => animation.effect?.getTiming().duration === 1700),
        ),
    ).toBe(true);
    await page.waitForTimeout(1800);
    await page
      .locator(".notebook-shelves")
      .screenshot({ path: info.outputPath(`shelf-${theme}.png`) });
    await page
      .getByRole("button", { name: "Inspecionar caderno Ideias de teste", exact: true })
      .click();
    const inspect = page.getByRole("dialog", { name: "Ideias de teste", exact: true });
    await expect(inspect.getByText("Páginas", { exact: true })).toBeVisible();
    await expect(inspect.locator("dd").first()).toHaveText("0");
    await expect(inspect.locator("dd").nth(1)).toHaveText(/\d{2}\/\d{2}\/\d{4}/);
    await expect(inspect.locator(".paper-digits__slash")).toHaveCount(2);
    await expect(inspect.getByRole("button", { name: "Fechar", exact: true })).not.toBeFocused();
    await expect(
      inspect.getByText("O caderno e suas páginas serão excluídos ao salvar a prateleira."),
    ).toHaveCount(0);
    await inspect.screenshot({ path: info.outputPath(`inspect-${theme}.png`) });
    await inspect.getByRole("button", { name: "Remover da prateleira", exact: true }).click();
    const remove = page.getByRole("dialog", { name: "Remover caderno?", exact: true });
    await expect(remove).toBeVisible();
    await remove.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(inspect).toBeVisible();
    await inspect.getByRole("button", { name: "Remover da prateleira", exact: true }).click();
    await remove.screenshot({ path: info.outputPath(`remove-${theme}.png`) });
    await remove.getByRole("button", { name: "Remover", exact: true }).click();
    await page.getByRole("button", { name: "Cancelar edição da prateleira", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Abrir Ideias de teste", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".shelf-wood-sign")).toHaveCount(0);
    await page.getByRole("button", { name: "Editar prateleira", exact: true }).click();
    await page.getByRole("button", { name: "Nome da prateleira", exact: true }).click();
    await nameDialog
      .getByRole("textbox", { name: "Nome", exact: true })
      .fill("Meu canto de estudos");
    await nameDialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await save.click();
    await expect.poll(() => savedWorkspace(page)).toContain("Meu canto de estudos");
    await page.reload();
    await expect(page.locator(".shelf-wood-sign")).toHaveText("Meu canto de estudos");
    await page.getByRole("button", { name: "Editar prateleira", exact: true }).click();
    await page.getByRole("button", { name: "Apagar prateleira", exact: true }).click();
    const deletion = page.getByRole("dialog", { name: "Apagar prateleira?", exact: true });
    await deletion.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Apagar prateleira", exact: true }).click();
    await deletion.getByRole("button", { name: "Confirmar exclusão", exact: true }).click();
    await save.click();
    await expect.poll(() => savedWorkspace(page)).not.toContain("Ideias de teste");
    await page.reload();
    await expect(page.locator(".notebook-spine")).toHaveCount(0);
    await expect(page.locator(".shelf-wood-sign")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Crie", exact: true })).toBeVisible();
  });
}
