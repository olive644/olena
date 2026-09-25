import { expect, test } from "@playwright/test";
import { createNotebookCollabHandler } from "../src/backend/notebook-collab-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";

test("colaboração exige conta e mostra apenas convite por link", async ({
  page,
  browser,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
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
  const host = page.getByRole("dialog", { name: "Escrever à mão" });
  if (testInfo.project.name === "desktop") {
    const paperType = host.getByRole("button", { name: "Tipo de papel" });
    const paperColor = host.getByRole("button", { name: "Cor da folha" });
    const before = await paperColor.boundingBox();
    await paperType.hover();
    const after = await paperColor.boundingBox();
    expect(after?.x).toBe(before?.x);
    expect(after?.y).toBe(before?.y);
    for (const name of ["Upload", "Exportar", "Salvar"]) {
      const button = host.getByRole("button", { name, exact: true });
      await button.hover();
      await expect
        .poll(() =>
          button.evaluate((element) => {
            const label = element.querySelector("span")!;
            return label.clientWidth >= label.scrollWidth;
          }),
        )
        .toBe(true);
      const buttonBounds = (await button.boundingBox())!;
      const dialogBounds = (await host.boundingBox())!;
      expect(buttonBounds.x + buttonBounds.width).toBeLessThanOrEqual(
        dialogBounds.x + dialogBounds.width,
      );
    }
  }
  await host.getByRole("button", { name: "Selecionar traços", exact: true }).click();
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await expect(host.locator(".handwriting-selection-actions")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await host.getByRole("button", { name: "Compartilhar caderno" }).click();
  await expect(
    host.getByText("Entre na sua conta para escrever com outras pessoas.", { exact: false }),
  ).toBeVisible();
  await expect(host.getByRole("textbox", { name: "Seu nome" })).toHaveCount(0);
  await expect(host.getByRole("button", { name: "Copiar código" })).toHaveCount(0);
  await expect(
    host.getByText("Compartilhar caderno para escrever junto", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("notebook-light.png") });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await expect(host.locator(".notebook-collaboration-panel")).toHaveCSS(
    "background-color",
    "rgb(23, 21, 28)",
  );
  await page.screenshot({ path: testInfo.outputPath("notebook-dark.png") });
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto("/?notebook-collab=ABCDE");
  await expect(guestPage.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await expect(guestPage.getByRole("textbox", { name: "Código da sala" })).toHaveCount(0);
  await guestContext.close();
});

test("salva automaticamente e compartilha uma cópia somente para leitura", async ({
  page,
}, testInfo) => {
  const handler = createNotebookCollabHandler({
    store: createMemoryRoomStore(),
    publish: async () => {},
    streamUrl: () => "",
  });
  await page.route("**/api/notebook-collab?*", async (route) => {
    const request = route.request();
    const response = await handler(
      new Request(request.url(), { method: "POST", body: request.postData() }),
    );
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: await response.text(),
    });
  });
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
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
  const editor = page.getByRole("dialog", { name: "Escrever à mão" });
  await editor.getByRole("button", { name: "Adicionar post-it" }).click();
  await editor
    .getByRole("textbox", { name: "Texto do post-it" })
    .fill("Questão protegida pelo salvamento automático");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem("helenastudy.workspace.v1") ?? "{}");
        return state.notes?.[0]?.assets?.[0]?.handwriting?.stickies?.[0]?.text;
      }),
    )
    .toBe("Questão protegida pelo salvamento automático");
  await editor.getByRole("button", { name: "Salvar", exact: true }).click();
  await editor.getByRole("button", { name: "Link de visualização" }).click();
  const share = page.getByRole("dialog", { name: "Link de visualização" });
  await expect(share).toBeVisible();
  await share.getByRole("button", { name: "Criar link" }).click();
  const link = share.getByRole("textbox", { name: "Link somente para leitura" });
  await expect(link).toHaveValue(/notebook-view=/);
  await page.screenshot({ path: testInfo.outputPath("link-de-leitura.png") });
  const url = await link.inputValue();
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Folhas compartilhadas" })).toBeVisible();
  await expect(page.locator(".notebook-reader img")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Salvar", exact: true })).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator(".notebook-reader img")
        .evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
});

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
  test.slow();
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
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
  await expect(dialog.locator(".handwriting-commandbar")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  for (const selector of [
    ".handwriting-paper-picker",
    ".handwriting-brush-panel",
    ".handwriting-footer",
  ]) {
    await expect(dialog.locator(selector)).toHaveCSS("background-color", "rgb(255, 255, 255)");
  }
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
    await expect(eraser.locator("span")).toHaveCSS("color", "rgb(255, 249, 239)");
    await expect(dialog.locator('[data-paper-editor-icon="hand"]')).toHaveCSS(
      "color",
      "rgb(23, 21, 28)",
    );
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await expect(dialog.locator('[data-paper-editor-icon="hand"]')).toHaveCSS(
      "color",
      "rgb(255, 249, 239)",
    );
    await expect(dialog.locator(".handwriting-commandbar")).toHaveCSS(
      "background-color",
      "rgb(41, 36, 50)",
    );
    for (const selector of [".handwriting-paper-picker", ".handwriting-footer"]) {
      await expect(dialog.locator(selector)).toHaveCSS("background-color", "rgb(41, 36, 50)");
    }
    await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
    await expect(dialog.locator(".handwriting-brush-panel")).toHaveCSS(
      "background-color",
      "rgb(41, 36, 50)",
    );
    await eraser.click();
    await expect(eraser).toHaveCSS("background-color", "rgb(116, 51, 224)");
    await expect(eraser.locator("span")).toHaveCSS("color", "rgb(255, 249, 239)");
    await page.screenshot({ path: testInfo.outputPath("ferramentas-contraste-escuro.png") });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  }
  await expect(dialog.getByRole("button", { name: "Caneta", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "Tipo de papel", exact: true }).click();
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
  const visibleViewport = await dialog.locator(".handwriting-viewport").boundingBox();
  const initialScroll = await dialog
    .locator(".handwriting-viewport")
    .evaluate((node) => node.scrollTop);
  expect(panStart).not.toBeNull();
  expect(visibleViewport).not.toBeNull();
  if (!panStart || !visibleViewport) return;
  const panY = Math.min(panStart.y + 150, visibleViewport.y + visibleViewport.height - 24);
  await page.mouse.move(panStart.x + 60, panY);
  await page.mouse.down();
  await page.mouse.move(panStart.x + 60, panY - 100, { steps: 8 });
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
  await expect(dialog.getByRole("button", { name: "Apagar seleção" })).toBeVisible();
  await dialog.getByRole("button", { name: "Apagar seleção" }).click();
  await dialog.getByRole("button", { name: "Desfazer" }).click();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  if (await dialog.getByRole("button", { name: "Fechar e manter rascunho" }).isVisible())
    await dialog.getByRole("button", { name: "Fechar e manter rascunho" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("img", { name: /folha manuscrita/i })).toBeVisible();
  await page.getByRole("button", { name: "Abrir Folha manuscrita" }).click();
  const reopened = page.getByRole("dialog", { name: "Folha manuscrita" });
  await reopened.getByRole("button", { name: "Upload", exact: true }).click();
  await reopened.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(reopened.getByLabel("Arquivo para importar")).toHaveCount(0);
  await reopened.getByRole("button", { name: "Upload", exact: true }).click();
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
  await reopened.getByLabel("Tamanho da imagem").fill("50");
  await expect(reopened.locator(".editor-import-size output")).toHaveText("50%");
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
  const imported = reopened.locator(".handwriting-import-selection");
  const beforeResize = await imported.boundingBox();
  await reopened.getByRole("button", { name: "Redimensionar imagem importada" }).press("ArrowLeft");
  await expect
    .poll(async () => (await imported.boundingBox())!.width)
    .toBeLessThan(beforeResize!.width);
  const beforeMove = await imported.boundingBox();
  await reopened.getByRole("button", { name: "Mover imagem importada" }).press("ArrowRight");
  await expect.poll(async () => (await imported.boundingBox())!.x).toBeGreaterThan(beforeMove!.x);
  await reopened
    .getByRole("button", { name: "Redimensionar imagem importada" })
    .scrollIntoViewIfNeeded();
  const handle = await reopened
    .getByRole("button", { name: "Redimensionar imagem importada" })
    .boundingBox();
  const oldWidth = (await imported.boundingBox())!.width;
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x + handle!.width / 2 - 25, handle!.y + handle!.height / 2 - 25, {
    steps: 5,
  });
  await page.mouse.up();
  await expect.poll(async () => (await imported.boundingBox())!.width).toBeLessThan(oldWidth);
  await reopened.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect
    .poll(async () => Math.round((await imported.boundingBox())!.width))
    .toBe(Math.round(oldWidth));
  await reopened.getByRole("button", { name: "Mover imagem importada" }).click();
  await reopened.getByRole("button", { name: "Remover imagem(ns)" }).click();
  await expect(imported).toHaveCount(0);
  await reopened.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(imported).toBeVisible();
  await reopened.getByRole("button", { name: "Tipo de papel", exact: true }).click();
  await expect(reopened.getByRole("button", { name: "Quadriculado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(reopened.getByRole("button", { name: "Limpar folha" })).toBeEnabled();
  await reopened.getByRole("button", { name: "Cor da folha", exact: true }).click();
  await reopened.getByRole("button", { name: "Escura", exact: true }).click();
  await reopened.getByRole("button", { name: "Texto na página inteira" }).click();
  const fullText = reopened.getByLabel("Texto da página inteira");
  await fullText.fill("voce nao sabe. tambem estudo portugues");
  await fullText.evaluate((node) => node.blur());
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
  await reopened.getByRole("button", { name: "Salvar", exact: true }).click();
  await reopened.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await page.reload();
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem("helenastudy.workspace.v1");
    if (!raw) return null;
    const workspace = JSON.parse(raw) as {
      notes: {
        assets: {
          handwriting?: {
            paper: string;
            images?: { dataUrl: string }[];
            strokes: { points: unknown[] }[];
          };
        }[];
      }[];
    };
    return workspace.notes[0]?.assets[0]?.handwriting ?? null;
  });
  expect(saved?.paper).toBe("grid");
  expect(saved?.images?.[0]?.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  expect(saved?.strokes).toHaveLength(1);
  expect(saved?.strokes[0]?.points).toHaveLength(2);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
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
  await page.getByRole("button", { name: "Cor da folha", exact: true }).click();
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
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
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
  await dialog.getByRole("button", { name: "Opções do post-it" }).click();
  await dialog.getByRole("button", { name: "Cores" }).click();
  await dialog.getByRole("button", { name: "Usar cor azul" }).click();
  await expect(dialog.getByRole("complementary", { name: "Pincéis da caneta" })).toBeVisible();
  await dialog.getByRole("button", { name: "Camadas da folha" }).click();
  await expect(dialog.getByRole("complementary", { name: "Camadas da folha" })).toBeVisible();
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
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  if (await dialog.getByRole("button", { name: "Fechar e manter rascunho" }).isVisible())
    await dialog.getByRole("button", { name: "Fechar e manter rascunho" }).click();
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

test("a escrita na janela acompanha a caneta e aparece ao vivo na folha", async ({
  page,
}, testInfo) => {
  test.slow();
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
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
  await page.getByLabel("Nome", { exact: true }).fill("Janela de escrita");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByRole("button", { name: "Escrever à mão" }).click();
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("checkbox", { name: /Ajuste inteligente/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Janela de escrita ampliada" }).click();

  const canvas = dialog.getByLabel("Área ampliada para escrever com dedo ou caneta");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const at = (fx: number, fy: number) => ({
    x: box.x + box.width * fx,
    y: box.y + box.height * fy,
  });
  const steps = 60;
  const path = Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    return at(0.1 + progress * 0.7, 0.5 + Math.sin(progress * Math.PI * 3) * 0.28);
  });
  await page.mouse.move(path[0]!.x, path[0]!.y);
  await page.mouse.down();
  for (const point of path.slice(1, 41)) await page.mouse.move(point.x, point.y, { steps: 2 });
  await page.waitForTimeout(150);

  // Mede se há tinta escura logo abaixo da ponta da caneta. Com a inércia do
  // estabilizador ao vivo a tinta ficava muitos pixels atrás da ponta.
  const tip = path[40]!;
  const inkAtTip = await canvas.evaluate(
    (element, position) => {
      const target = element as HTMLCanvasElement;
      const context = target.getContext("2d");
      if (!context) return false;
      const bounds = target.getBoundingClientRect();
      const centerX = Math.round(((position.x - bounds.left) / bounds.width) * target.width);
      const centerY = Math.round(((position.y - bounds.top) / bounds.height) * target.height);
      const radius = 4;
      const { data } = context.getImageData(
        Math.max(0, centerX - radius),
        Math.max(0, centerY - radius),
        radius * 2,
        radius * 2,
      );
      for (let index = 0; index < data.length; index += 4) {
        if (data[index]! < 90 && data[index + 1]! < 90 && data[index + 2]! < 100) return true;
      }
      return false;
    },
    { x: tip.x, y: tip.y },
  );
  // A folha também precisa mostrar o traço enquanto ele acontece na janela:
  // a janela cobre 500 por 185 unidades da folha a partir da origem dela. O traço
  // em andamento fica na camada de tinta ao vivo, por cima da folha.
  const sheet = dialog.locator(".handwriting-live-layer");
  const inkOnSheet = await sheet.evaluate(
    (element, position) => {
      const target = element as HTMLCanvasElement;
      const context = target.getContext("2d");
      if (!context) return false;
      const centerX = Math.round(100 + position.fx * 500);
      const centerY = Math.round(110 + position.fy * 185);
      const radius = 6;
      const { data } = context.getImageData(
        Math.max(0, centerX - radius),
        Math.max(0, centerY - radius),
        radius * 2,
        radius * 2,
      );
      for (let index = 0; index < data.length; index += 4) {
        if (data[index]! < 90 && data[index + 1]! < 90 && data[index + 2]! < 100) return true;
      }
      return false;
    },
    { fx: (tip.x - box.x) / box.width, fy: (tip.y - box.y) / box.height },
  );
  await page.mouse.up();
  expect(inkAtTip).toBe(true);
  expect(inkOnSheet).toBe(true);
  // Ao soltar, o traço passa para a folha e a camada ao vivo esvazia.
  await expect
    .poll(() =>
      sheet.evaluate((element) => {
        const target = element as HTMLCanvasElement;
        const { data } = target.getContext("2d")!.getImageData(0, 0, target.width, target.height);
        for (let index = 3; index < data.length; index += 4) if (data[index]! > 0) return false;
        return true;
      }),
    )
    .toBe(true);
});
