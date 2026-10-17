import { openHandwritingA4, activateHandwritingPen } from "./notebook-helpers";
import { expect, test, type Locator } from "@playwright/test";

// Centro vertical (em pixels do bitmap) de cada faixa de linhas com tinta escura na folha.
function inkBands(sheet: Locator) {
  return sheet.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    const rows: boolean[] = [];
    for (let y = 0; y < canvas.height; y += 1) {
      let ink = false;
      for (let x = 0; x < canvas.width && !ink; x += 2) {
        const i = (y * canvas.width + x) * 4;
        ink = data[i]! < 110 && data[i + 1]! < 110 && data[i + 2]! < 120;
      }
      rows.push(ink);
    }
    const bands: number[] = [];
    let start = -1;
    rows.forEach((ink, y) => {
      if (ink && start < 0) start = y;
      if (!ink && start >= 0) {
        bands.push((start + y - 1) / 2);
        start = -1;
      }
    });
    return bands;
  });
}

test("espaço vertical abre e fecha espaço com mouse e teclado, e desfaz", async ({
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
  await activateHandwritingPen(page);
  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  await sheet.scrollIntoViewIfNeeded();

  const box = (await sheet.boundingBox())!;
  const view = (await dialog.locator(".handwriting-viewport").boundingBox())!;
  const top = Math.max(box.y, view.y) + 20;
  const bottom = Math.min(box.y + box.height, view.y + view.height) - 20;
  const x0 = box.x + box.width * 0.3;
  const x1 = box.x + box.width * 0.7;
  const upperY = top + (bottom - top) * 0.15;
  const lowerY = top + (bottom - top) * 0.55;

  for (const y of [upperY, lowerY]) {
    await page.mouse.move(x0, y);
    await page.mouse.down();
    for (let step = 1; step <= 30; step += 1) {
      await page.mouse.move(x0 + ((x1 - x0) * step) / 30, y);
      await page.waitForTimeout(6);
    }
    await page.mouse.up();
  }
  await page.waitForTimeout(150);
  const before = await inkBands(sheet);
  expect(before).toHaveLength(2);

  // Pixels do bitmap por pixel de tela, para comparar o deslocamento esperado.
  const pixelsPerScreen = await sheet.evaluate(
    (element) => (element as HTMLCanvasElement).height / element.getBoundingClientRect().height,
  );
  const tolerance = 4;

  // Mouse: a linha fica entre as duas, e arrastar 40 px para baixo abre espaço. A posição na tela
  // sai das faixas medidas agora, porque a folha pode ter rolado desde que os traços foram feitos.
  await dialog.getByRole("button", { name: "Espaço vertical", exact: true }).click();
  const rect = (await sheet.boundingBox())!;
  const screenOf = (band: number) => rect.y + band / pixelsPerScreen;
  const lineY = (screenOf(before[0]!) + screenOf(before[1]!)) / 2;
  await page.mouse.move(x0, lineY);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(x0, lineY + step * 4);
    await page.waitForTimeout(8);
  }
  await dialog.screenshot({ path: testInfo.outputPath("espaco-vertical-arrasto.png") });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const opened = await inkBands(sheet);
  expect(opened).toHaveLength(2);
  expect(opened[0]).toBeCloseTo(before[0]!, 0);
  expect(Math.abs(opened[1]! - before[1]! - 40 * pixelsPerScreen)).toBeLessThan(tolerance);

  // Teclado: Shift com seta para baixo abre 48 unidades da folha, Shift com seta para cima fecha.
  const unit = await sheet.evaluate((element) => (element as HTMLCanvasElement).height / 1600);
  await sheet.focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.waitForTimeout(100);
  const keyed = await inkBands(sheet);
  expect(Math.abs(keyed[1]! - opened[1]! - 48 * unit)).toBeLessThan(tolerance);
  await page.keyboard.press("Shift+ArrowUp");
  await page.waitForTimeout(100);
  const closed = await inkBands(sheet);
  expect(Math.abs(closed[1]! - opened[1]!)).toBeLessThan(tolerance);
  expect(closed[0]).toBeCloseTo(before[0]!, 0);

  // Desfazer devolve a folha ao começo, em um passo por gesto.
  await dialog.getByRole("button", { name: "Desfazer", exact: true }).click();
  await dialog.getByRole("button", { name: "Desfazer", exact: true }).click();
  await dialog.getByRole("button", { name: "Desfazer", exact: true }).click();
  await page.waitForTimeout(150);
  const undone = await inkBands(sheet);
  expect(undone).toHaveLength(2);
  expect(Math.abs(undone[1]! - before[1]!)).toBeLessThan(tolerance);
  await sheet.screenshot({ path: testInfo.outputPath("espaco-vertical.png") });
});
