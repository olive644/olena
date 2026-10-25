import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

function samplePdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 400] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>",
    "<< /Length 53 >>\nstream\nBT /F1 20 Tf 40 320 Td (Algebra first page) Tj ET\nendstream",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 400] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    "<< /Length 53 >>\nstream\nBT /F1 20 Tf 40 320 Td (Geometry last page) Tj ET\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let file = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(file));
    file += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(file);
  file += `xref\n0 8\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(file);
}

for (const theme of ["light", "dark"]) {
  test(`Biblioteca integrada, revisão e Discord: ${theme}`, async ({ page }, info) => {
    const seed = createInitialWorkspace();
    seed.flashcards = [
      {
        id: "review",
        subjectId: seed.subjects[0]!.id,
        front: "Quanto é 2 + 2?",
        back: "Quatro",
        intervalDays: 0,
        nextReview: "2020-01-01",
      },
    ];
    await page.addInitScript(
      ({ seed, theme }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", theme);
        if (!localStorage.getItem("helenastudy.workspace.v1"))
          localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(seed));
      },
      { seed, theme },
    );
    await page.goto("/biblioteca");
    await expect(page.getByText("Quatro", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Revisar flashcards" }).click();
    await page.getByRole("button", { name: "Revelar resposta" }).click();
    await expect(page.getByText("Quatro", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fácil", exact: true }).click();
    await expect(page.getByText("Revisão concluída!")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
    await page.getByRole("button", { name: "Criar coleção" }).click();
    await page.getByLabel("Título", { exact: true }).fill("Revisão ENEM");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await page.getByRole("button", { name: /Revisão ENEM/ }).click();
    await page.getByRole("button", { name: "Adicionar material" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Título", { exact: true }).fill("Álgebra de papel");
    await dialog.getByRole("button", { name: "Tipo", exact: true }).click();
    await page.getByRole("option", { name: "Texto", exact: true }).click();
    await dialog
      .getByLabel("Conteúdo", { exact: true })
      .fill("A soma de dois números. Uma equação preserva a igualdade.");
    await dialog.getByLabel("Etiquetas separadas por vírgula").fill("ENEM, álgebra");
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await page.getByLabel("Buscar no acervo").fill("algebra");
    await expect(page.getByRole("heading", { name: "Álgebra de papel" })).toBeVisible();
    await page.getByRole("button", { name: "Favoritar material" }).click();
    await expect(page.getByRole("button", { name: "Favoritar material" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: /Álgebra de papel/ }).click();
    dialog = page.getByRole("dialog", { name: "Álgebra de papel", exact: true });
    await dialog
      .getByLabel("Trecho selecionado ou digitado")
      .fill("Uma equação preserva a igualdade.");
    await dialog.getByLabel("Sua anotação").fill("Rever antes da prova.");
    await dialog.getByRole("button", { name: "Salvar anotação" }).click();
    await expect(dialog.locator("blockquote")).toContainText("Rever antes da prova.");
    await dialog.getByRole("button", { name: "Fechar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.screenshot({
      path: info.outputPath(`biblioteca-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Álgebra de papel" })).toBeVisible();
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await expect(page.getByRole("link", { name: "Discord", exact: true })).toHaveAttribute(
      "href",
      "https://discord.gg/EHh6VpGUd",
    );
    await expect(page.getByRole("link", { name: "Discord" }).locator("img")).toHaveJSProperty(
      "naturalWidth",
      48,
    );
  });
}

test("PDF local: pesquisa, marcador, anotações e retomada após recarregar", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/biblioteca");
  await page.getByRole("button", { name: "Adicionar material" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título", { exact: true }).fill("Meu PDF de estudo");
  await dialog.getByRole("button", { name: "Tipo", exact: true }).click();
  await page.getByRole("option", { name: "PDF", exact: true }).click();
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: "study.pdf", mimeType: "application/pdf", buffer: samplePdf() });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /Meu PDF de estudo/ }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Algebra first page", { exact: true })).toBeVisible();
  await dialog.getByLabel("Pesquisar no PDF").fill("Geometry");
  await dialog.getByRole("status").getByRole("button", { name: "2", exact: true }).click();
  await expect(dialog.getByText("Geometry last page", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Marcar página" }).click();
  await expect(dialog.getByRole("button", { name: "Marcar página" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByLabel("Trecho selecionado ou digitado").fill("Geometry last page");
  await dialog.getByLabel("Sua anotação").fill("Propriedades geométricas");
  await dialog.getByRole("button", { name: "Salvar anotação" }).click();
  await page.screenshot({ path: info.outputPath("pdf-reader.png"), animations: "disabled" });
  await dialog.locator(".library-reader").evaluate((element) => {
    element.scrollTop = 180;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("helenastudy.workspace.v1") ?? "{}").materials?.[0]
            ?.scroll,
      ),
    )
    .toBe(180);
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Continuar leitura" }).click();
  await expect(page.getByLabel("Página", { exact: true })).toHaveValue("2");
  await expect(page.getByText("Propriedades geométricas", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar página" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(() =>
      page.locator(".library-reader").evaluate((element) => Math.round(element.scrollTop)),
    )
    .toBe(180);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("olena-library-files");
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
  await page.getByRole("button", { name: "Continuar leitura" }).click();
  await expect(page.getByLabel("Selecionar o PDF original")).toBeVisible();
  await page.getByLabel("Selecionar o PDF original").setInputFiles({
    name: "wrong.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 not the original"),
  });
  await expect(page.getByText("Selecione o mesmo PDF original, com até 20 MB.")).toBeVisible();
  await page
    .getByLabel("Selecionar o PDF original")
    .setInputFiles({ name: "study.pdf", mimeType: "application/pdf", buffer: samplePdf() });
  await expect(page.getByText("Geometry last page", { exact: true })).toBeVisible();
  await expect(page.getByText("Propriedades geométricas", { exact: true })).toBeVisible();
});
