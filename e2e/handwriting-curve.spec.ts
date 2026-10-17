import { openHandwritingA4, activateHandwritingPen } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

test("curva: pontos marcados com o mouse e com o teclado viram um traço liso por todos eles", async ({
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
  const top = Math.max(box.y, view.y) + 30;
  const bottom = Math.min(box.y + box.height, view.y + view.height) - 30;

  // Há tinta escura perto de um ponto da folha dado em pixels de tela (raio em pixels do bitmap).
  const inkNear = (point: { x: number; y: number }, radius = 5) =>
    sheet.evaluate(
      (element, args) => {
        const canvas = element as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.height / rect.height;
        const cx = Math.round((args.point.x - rect.left) * scale);
        const cy = Math.round((args.point.y - rect.top) * scale);
        const size = args.radius * 2 + 1;
        const { data } = canvas
          .getContext("2d")!
          .getImageData(cx - args.radius, cy - args.radius, size, size);
        for (let index = 0; index < data.length; index += 4)
          if (data[index + 3]! > 200 && data[index]! < 90 && data[index + 1]! < 90) return true;
        return false;
      },
      { point, radius },
    );

  await dialog.getByRole("button", { name: "Curva", exact: true }).click();

  // Mouse: quatro toques e um toque duplo no último concluem a curva.
  const mouseControls = [
    { x: box.x + box.width * 0.15, y: bottom - 20 },
    { x: box.x + box.width * 0.3, y: top + 20 },
    { x: box.x + box.width * 0.45, y: bottom - 20 },
    { x: box.x + box.width * 0.6, y: top + 20 },
  ];
  for (const control of mouseControls.slice(0, 2)) await page.mouse.click(control.x, control.y);
  // Segurar Espaço (mão temporária, para rolar a folha) não conclui a curva em andamento.
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await expect(dialog.getByRole("button", { name: "Curva", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const control of mouseControls.slice(2)) await page.mouse.click(control.x, control.y);
  // Enquanto não conclui, nada foi para a folha: o traço ainda é só prévia.
  expect(await inkNear(mouseControls[1]!)).toBe(false);
  await page.mouse.dblclick(mouseControls[3]!.x, mouseControls[3]!.y);
  await page.waitForTimeout(150);
  for (const control of mouseControls) expect(await inkNear(control)).toBe(true);
  // O meio de um vão entre dois pontos também tem tinta (a curva é contínua).
  const between = {
    x: (mouseControls[1]!.x + mouseControls[2]!.x) / 2,
    y: (mouseControls[1]!.y + mouseControls[2]!.y) / 2,
  };
  expect(await inkNear(between, 40)).toBe(true);

  // Um passo de desfazer remove a curva inteira.
  await dialog.getByRole("button", { name: "Desfazer", exact: true }).click();
  await page.waitForTimeout(150);
  expect(await inkNear(mouseControls[0]!)).toBe(false);

  // Teclado: setas movem o cursor, Enter marca, Shift com Enter conclui.
  await sheet.focus();
  // O cursor do teclado continua de onde o último ponto foi marcado com o mouse.
  const unit = box.width / 1200;
  const start = mouseControls[3]!;
  await page.keyboard.press("Enter");
  for (let step = 0; step < 10; step += 1) await page.keyboard.press("ArrowRight");
  for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+Enter");
  await page.waitForTimeout(150);
  const second = { x: start.x + 120 * unit, y: start.y + 48 * unit };
  await sheet.screenshot({ path: testInfo.outputPath("curva.png") });
  expect(await inkNear(start, 6)).toBe(true);
  expect(await inkNear(second, 6)).toBe(true);
});
