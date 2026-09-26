import { expect, test } from "@playwright/test";
import { openHandwritingA4 } from "./notebook-helpers";

test("seleção: laço, copiar, colar, duplicar, girar e selecionar tudo", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo de desenho verificado no desktop.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name: "Cadernos", exact: true })
    .click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  await sheet.scrollIntoViewIfNeeded();
  let box = (await sheet.boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + fy });

  // Um traço em uma região da folha.
  await page.mouse.move(at(0.2, 150).x, at(0.2, 150).y);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(
      at(0.2 + step * 0.01, 150 + Math.sin(step / 3) * 15).x,
      at(0, 150 + Math.sin(step / 3) * 15).y,
    );
    await page.waitForTimeout(6);
  }
  await page.mouse.up();

  await dialog.getByRole("button", { name: "Selecionar traços" }).click();
  await dialog.getByRole("button", { name: "Laço livre" }).click();
  // A barra da seleção empurra a folha para baixo: mede de novo.
  box = (await sheet.boundingBox())!;
  // Laço em volta do traço.
  const lasso = [at(0.15, 100), at(0.45, 100), at(0.45, 210), at(0.15, 210), at(0.15, 100)];
  await page.mouse.move(lasso[0]!.x, lasso[0]!.y);
  await page.mouse.down();
  for (const point of lasso.slice(1)) {
    await page.mouse.move(point.x, point.y, { steps: 6 });
  }
  await page.mouse.up();
  const actions = dialog.getByLabel("Itens selecionados");
  await expect(actions.getByText("1 item selecionado")).toBeVisible();

  // Duplicar seleciona a cópia; selecionar tudo mostra os dois traços.
  await actions.getByRole("button", { name: "Duplicar" }).click();
  await expect(actions.getByText("1 item selecionado")).toBeVisible();
  await actions.getByRole("button", { name: "Selecionar tudo" }).click();
  await expect(actions.getByText("2 itens selecionados")).toBeVisible();

  // Girar não perde itens; copiar e colar acrescentam uma cópia de tudo.
  await actions.getByRole("button", { name: "Girar +15°" }).click();
  await expect(actions.getByText("2 itens selecionados")).toBeVisible();
  await actions.getByRole("button", { name: "Copiar" }).click();
  await actions.getByRole("button", { name: "Colar" }).click();
  await expect(actions.getByText("2 itens selecionados")).toBeVisible();
  await actions.getByRole("button", { name: "Selecionar tudo" }).click();
  await expect(actions.getByText("4 itens selecionados")).toBeVisible();

  // Recortar remove; desfazer devolve.
  await actions.getByRole("button", { name: "Recortar" }).click();
  await expect(actions.getByText(/itens? selecionados?/)).toHaveCount(0);
  await dialog.getByRole("button", { name: "Desfazer", exact: true }).click();
  await actions.getByRole("button", { name: "Selecionar tudo" }).click();
  await expect(actions.getByText("4 itens selecionados")).toBeVisible();
});
