import { openHandwritingA4, activateHandwritingPen } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

test("borracha de fundo apaga a página importada e deixa a tinta e a pauta", async ({
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

  // Sem página ou imagem importada, a borracha de fundo não pode ser usada.
  await dialog.getByRole("button", { name: "Borracha", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Apagar só o fundo importado" })).toBeDisabled();

  // Importa uma página inteira azul.
  await dialog.getByRole("button", { name: "Upload", exact: true }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#3a7bd5";
    context.fillRect(0, 0, 600, 800);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  await dialog.getByLabel("Arquivo para importar").setInputFiles({
    name: "pagina.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await dialog.getByRole("button", { name: "Usar esta página" }).click();
  // Importar troca de ferramenta: volta para a borracha, e agora o modo de fundo está liberado.
  await dialog.getByRole("button", { name: "Borracha", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Apagar só o fundo importado" })).toBeEnabled();

  const sheet = dialog.locator(".handwriting-viewport canvas").first();
  await sheet.scrollIntoViewIfNeeded();

  // Tudo é combinado em coordenadas da folha (1200 por 1600) e só convertido para a tela na hora
  // de cada gesto, porque trocar de ferramenta muda a altura do painel e desloca a folha.
  const toScreen = async (px: number, py: number) => {
    const box = (await sheet.boundingBox())!;
    return { x: box.x + (px * box.width) / 1200, y: box.y + (py * box.height) / 1600 };
  };
  const colorAt = (px: number, py: number) =>
    sheet.evaluate(
      (element, p) => {
        const canvas = element as HTMLCanvasElement;
        const x = Math.round((p.px * canvas.width) / 1200);
        const y = Math.round((p.py * canvas.height) / 1600);
        return [...canvas.getContext("2d")!.getImageData(x, y, 1, 1).data];
      },
      { px, py },
    );
  const isBlue = (c: number[]) => c[2]! > 180 && c[0]! < 120;
  const isPaper = (c: number[]) => c[0]! > 220 && c[1]! > 220 && c[2]! > 200;
  const isInk = (c: number[]) => c[0]! < 90 && c[1]! < 90 && c[2]! < 100;
  const drag = async (fromX: number, toX: number, py: number) => {
    const start = await toScreen(fromX, py);
    const end = await toScreen(toX, py);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let step = 1; step <= 20; step += 1) {
      await page.mouse.move(start.x + ((end.x - start.x) * step) / 20, start.y);
      await page.waitForTimeout(5);
    }
    await page.mouse.up();
    await page.waitForTimeout(200);
  };

  // A linha de tinta e a varredura da borracha ficam na altura 250 da folha; a borracha tem
  // 60 de diâmetro, então 15 acima está dentro e 120 acima está fora.
  const row = 250;
  const inside = [500, row - 15] as const;
  const outside = [500, row - 120] as const;
  const onInk = [560, row] as const;
  expect(isBlue(await colorAt(...inside))).toBe(true);
  expect(isBlue(await colorAt(...outside))).toBe(true);

  // Uma linha de tinta com a caneta, por onde a borracha vai passar depois.
  await dialog.getByRole("button", { name: "Caneta", exact: true }).click();
  await activateHandwritingPen(page);
  await drag(300, 700, row);
  expect(isInk(await colorAt(...onInk))).toBe(true);

  // Borracha de fundo: arrasta por cima da linha.
  await dialog.getByRole("button", { name: "Borracha", exact: true }).click();
  await dialog.getByRole("button", { name: "Apagar só o fundo importado" }).click();
  await drag(280, 720, row);
  await sheet.screenshot({ path: testInfo.outputPath("borracha-de-fundo.png") });

  // O fundo sumiu por onde a borracha passou e o papel apareceu; longe dali continua azul.
  expect(isPaper(await colorAt(...inside))).toBe(true);
  expect(isBlue(await colorAt(...outside))).toBe(true);
  // A tinta continua inteira.
  expect(isInk(await colorAt(...onInk))).toBe(true);

  // Um passo de desfazer devolve o fundo.
  await dialog.getByRole("button", { name: "Desfazer", exact: true }).click();
  await page.waitForTimeout(200);
  expect(isBlue(await colorAt(...inside))).toBe(true);
  expect(isInk(await colorAt(...onInk))).toBe(true);
});
