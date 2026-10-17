import { openHandwritingA4, activateHandwritingPen } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

test("segurar a caneta parada: reta quase reta encaixa no eixo e retângulo girado é reconhecido", async ({
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
  const top = Math.max(box.y, view.y);
  const bottom = Math.min(box.y + box.height, view.y + view.height);

  // Altura (em pixels do bitmap) ocupada pela tinta numa faixa da folha, dada em pixels de tela.
  const inkSpan = (fromY: number, toY: number) =>
    sheet.evaluate(
      (element, range) => {
        const canvas = element as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.height / rect.height;
        const y0 = Math.max(0, Math.floor((range.fromY - rect.top) * scale));
        const y1 = Math.min(canvas.height, Math.ceil((range.toY - rect.top) * scale));
        const { data } = canvas
          .getContext("2d")!
          .getImageData(0, y0, canvas.width, Math.max(1, y1 - y0));
        let minY = Infinity;
        let maxY = -Infinity;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index + 3]! > 200 && data[index]! < 90 && data[index + 1]! < 90) {
            const y = Math.floor(index / 4 / canvas.width);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
        return maxY - minY;
      },
      { fromY, toY },
    );

  async function drawAndHold(points: { x: number; y: number }[]) {
    await page.mouse.move(points[0]!.x, points[0]!.y);
    await page.mouse.down();
    for (const point of points.slice(1)) {
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(5);
    }
    await page.waitForTimeout(900);
    await page.mouse.up();
    await page.waitForTimeout(150);
  }

  const x0 = box.x + box.width * 0.2;
  const slopedLine = (rise: number, y: number) =>
    Array.from({ length: 26 }, (_, step) => ({ x: x0 + step * 8, y: y + (rise * step) / 25 }));

  // 3 graus (10 px em 200): encaixa e fica uma reta horizontal, fina. 10 graus (35 px): não encaixa.
  const nearY = top + 20;
  const farY = nearY + 80;
  await drawAndHold(slopedLine(10, nearY));
  await drawAndHold(slopedLine(35, farY));
  expect(await inkSpan(nearY - 10, nearY + 30)).toBeLessThan(10);
  expect(await inkSpan(farY - 10, farY + 50)).toBeGreaterThan(25);

  // Retângulo de 200 por 110 girado 30 graus, desenhado com tremor de 7 px: vira contorno reto.
  // Do lado direito e no meio da parte visível, longe das retas já desenhadas à esquerda.
  const cx = box.x + box.width * 0.72;
  const cy = (top + bottom) / 2;
  const angle = (30 * Math.PI) / 180;
  const corner = (u: number, v: number) => ({
    x: cx + u * Math.cos(angle) - v * Math.sin(angle),
    y: cy + u * Math.sin(angle) + v * Math.cos(angle),
  });
  const outline = [corner(-100, -55), corner(100, -55), corner(100, 55), corner(-100, 55)];
  const wobbly: { x: number; y: number }[] = [];
  for (let edge = 0; edge < 4; edge += 1) {
    const from = outline[edge]!;
    const to = outline[(edge + 1) % 4]!;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.round(length / 5);
    const nx = -(to.y - from.y) / length;
    const ny = (to.x - from.x) / length;
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const shake = Math.sin(wobbly.length * 0.9) * 7;
      wobbly.push({
        x: from.x + (to.x - from.x) * t + nx * shake,
        y: from.y + (to.y - from.y) * t + ny * shake,
      });
    }
  }
  wobbly.push({ ...outline[0]! });
  await drawAndHold(wobbly);

  // Retidão da aresta de cima, em pixels do bitmap: a tinta perto do meio dessa aresta é ajustada
  // a uma reta, e a sobra máxima em relação a ela mede o tremor que restou. O desenho tinha
  // tremor de 7 px de tela (cerca de 11 do bitmap); um contorno reconhecido fica rente à reta.
  const straightness = await sheet.evaluate((element, polygon) => {
    const canvas = element as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.height / rect.height;
    const toBitmap = (p: { x: number; y: number }) => ({
      x: (p.x - rect.left) * scale,
      y: (p.y - rect.top) * scale,
    });
    const [a, b] = [toBitmap(polygon[0]!), toBitmap(polygon[1]!)];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / length;
    const uy = (b.y - a.y) / length;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    const along: number[] = [];
    const across: number[] = [];
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3]! > 200 && data[index]! < 90 && data[index + 1]! < 90) {
        const px = (index / 4) % canvas.width;
        const py = Math.floor(index / 4 / canvas.width);
        const t = ((px - a.x) * ux + (py - a.y) * uy) / length;
        const offset = -(px - a.x) * uy + (py - a.y) * ux;
        if (t > 0.2 && t < 0.8 && Math.abs(offset) < 40) {
          along.push(t);
          across.push(offset);
        }
      }
    }
    // Reta de mínimos quadrados offset = m * t + c.
    const n = along.length;
    const meanT = along.reduce((sum, v) => sum + v, 0) / n;
    const meanO = across.reduce((sum, v) => sum + v, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
      num += (along[i]! - meanT) * (across[i]! - meanO);
      den += (along[i]! - meanT) ** 2;
    }
    const slope = num / den;
    let worst = 0;
    for (let i = 0; i < n; i += 1)
      worst = Math.max(worst, Math.abs(across[i]! - meanO - slope * (along[i]! - meanT)));
    return { worst, count: n };
  }, outline);
  await sheet.screenshot({ path: testInfo.outputPath("encaixe-no-eixo.png") });
  expect(straightness.count).toBeGreaterThan(100);
  expect(straightness.worst).toBeLessThan(5);
});
