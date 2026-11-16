import { expect, test } from "@playwright/test";
import { activateHandwritingPen, openHandwritingA4 } from "./notebook-helpers";

// Cada canvas do tamanho da folha empilhado custa alguns milissegundos por quadro enquanto se
// escreve (medido: ~4 a 6 ms cada, em renderização por software). Camadas sem nada para mostrar
// saem da composição, e só o canvas de toque segue o corte da dobra.
test("camadas vazias saem da composição e o clip-path fica só no canvas de toque", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo de desenho verificado no desktop.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await activateHandwritingPen(page);
  const shell = dialog.locator(".handwriting-page-shell");
  await shell.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  // Quantos canvases da folha entram na composição (display diferente de none).
  const visibleLayers = () =>
    shell.evaluate((element) =>
      [...element.querySelectorAll("canvas")]
        .filter((canvas) => getComputedStyle(canvas).display !== "none")
        .map((canvas) => canvas.className.replace("handwriting-canvas--pen", "").trim()),
    );

  // Folha em branco: base de toque, tinta confirmada e camada ao vivo. Nada mais.
  await expect
    .poll(visibleLayers)
    .toEqual([
      "handwriting-canvas",
      "handwriting-scene-layer handwriting-committed-ink",
      "handwriting-live-layer",
    ]);

  // O corte da dobra vale só para o canvas de toque (um clip-path em camada de tinta custa ~7 a 12 ms
  // por quadro); a tinta no triângulo é escondida pela cobertura do ::before.
  const clips = await shell.evaluate((element) =>
    [...element.querySelectorAll("canvas")].map((canvas) => ({
      base: canvas.classList.contains("handwriting-canvas"),
      clip: getComputedStyle(canvas).clipPath,
    })),
  );
  for (const { base, clip } of clips) {
    if (base) expect(clip).toContain("polygon");
    else expect(clip).toBe("none");
  }

  // Escrever não acorda camadas extras.
  const box = (await shell.boundingBox())!;
  const view = (await dialog.locator(".handwriting-viewport").boundingBox())!;
  const startX = Math.max(box.x, view.x) + 160;
  const startY = Math.max(box.y, view.y) + 160;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY + 60, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await visibleLayers()).length).toBe(3);

  // Selecionar o traço traz a camada de seleção para a composição (e só então).
  await dialog.getByRole("button", { name: "Selecionar traços", exact: true }).click();
  await page.mouse.move(startX - 40, startY - 40);
  await page.mouse.down();
  await page.mouse.move(startX + 200, startY + 140, { steps: 8 });
  await expect.poll(async () => (await visibleLayers()).length).toBe(4);
  await page.mouse.up();
  await expect.poll(async () => (await visibleLayers()).length).toBe(4);
  await expect(dialog.locator(".handwriting-selection-float")).toHaveCount(1);
});
