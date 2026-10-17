import { openHandwritingA4, activateHandwritingPen } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

test("três retas acertadas com folga nos cantos viram um triângulo fechado, em um passo", async ({
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

  // Tudo em coordenadas da folha (1200 por 1600); convertido para a tela a cada gesto.
  const toScreen = async (px: number, py: number) => {
    const box = (await sheet.boundingBox())!;
    return { x: box.x + (px * box.width) / 1200, y: box.y + (py * box.height) / 1600 };
  };
  const inkNear = (px: number, py: number, radius = 4) =>
    sheet.evaluate(
      (element, p) => {
        const canvas = element as HTMLCanvasElement;
        const cx = Math.round((p.px * canvas.width) / 1200);
        const cy = Math.round((p.py * canvas.height) / 1600);
        const size = p.radius * 2 + 1;
        const { data } = canvas
          .getContext("2d")!
          .getImageData(cx - p.radius, cy - p.radius, size, size);
        for (let index = 0; index < data.length; index += 4)
          if (data[index + 3]! > 200 && data[index]! < 90 && data[index + 1]! < 90) return true;
        return false;
      },
      { px, py, radius },
    );

  const A: [number, number] = [300, 400];
  const B: [number, number] = [700, 400];
  const C: [number, number] = [500, 130];
  const GAP = 24;
  // Uma reta de `from` a `to`, encurtada de GAP em cada ponta, segurada para acertar.
  async function drawLine(from: [number, number], to: [number, number]) {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const ux = (to[0] - from[0]) / length;
    const uy = (to[1] - from[1]) / length;
    const start = await toScreen(from[0] + ux * GAP, from[1] + uy * GAP);
    const end = await toScreen(to[0] - ux * GAP, to[1] - uy * GAP);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let step = 1; step <= 24; step += 1) {
      await page.mouse.move(
        start.x + ((end.x - start.x) * step) / 24,
        start.y + ((end.y - start.y) * step) / 24 + Math.sin(step) * 0.8,
      );
      await page.waitForTimeout(6);
    }
    await page.waitForTimeout(900);
    await page.mouse.up();
    await page.waitForTimeout(200);
  }

  await drawLine(A, B);
  await drawLine(B, C);
  // Com duas retas ainda não há forma: os cantos continuam abertos.
  expect(await inkNear(...B)).toBe(false);
  expect(await inkNear(...A)).toBe(false);
  // A terceira reta, no sentido contrário ao da volta, fecha o triângulo.
  await drawLine(A, C);
  await sheet.screenshot({ path: testInfo.outputPath("triangulo.png") });
  for (const corner of [A, B, C]) expect(await inkNear(...corner)).toBe(true);
  // O interior fica vazio: é um contorno, não uma mancha.
  expect(await inkNear(500, 310, 6)).toBe(false);

  // Um passo de desfazer volta às duas primeiras retas, com os cantos abertos de novo.
  await dialog.getByRole("button", { name: "Desfazer", exact: true }).click();
  await page.waitForTimeout(200);
  expect(await inkNear(...A)).toBe(false);
  expect(await inkNear(...B)).toBe(false);
  expect(await inkNear(500, 400)).toBe(true);
});
