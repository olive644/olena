import { expect, test } from "@playwright/test";

function twoPagePdf() {
  const streams = ["1 0 0 rg 0 0 300 400 re f", "0 0 1 rg 0 0 300 400 re f"];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << >> /Contents 5 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << >> /Contents 6 0 R >>",
    ...streams.map((stream) => `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 7\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test("escreve, ajusta e salva uma folha manuscrita", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  }
  await expect(page.getByText("Matéria do novo caderno")).toHaveCount(0);
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Meu universo");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Meu universo" })).toBeVisible();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByRole("button", { name: "Escrever à mão" }).click();

  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Tela cheia", exact: true }).click();
  await expect(dialog).toHaveClass(/capture-dialog--expanded/);
  await dialog.getByRole("button", { name: "Sair da tela cheia" }).click();
  await expect(dialog).not.toHaveClass(/capture-dialog--expanded/);
  await expect(dialog.locator("svg.lucide")).toHaveCount(0);
  {
    const eraser = dialog.getByRole("button", { name: "Borracha", exact: true });
    await expect(eraser.locator("span")).toHaveCSS("max-width", "0px");
    await eraser.click();
    await expect(eraser.locator("span")).toHaveCSS("max-width", "150px");
    await expect(eraser.locator("svg")).toHaveCSS("animation-name", "editor-tool-pick");
    await expect(eraser).toHaveCSS("background-color", "rgb(116, 51, 224)");
    await expect(eraser.locator("span")).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(dialog.locator('[data-paper-editor-icon="hand"]')).toHaveCSS(
      "color",
      "rgb(23, 21, 28)",
    );
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await expect(eraser).toHaveCSS("background-color", "rgb(116, 51, 224)");
    await expect(eraser.locator("span")).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.screenshot({ path: testInfo.outputPath("ferramentas-contraste-escuro.png") });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  }
  await expect(dialog.getByRole("button", { name: "Caneta", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(dialog.getByRole("button", { name: "Pautado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "Quadriculado" }).click();
  await expect(dialog.getByRole("button", { name: "Quadriculado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const canvas = dialog.locator("canvas.handwriting-canvas");
  await dialog.getByRole("button", { name: "Lupa para ampliar" }).click();
  await canvas.click({ position: { x: 60, y: 60 } });
  await expect(dialog.getByRole("button", { name: "115%" })).toBeVisible();
  await dialog.getByRole("button", { name: "Lupa para reduzir" }).click();
  await canvas.click({ position: { x: 60, y: 60 } });
  await expect(dialog.getByRole("button", { name: "100%" })).toBeVisible();
  await dialog.getByRole("button", { name: "Mover folha" }).click();
  await expect(dialog.getByRole("button", { name: "Mover folha" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const panStart = await canvas.boundingBox();
  const initialScroll = await dialog
    .locator(".handwriting-viewport")
    .evaluate((node) => node.scrollTop);
  expect(panStart).not.toBeNull();
  if (!panStart) return;
  await page.mouse.move(panStart.x + 60, panStart.y + 150);
  await page.mouse.down();
  await page.mouse.move(panStart.x + 60, panStart.y + 50, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(() => dialog.locator(".handwriting-viewport").evaluate((node) => node.scrollTop))
    .toBeGreaterThan(initialScroll);
  await expect(dialog.getByRole("button", { name: "Limpar folha" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Régua", exact: true }).click();
  await expect(dialog.getByLabel("Unidades da régua")).toBeVisible();
  await dialog.getByRole("button", { name: "Centímetros", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Centímetros", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "Pixels", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("estudio-manuscrito.png") });

  const bounds = await canvas.boundingBox();
  const viewport = await dialog.locator(".handwriting-viewport").boundingBox();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!bounds || !viewport) return;
  expect(viewport.x).toBeGreaterThanOrEqual(0);
  expect(viewport.x + viewport.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const startX = Math.max(bounds.x, viewport.x) + 40;
  const startY = Math.max(bounds.y, viewport.y) + 40;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 100, startY + 7, { steps: 10 });
  const measurement = dialog.getByLabel("Medição da régua");
  await expect(measurement).toBeVisible();
  await expect(measurement).toContainText(
    `${Math.round((Math.hypot(100, 7) * 1200) / bounds.width)} px`,
  );
  await page.screenshot({ path: testInfo.outputPath("regua-medindo.png") });
  await page.mouse.up();
  await expect(measurement).toHaveCount(0);
  const inkPoint = {
    x: ((startX + 50 - bounds.x) / bounds.width) * 1200,
    y: ((startY + 3.5 - bounds.y) / bounds.height) * 1600,
  };
  await dialog.getByRole("button", { name: "Marca-texto", exact: true }).click();
  const markerBounds = await canvas.boundingBox();
  const markerX = markerBounds!.x + (inkPoint.x * markerBounds!.width) / 1200;
  const markerY = markerBounds!.y + (inkPoint.y * markerBounds!.height) / 1600;
  await page.mouse.move(markerX - 20, markerY);
  await page.mouse.down();
  await page.mouse.move(markerX + 20, markerY, { steps: 12 });
  await page.mouse.up();
  const darkest = await canvas.evaluate((node: HTMLCanvasElement, point) => {
    const pixels = node
      .getContext("2d")!
      .getImageData(Math.floor(point.x) - 2, Math.floor(point.y) - 2, 5, 5).data;
    return Math.min(...Array.from({ length: 25 }, (_, index) => pixels[index * 4]!));
  }, inkPoint);
  expect(darkest).toBeLessThan(60);
  await dialog.getByRole("button", { name: "Desfazer", exact: true }).click();
  await dialog.getByRole("button", { name: "Régua", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Desfazer" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Desfazer" }).click();
  await expect(dialog.getByRole("button", { name: "Refazer" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Refazer" }).click();
  await dialog.getByRole("button", { name: "Selecionar traços" }).click();
  const selectionBounds = await canvas.boundingBox();
  const selectionX = selectionBounds!.x + (inkPoint.x * selectionBounds!.width) / 1200;
  const selectionY = selectionBounds!.y + (inkPoint.y * selectionBounds!.height) / 1600;
  await page.mouse.move(selectionX - 30, selectionY - 10);
  await page.mouse.down();
  await page.mouse.move(selectionX + 30, selectionY + 10, { steps: 8 });
  await page.mouse.up();
  await expect(dialog.getByRole("button", { name: "Apagar" })).toBeVisible();
  await dialog.getByRole("button", { name: "Apagar" }).click();
  await dialog.getByRole("button", { name: "Desfazer" }).click();
  await dialog.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("img", { name: /folha manuscrita/i })).toBeVisible();
  await page.getByRole("button", { name: "Abrir Folha manuscrita" }).click();
  const reopened = page.getByRole("dialog", { name: "Folha manuscrita" });
  await reopened.getByRole("button", { name: "Importar", exact: true }).click();
  const fileInput = reopened.getByLabel("Arquivo para importar");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 20, 20);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  await fileInput.setInputFiles({
    name: "imagem.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(reopened.getByRole("button", { name: "Usar esta página" })).toBeEnabled();
  await fileInput.setInputFiles({
    name: "paginas.pdf",
    mimeType: "application/pdf",
    buffer: twoPagePdf(),
  });
  await expect(reopened.getByRole("button", { name: "Usar esta página" })).toBeEnabled();
  await reopened.getByRole("spinbutton").fill("2");
  await expect(reopened.getByRole("button", { name: "Usar esta página" })).toBeEnabled();
  await reopened.getByRole("button", { name: "Usar esta página" }).click();
  await expect
    .poll(() =>
      reopened
        .locator("canvas.handwriting-canvas")
        .evaluate(
          (canvas: HTMLCanvasElement) =>
            canvas.getContext("2d")!.getImageData(600, 800, 1, 1).data[2],
        ),
    )
    .toBeGreaterThan(200);
  await expect
    .poll(() =>
      reopened
        .locator("canvas.handwriting-canvas")
        .evaluate(
          (canvas: HTMLCanvasElement) =>
            canvas.getContext("2d")!.getImageData(600, 800, 1, 1).data[0],
        ),
    )
    .toBeLessThan(50);
  await page.screenshot({ path: testInfo.outputPath("pagina-importada.png") });
  await expect(reopened.getByRole("button", { name: "Quadriculado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(reopened.getByRole("button", { name: "Limpar folha" })).toBeEnabled();
  await reopened.getByRole("button", { name: "Escura", exact: true }).click();
  await reopened.getByRole("button", { name: "Texto na página inteira" }).click();
  const fullText = reopened.getByLabel("Texto da página inteira");
  await fullText.fill("voce nao sabe. tambem estudo portugues");
  await reopened.getByRole("button", { name: "Revisar texto" }).click();
  await expect(fullText).toHaveValue("Você não sabe. Também estudo português");
  await reopened.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(fullText).toHaveValue("voce nao sabe. tambem estudo portugues");
  await fullText.fill("Minha anotação pelo teclado\nSegunda linha da página");
  const textSize = await fullText.boundingBox();
  const pageSize = await reopened.locator("canvas.handwriting-canvas").boundingBox();
  expect(textSize!.width / pageSize!.width).toBeGreaterThan(0.8);
  expect(textSize!.height / pageSize!.height).toBeGreaterThan(0.85);
  await page.screenshot({ path: testInfo.outputPath("texto-pagina.png"), animations: "disabled" });
  await reopened.getByRole("button", { name: "Borracha", exact: true }).click();
  await expect(fullText).toHaveCount(0);
  await reopened.locator(".handwriting-viewport").evaluate((node) => {
    node.scrollTop = 0;
    node.scrollLeft = 0;
  });
  const eraserCanvas = reopened.locator("canvas.handwriting-canvas");
  const eraserBounds = await eraserCanvas.boundingBox();
  await eraserCanvas.click({
    position: { x: (128 * eraserBounds!.width) / 1200, y: (85 * eraserBounds!.height) / 1600 },
  });
  await reopened.getByRole("button", { name: "Texto na página inteira" }).click();
  await expect(fullText).toHaveValue(/^ +[a-z]* anotação pelo teclado\nSegunda linha da página$/u);
  const erasedText = await fullText.inputValue();
  await reopened.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(fullText).toHaveValue("Minha anotação pelo teclado\nSegunda linha da página");
  await reopened.getByRole("button", { name: "Refazer", exact: true }).click();
  await expect(fullText).toHaveValue(erasedText);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await page.screenshot({ path: testInfo.outputPath("editor-escuro.png"), animations: "disabled" });
  await reopened.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await page.reload();
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem("helenastudy.workspace.v1");
    if (!raw) return null;
    const workspace = JSON.parse(raw) as {
      notes: {
        assets: {
          handwriting?: { paper: string; background?: string; strokes: { points: unknown[] }[] };
        }[];
      }[];
    };
    return workspace.notes[0]?.assets[0]?.handwriting ?? null;
  });
  expect(saved?.paper).toBe("grid");
  expect(saved?.background).toMatch(/^data:image\/jpeg;base64,/);
  expect(saved?.strokes).toHaveLength(1);
  expect(saved?.strokes[0]?.points).toHaveLength(2);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  }
  await page.screenshot({ path: testInfo.outputPath("vitrine-cadernos.png"), fullPage: true });
  await page.locator(".notebook-card").first().click();
  await page.getByRole("button", { name: "Ver todas as folhas" }).click();
  await page.locator(".notebook-page-card").first().click();
  await page.getByRole("button", { name: "Abrir Folha manuscrita" }).click();
  await expect(page.getByRole("dialog", { name: "Folha manuscrita" })).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("dialog", { name: "Folha manuscrita" })
        .locator("canvas.handwriting-canvas")
        .evaluate(
          (canvas: HTMLCanvasElement) =>
            canvas.getContext("2d")!.getImageData(600, 800, 1, 1).data[0],
        ),
    )
    .toBeLessThan(50);
  await page.getByRole("button", { name: "Texto na página inteira" }).click();
  await expect(page.getByLabel("Texto da página inteira")).toHaveValue(erasedText);
  await expect(page.getByRole("button", { name: "Escura", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("recupera rascunho, adiciona post-it e organiza folhas", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByRole("button", { name: "Escrever à mão" }).click();
  let dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await dialog.getByRole("button", { name: "Adicionar post-it" }).click();
  await dialog.getByRole("textbox", { name: "Texto do post-it" }).fill("Revisar gramática");
  await dialog.getByRole("button", { name: "Post-it azul" }).click();
  await page.screenshot({ path: testInfo.outputPath("postit-no-caderno.png") });
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(
    dialog.getByRole("alertdialog", { name: "Fechar folha com alterações" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar e manter rascunho" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Escrever à mão" }).click();
  dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await expect(dialog.getByRole("textbox", { name: "Texto do post-it" })).toHaveValue(
    "Revisar gramática",
  );
  await expect(dialog.getByText("Rascunho recuperado")).toBeVisible();
  await expect(dialog.locator(".brush-instrument")).toHaveCount(3);
  await expect
    .poll(() =>
      dialog
        .locator(".brush-instrument")
        .evaluateAll((images) =>
          images.every((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await dialog.getByRole("button", { name: /Caneta-tinteiro/ }).click();
  await dialog.getByRole("button", { name: "Régua", exact: true }).click();
  await expect(dialog.getByLabel("Unidades da régua")).toBeVisible();
  await expect(dialog.getByLabel("Pincéis da caneta")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /Caneta-tinteiro/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({ path: testInfo.outputPath("estojo-restaurado.png") });
  await dialog.getByRole("button", { name: "Janela de escrita ampliada" }).click();
  await expect(dialog.getByRole("region", { name: "Janela de escrita ampliada" })).toBeVisible();
  await dialog.getByRole("button", { name: "Próxima linha" }).click();
  const writingCanvas = dialog.getByLabel("Área ampliada para escrever com dedo ou caneta");
  const bounds = await writingCanvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  await page.mouse.move(bounds.x + 30, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + bounds.height / 2, { steps: 6 });
  await page.mouse.up();
  await dialog.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await expect(dialog).not.toBeVisible();
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem("helenastudy.workspace.v1");
    if (!raw) return null;
    const workspace = JSON.parse(raw) as {
      notes: {
        assets: {
          handwriting?: { strokes: unknown[]; stickies?: { text: string; color: string }[] };
        }[];
      }[];
    };
    return workspace.notes[0]?.assets[0]?.handwriting ?? null;
  });
  expect(saved?.stickies?.[0]).toMatchObject({ text: "Revisar gramática", color: "blue" });
  expect(saved?.strokes).toHaveLength(1);
  expect(saved?.strokes[0]).toMatchObject({ brush: "ink" });
  await page.getByRole("button", { name: "Abrir Folha manuscrita" }).click();
  const reopened = page.getByRole("dialog", { name: "Folha manuscrita" });
  const download = page.waitForEvent("download");
  await reopened.getByRole("button", { name: "Exportar", exact: true }).click();
  await reopened.getByRole("button", { name: "PNG", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("folha-do-caderno.png");
  await reopened.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByRole("button", { name: "Folhas do caderno" }).click();
  await expect(page.locator(".notebook-page-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Mover Nova folha para depois" }).first().click();
  await expect(page.locator(".notebook-page-card__number").first()).toHaveText("01");
});
