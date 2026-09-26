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

test("alças da caixa: arrastar o canto redimensiona e a alça de cima gira", async ({
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
  const box = (await sheet.boundingBox())!;

  // Traço horizontal: da esquerda para a direita em uma altura fixa.
  const y0 = box.y + 160;
  const x0 = box.x + box.width * 0.2;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(x0 + step * 8, y0 + Math.sin(step / 3) * 10);
    await page.waitForTimeout(6);
  }
  await page.mouse.up();

  const extent = () =>
    sheet.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width;
      let maxX = 0;
      let minY = canvas.height;
      let maxY = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3]! > 200 && data[index]! < 90 && data[index + 1]! < 90) {
          const pixel = index / 4;
          const x = pixel % canvas.width;
          const y = Math.floor(pixel / canvas.width);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      return { width: maxX - minX, height: maxY - minY };
    });
  const before = await extent();
  // Posição do traço em unidades da folha, para reencontrá-lo se o layout se mexer.
  const startUnits = {
    x: ((x0 - box.x) / box.width) * 1200,
    y: ((y0 - box.y) / box.width) * 1200,
  };

  await dialog.getByRole("button", { name: "Selecionar traços" }).click();
  await dialog.getByRole("button", { name: "Selecionar tudo" }).click();
  // A barra da seleção empurra a folha: os pontos do traço acompanham o deslocamento.
  const moved = (await sheet.boundingBox())!;
  const unit = moved.width / 1200;
  const left = moved.x + startUnits.x * unit;
  const baseline = moved.y + startUnits.y * unit;
  const right = left + 160 * (moved.width / box.width);
  const strokeTop = baseline - 10;
  const strokeBottom = baseline + 10;
  const frame = { left: left - 12 * unit, right: right + 12 * unit, top: strokeTop - 12 * unit };
  const corner = { x: frame.right, y: strokeBottom + 12 * unit };
  await page.mouse.move(corner.x, corner.y);
  await page.mouse.down();
  await page.mouse.move(corner.x + 80, corner.y + 20, { steps: 8 });
  await page.mouse.up();
  const grown = await extent();
  expect(grown.width).toBeGreaterThan(before.width * 1.3);

  // A alça de girar fica acima do meio da caixa; levá-la para o lado vira o traço.
  const rotateHandle = {
    x: (frame.left + frame.right + 80) / 2,
    y: frame.top - 46 * unit,
  };
  await page.mouse.move(rotateHandle.x, rotateHandle.y);
  await page.mouse.down();
  await page.mouse.move(rotateHandle.x + 260, rotateHandle.y + 260, { steps: 10 });
  await page.mouse.up();
  const turned = await extent();
  expect(turned.height).toBeGreaterThan(grown.height * 2);
});

test("segurar a caneta parada no fim de um traço acerta a reta e o círculo", async ({
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
  const box = (await sheet.boundingBox())!;

  const inkRows = () =>
    sheet.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      let minY = canvas.height;
      let maxY = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3]! > 200 && data[index]! < 90 && data[index + 1]! < 90) {
          const y = Math.floor(index / 4 / canvas.width);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      return maxY - minY;
    });

  // Uma linha com ondinhas e uma pausa no fim: a caneta parada acerta a reta.
  const x0 = box.x + box.width * 0.2;
  const y0 = box.y + 200;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let step = 1; step <= 25; step += 1) {
    await page.mouse.move(x0 + step * 8, y0 + Math.sin(step) * 6);
    await page.waitForTimeout(6);
  }
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(dialog.getByRole("button", { name: "Desfazer", exact: true })).toBeEnabled();
  // A tinta de uma reta perfeita é fina; o rabisco com a onda de 6 px ocuparia bem mais linhas.
  expect(await inkRows()).toBeLessThan(14);
});
