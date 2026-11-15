import { expect, test } from "@playwright/test";
import { openHandwritingA4 } from "./notebook-helpers";

// A janela de escrita ampliada flutua sobre o editor: dá para arrastar pela alça (mouse ou toque),
// mover com as setas do teclado, ela nunca sai do editor e a posição volta depois de recarregar.
test("janela de escrita arrastável, com teclado e posição lembrada", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  const picker = editor.getByRole("button", { name: "Tipo de papel", exact: true });
  if ((await picker.getAttribute("aria-expanded")) === "true") await picker.click();
  await editor.getByRole("button", { name: "Janela de escrita ampliada", exact: true }).click();
  const window_ = editor.getByRole("region", { name: "Janela de escrita ampliada", exact: true });
  await expect(window_).toBeVisible();
  // A janela só circula pela área de escrita, nunca por cima das ferramentas.
  const studio = editor.locator(".handwriting-viewport");
  const area = (await studio.boundingBox())!;
  // Onde a janela deve parar: o pedido, limitado ao editor (no celular ela quase ocupa a largura).
  const clamp = (x: number, y: number, box: { width: number; height: number }) => ({
    x: Math.max(area.x, Math.min(x, area.x + area.width - box.width)),
    y: Math.max(area.y, Math.min(y, area.y + area.height - box.height)),
  });
  const grip = window_.getByRole("button", { name: "Mover janela de escrita", exact: true });

  // Dentro do editor desde o começo, e a faixa não empurra mais a folha para baixo.
  const first = (await window_.boundingBox())!;
  expect(first.x).toBeGreaterThanOrEqual(area.x - 1);
  expect(first.x + first.width).toBeLessThanOrEqual(area.x + area.width + 1);
  expect(first.y + first.height).toBeLessThanOrEqual(area.y + area.height + 1);

  // Arrastar pela alça move a janela.
  const handle = (await grip.boundingBox())!;
  const startX = handle.x + handle.width / 2;
  const startY = handle.y + handle.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 60, startY + 90, { steps: 8 });
  await page.mouse.up();
  const dragged = (await window_.boundingBox())!;
  const wanted = clamp(first.x - 60, first.y + 90, first);
  expect(Math.abs(dragged.x - wanted.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(dragged.y - wanted.y)).toBeLessThanOrEqual(2);
  expect(dragged.y).toBeGreaterThan(first.y);

  // Teclado: setas movem 16px; a janela não sai do editor mesmo empurrada para fora.
  await grip.focus();
  await page.keyboard.press("ArrowRight");
  const nudged = (await window_.boundingBox())!;
  expect(Math.abs(nudged.x - clamp(dragged.x + 16, dragged.y, dragged).x)).toBeLessThanOrEqual(2);
  for (let index = 0; index < 60; index += 1) await page.keyboard.press("Shift+ArrowLeft");
  for (let index = 0; index < 60; index += 1) await page.keyboard.press("Shift+ArrowUp");
  const corner = (await window_.boundingBox())!;
  expect(corner.x).toBeGreaterThanOrEqual(area.x - 1);
  expect(corner.y).toBeGreaterThanOrEqual(area.y - 1);
  expect(corner.x - area.x).toBeLessThanOrEqual(2);
  expect(corner.y - area.y).toBeLessThanOrEqual(2);

  // A posição fica guardada só neste aparelho, como fração do editor.
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("olena.handwriting.writing-window-position")),
    )
    .toBe(JSON.stringify({ x: 0, y: 0 }));

  // Fechar e reabrir a janela devolve ela ao mesmo lugar.
  const toggle = editor.getByRole("button", { name: "Janela de escrita ampliada", exact: true });
  await toggle.click();
  await expect(window_).toHaveCount(0);
  await toggle.click();
  await expect(window_).toBeVisible();
  const reopened = (await window_.boundingBox())!;
  expect(Math.abs(reopened.x - corner.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(reopened.y - corner.y)).toBeLessThanOrEqual(2);

  // Escrever na janela continua funcionando depois de mover.
  const paper = (await window_
    .getByLabel("Área ampliada para escrever com dedo ou caneta")
    .boundingBox())!;
  await page.mouse.move(paper.x + 30, paper.y + paper.height / 2);
  await page.mouse.down();
  await page.mouse.move(paper.x + 120, paper.y + paper.height / 2, { steps: 6 });
  await page.mouse.up();
});
