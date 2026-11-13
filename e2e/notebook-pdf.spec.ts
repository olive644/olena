import { expect, test } from "@playwright/test";
import { activateHandwritingPen } from "./notebook-helpers";

test("exportar PDF permanece disponível dentro da folha", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo de desenho verificado no desktop.");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    // A impressão real abriria o diálogo do sistema; o teste só precisa saber que chegou lá.
    window.addEventListener("beforeprint", () => undefined);
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name: "Cadernos", exact: true })
    .click();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Caderno de teste");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await activateHandwritingPen(page);
  const canvas = dialog.locator(".handwriting-viewport canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + 80);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(
      box.x + box.width * 0.2 + step * 12,
      box.y + 80 + Math.sin(step / 3) * 20,
    );
    await page.waitForTimeout(8);
  }
  await page.mouse.up();
  const originalSize = await canvas.evaluate((element) => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height,
  }));
  await dialog.getByRole("button", { name: "Compartilhar", exact: true }).click();
  const pngDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "PNG", exact: true }).click();
  const png = await pngDownload;
  await png.saveAs(testInfo.outputPath("notebook-export.png"));
  expect(png.suggestedFilename()).toBe("folha-do-caderno.png");
  const unchangedSize = await canvas.evaluate((element) => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height,
  }));
  expect(unchangedSize).toEqual(originalSize);
  await dialog.getByRole("button", { name: "Compartilhar", exact: true }).click();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Baixar PDF", exact: true }).click();
  const pdf = await download;
  expect(pdf.suggestedFilename()).toBe("folha-do-caderno.pdf");
  await pdf.saveAs(testInfo.outputPath("notebook-export.pdf"));
  await expect(page.getByRole("button", { name: "Exportar PDF" })).toHaveCount(0);
});

test("Upload importa PDF de uma página como folha do caderno", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Caderno PDF");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Abrir Caderno PDF", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão" });
  await editor.getByRole("button", { name: "Upload", exact: true }).click();
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 300] /Resources << >> >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += "xref\n0 4\n0000000000 65535 f \n";
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n${xref}\n%%EOF\n`;
  await editor.getByLabel("Arquivo para importar").setInputFiles({
    name: "folha.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });
  await editor.getByRole("button", { name: "Importar todas (1)", exact: true }).click();
  await expect(editor.getByLabel("Arquivo para importar")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (localStorage.getItem("helenastudy.workspace.v1") ?? "").includes("backgroundFrame"),
      ),
    )
    .toBe(true);
  if (info.project.name === "desktop") {
    await page.getByRole("button", { name: /Abrir preview de Página importada 1/i }).click();
    await activateHandwritingPen(page);
    const canvas = editor.locator(".handwriting-viewport canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error("Folha importada indisponível");
    await page.mouse.move(bounds.x + 80, bounds.y + 80);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 160, bounds.y + 105, { steps: 8 });
    await page.mouse.up();
    await editor.getByRole("button", { name: "Salvar caderno" }).click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = JSON.parse(localStorage.getItem("helenastudy.workspace.v1") ?? "{}");
          return Boolean(
            state.notes?.some(
              (note: {
                title: string;
                assets: { handwriting?: { background?: string; strokes: unknown[] } }[];
              }) =>
                note.title === "Página importada 1" &&
                note.assets.some(
                  ({ handwriting }) => handwriting?.background && handwriting.strokes.length > 0,
                ),
            ),
          );
        }),
      )
      .toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Abrir Caderno PDF", exact: true }).click();
    await page.getByRole("button", { name: /Abrir preview de Página importada 1/i }).click();
    await editor.getByRole("button", { name: "Compartilhar", exact: true }).click();
    const download = page.waitForEvent("download");
    await editor.getByRole("button", { name: "Baixar PDF", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("folha-do-caderno.pdf");
  }
});
