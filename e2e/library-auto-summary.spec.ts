import { expect, test } from "@playwright/test";

// O resumo automático roda no aparelho: sem login, sem rede de IA. A prova abaixo cria uma pasta,
// envia um texto, gera o resumo e confere o resultado e o layout em claro e escuro.
const text = [
  "# O ENIAC",
  "O ENIAC foi concluído em 1945 na Universidade da Pensilvânia, nos Estados Unidos. Ele foi um dos primeiros computadores eletrônicos de uso geral e foi construído para calcular tabelas de tiro da artilharia. Usava cerca de 18 mil válvulas e pesava aproximadamente 30 toneladas.",
  "## Programação",
  "A programação era feita por cabos e chaves, que precisavam ser reconectados a cada nova tarefa. Isso levava dias de trabalho de uma equipe, formada em grande parte por mulheres matemáticas. A ideia do programa armazenado foi descrita em 1945 por John von Neumann.",
  "## Legado",
  "Os computadores seguintes passaram a usar essa arquitetura, que continua sendo a base das máquinas atuais. O transistor, inventado em 1947, substituiu as válvulas porque era menor, mais barato e consumia muito menos energia.",
].join("\n\n");

for (const theme of ["light", "dark"]) {
  test(`gera o resumo automático de um texto: ${theme}`, async ({ page }, info) => {
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", appearance);
    }, theme);
    const aiCalls: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/helena/.test(request.url())) aiCalls.push(request.url());
    });
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
    await create.getByLabel("Nome da pasta", { exact: true }).fill("computação");
    await create.getByRole("button", { name: "Criar pasta", exact: true }).click();
    await page.waitForTimeout(800);
    await dismiss();
    await page
      .getByRole("button", { name: /computação/ })
      .first()
      .click();

    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "ENIAC.txt", mimeType: "text/plain", buffer: Buffer.from(text) });
    await page.getByRole("button", { name: "Resumo", exact: true }).click();
    await page.getByRole("button", { name: "Criar resumo", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("checkbox", { name: "Selecionar ENIAC.txt" }).click();
    await page.screenshot({ path: info.outputPath(`dialogo-resumo-${theme}.png`) });
    await dialog.getByRole("button", { name: "Resumo automático", exact: true }).click();

    const card = page.locator(".library-summary-card").filter({ hasText: "O ENIAC" }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
    await expect(page.getByText(/feito no seu aparelho, sem IA/).first()).toBeVisible();
    await expect(page.getByText(/1945/).first()).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: info.outputPath(`resumo-${theme}.png`) });

    expect(aiCalls).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
  });
}
