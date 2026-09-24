import { expect, test } from "@playwright/test";

// O preview do e2e serve os cabeçalhos do vercel.json, inclusive o CSP. Este teste
// garante que o OCR local funciona sob ele e que nada é buscado fora do domínio.
test("o OCR local reconhece a fórmula sob o CSP de produção, sem chamar terceiros", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo de desenho verificado no desktop.");
  test.setTimeout(180_000);

  const violations: string[] = [];
  const externalRequests: string[] = [];
  // As fontes do Google carregam com a página e são tratadas à parte: aqui só
  // interessa o que o OCR pede depois do clique.
  let recording = false;
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  page.on("request", (request) => {
    if (!recording) return;
    const url = new URL(request.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (url.origin !== new URL(page.url()).origin) externalRequests.push(request.url());
  });
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
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByRole("button", { name: "Escrever à mão" }).click();
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  const canvas = dialog.locator(".handwriting-viewport canvas").first();
  await canvas.scrollIntoViewIfNeeded();

  async function stroke(points: [number, number][]) {
    const box = (await canvas.boundingBox())!;
    const at = ([fx, fy]: [number, number]) => [box.x + box.width * fx, box.y + box.height * fy];
    const [x0, y0] = at(points[0]!);
    await page.mouse.move(x0!, y0!);
    await page.mouse.down();
    for (const point of points.slice(1)) {
      const [x, y] = at(point);
      await page.mouse.move(x!, y!, { steps: 6 });
    }
    await page.mouse.up();
  }

  // "2 + 3" em traços grandes
  await stroke([
    [0.2, 0.1],
    [0.28, 0.1],
    [0.3, 0.13],
    [0.2, 0.19],
    [0.3, 0.19],
  ]);
  await stroke([
    [0.36, 0.13],
    [0.36, 0.19],
  ]);
  await stroke([
    [0.33, 0.16],
    [0.39, 0.16],
  ]);
  await stroke([
    [0.45, 0.1],
    [0.53, 0.1],
    [0.53, 0.145],
    [0.46, 0.145],
    [0.53, 0.145],
    [0.53, 0.19],
    [0.45, 0.19],
  ]);

  await dialog.getByRole("button", { name: "Selecionar traços", exact: true }).click();
  // a barra de modo desloca a folha ao trocar de ferramenta: medir de novo
  await page.waitForTimeout(400);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.05);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.25, { steps: 10 });
  await page.waitForTimeout(300);
  await page.mouse.up();

  const recognize = dialog.getByRole("button", { name: /Reconhecer OCR local|OCR \d+%/ });
  recording = true;
  await recognize.click();
  const formula = dialog.getByLabel("Fórmula matemática");
  await expect(formula).not.toHaveValue("", { timeout: 150_000 });

  await expect(dialog.locator(".capture-error")).toHaveCount(0);
  expect(violations).toEqual([]);
  expect(externalRequests).toEqual([]);
});
