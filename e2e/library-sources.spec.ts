import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Fontes que não são PDF: TXT em ANSI, nota em branco, foto grande e link do YouTube.
const texto =
  "A fotossíntese é o processo pelo qual as plantas produzem glicose usando luz solar, água e gás carbônico. A clorofila, presente nos cloroplastos, absorve a luz. Como resultado, a planta libera oxigênio para a atmosfera. A fotossíntese ocorre em duas etapas: a fase clara, que depende da luz e produz ATP e NADPH, e a fase escura, que usa esses compostos para fixar o carbono no ciclo de Calvin. A respiração celular é o processo inverso, no qual a glicose é quebrada para liberar energia. O ciclo do carbono liga os dois processos na natureza. Sem a fotossíntese, não haveria oxigênio suficiente para os animais. A glicose produzida é armazenada como amido nas raízes e sementes. Os estômatos são poros nas folhas que controlam a entrada de gás carbônico e a saída de oxigênio.";

// Bloco de Notas do Windows ("ANSI"): um byte por letra, o í é 0xED. Não é UTF-8 válido.
const ansi = Buffer.from(texto, "latin1");

async function openFolder(page: Page, theme: string) {
  await page.addInitScript((appearance) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.theme", appearance);
  }, theme);
  await page.goto("/cadernos");
  const dismiss = async () => {
    for (const name of ["Entendi", "Fechar conquista"]) {
      const button = page.getByRole("button", { name });
      while (await button.first().isVisible()) await button.first().click();
    }
  };
  await page.waitForTimeout(1200);
  await dismiss();
  await page.getByRole("button", { name: "Criar pasta", exact: true }).click();
  const create = page.getByRole("dialog", { name: "Nova pasta", exact: true });
  await create.getByLabel("Nome da pasta", { exact: true }).fill("biologia");
  await create.getByRole("button", { name: "Criar pasta", exact: true }).click();
  await page.waitForTimeout(800);
  await dismiss();
  await page
    .getByRole("button", { name: /biologia/ })
    .first()
    .click();
}

for (const theme of ["light", "dark"]) {
  test(`fontes: TXT ANSI, foto grande, nota e YouTube entram; só a Olena gera: ${theme}`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    const external: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol.startsWith("http"))
        external.push(request.url());
    });
    await openFolder(page, theme);
    const file = page.locator('input[type="file"]');

    await file.setInputFiles({ name: "ansi.txt", mimeType: "text/plain", buffer: ansi });
    await expect(page.getByText("ansi.txt", { exact: true })).toBeVisible();

    // Foto grande (mais de 1 MB): é reduzida no aparelho, em vez de recusada.
    const big = await page.evaluate((t) => {
      const canvas = document.createElement("canvas");
      canvas.width = 3200;
      canvas.height = 2000;
      const context = canvas.getContext("2d")!;
      const noise = context.createImageData(3200, 2000);
      for (let index = 0; index < noise.data.length; index += 4) {
        const grain = 235 + Math.floor(Math.random() * 20);
        noise.data[index] = noise.data[index + 1] = noise.data[index + 2] = grain;
        noise.data[index + 3] = 255;
      }
      context.putImageData(noise, 0, 0);
      context.fillStyle = "#000";
      context.font = "64px Arial";
      context.fillText(t.slice(0, 60), 80, 120);
      return canvas.toDataURL("image/png").split(",")[1]!;
    }, texto);
    const photo = Buffer.from(big, "base64");
    expect(photo.length).toBeGreaterThan(1024 * 1024);
    await file.setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: photo });
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByText("foto.png", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Adicionar fontes", exact: true }).click();
    await page.getByRole("button", { name: "Nota em branco" }).click();
    await page.getByLabel("Título").fill("Minha nota");
    await page.getByLabel("Nota", { exact: true }).fill(texto);
    await page.getByRole("button", { name: "Adicionar fonte", exact: true }).click();
    await expect(page.getByText("Minha nota", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Adicionar fontes", exact: true }).click();
    await page.getByRole("button", { name: "Link do YouTube" }).click();
    await page.getByLabel("Link do vídeo").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Adicionar fonte", exact: true }).click();
    await expect(
      page.getByRole("checkbox", {
        name: "Selecionar https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      }),
    ).toBeDisabled();
    await expect(page.getByText(/Só referência: o OlenaStudy não lê vídeos/)).toBeVisible();
    await page.screenshot({ path: info.outputPath(`fontes-${theme}.png`) });

    // Os quatro tipos só oferecem a Olena, com o aviso de envio e do limite diário. Sem conta
    // conectada, a tela orienta a entrar e nada sai do aparelho.
    for (const [tab, action] of [
      ["Resumo", "Criar resumo"],
      ["Flashcards", "Criar flashcards"],
      ["Quizzes", "Criar quiz"],
      ["Simulados", "Criar simulado"],
    ] as const) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await page.getByRole("button", { name: action, exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("checkbox", { name: "Selecionar ansi.txt" }).check();
      await expect(
        dialog.getByRole("button", { name: "Gerar com a Olena", exact: true }),
      ).toBeVisible();
      for (const free of [
        "Resumo automático",
        "Flashcards automáticos",
        "Quiz automático",
        "Gerar simulado",
      ])
        await expect(dialog.getByRole("button", { name: free, exact: true })).toHaveCount(0);
      await expect(dialog).toContainText("o texto das fontes selecionadas é enviado a ela");
      await expect(dialog).toContainText("2 vezes por dia");
      await page.waitForTimeout(600);
      await page.screenshot({ path: info.outputPath(`gerar-${tab}-${theme}.png`) });
      await dialog.getByRole("button", { name: "Gerar com a Olena", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText(
        /Entre na sua conta|autenticação da Olena/,
      );
      await page.keyboard.press("Escape");
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
    // Nenhum envio externo, nem para a Olena: sem conta, nada sai.
    expect(external).toEqual([]);
  });
}

// PDF de 2 MB (acima do antigo teto de 1 MB) entra; PDF de 6 MB é recusado com aviso.
test("teto de PDF: 2 MB entra, 6 MB é recusado", async ({ page }) => {
  test.setTimeout(90_000);
  const base = readFileSync(new URL("./fixtures/escaneado-fotossintese.pdf", import.meta.url));
  // Bytes depois do %%EOF não mudam o PDF: só engordam o arquivo.
  const padded = (megabytes: number) =>
    Buffer.concat([base, Buffer.alloc(megabytes * 1024 * 1024 - base.length, "%padding\n")]);
  await openFolder(page, "light");
  const file = page.locator('input[type="file"]');
  await file.setInputFiles({ name: "grande.pdf", mimeType: "application/pdf", buffer: padded(6) });
  await expect(page.getByRole("alert")).toContainText("PDF de até 5 MB");
  await expect(page.getByText("grande.pdf", { exact: true })).toHaveCount(0);
  await file.setInputFiles({ name: "medio.pdf", mimeType: "application/pdf", buffer: padded(2) });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("medio.pdf", { exact: true })).toBeVisible();
});
