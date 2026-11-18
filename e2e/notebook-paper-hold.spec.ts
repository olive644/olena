import { openHandwritingA4, openNotebooksView } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

// Segurar um tipo ou cor de folha troca o caderno inteiro, com barra de carga, brilho e aviso.
for (const theme of ["light", "dark"] as const) {
  test(`segurar tipo e cor de folha troca o caderno inteiro: ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() =>
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
    );
    await page.goto("/");
    await page.evaluate((value) => {
      document.documentElement.dataset["theme"] = value;
    }, theme);
    await openNotebooksView(page);
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    await page.locator(".notebook-spine").first().click();
    await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    await openHandwritingA4(page);
    const dialog = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
    // Escreve algo na primeira folha, fecha para salvá-la e abre uma segunda: há o que trocar
    // além da folha aberta.
    const sheet = dialog.locator(".handwriting-committed-ink");
    await sheet.scrollIntoViewIfNeeded();
    const ink = (await sheet.boundingBox())!;
    await page.mouse.move(ink.x + ink.width * 0.4, ink.y + 90);
    await page.mouse.down();
    await page.mouse.move(ink.x + ink.width * 0.5, ink.y + 130, { steps: 8 });
    await page.mouse.up();
    await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
    const keep = dialog.getByRole("button", { name: "Fechar e manter rascunho" });
    if (await keep.isVisible()) await keep.click();
    await page.getByRole("button", { name: "Criar nova folha", exact: true }).click();
    await expect(dialog).toBeVisible();

    const papers = () =>
      page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem("helenastudy.workspace.v1") ?? "{}");
        return (state.notes ?? []).flatMap(
          (note: { assets?: { handwriting?: { paper: string; paperColor?: string } }[] }) =>
            (note.assets ?? []).flatMap((asset) =>
              asset.handwriting
                ? [`${asset.handwriting.paper}/${asset.handwriting.paperColor ?? "light"}`]
                : [],
            ),
        );
      });

    // A folha escrita ficou guardada: o teste não passa por lista vazia.
    expect((await papers()).length).toBeGreaterThan(0);
    const picker = dialog.getByRole("button", { name: "Tipo de papel", exact: true });
    if ((await picker.getAttribute("aria-expanded")) !== "true") await picker.click();
    const grid = dialog.getByRole("button", { name: "Quadriculado", exact: true });
    await expect(grid).toHaveAttribute("title", /Segure para trocar o caderno inteiro/);

    // Toque comum: só a folha aberta.
    await grid.click();
    await picker.click();
    await expect(grid).toHaveAttribute("aria-pressed", "true");

    // Segurar: a barra enche e o caderno inteiro troca.
    const ruled = dialog.getByRole("button", { name: "Pautado", exact: true });
    const box = (await ruled.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(ruled).toHaveClass(/is-holding/);
    await page.screenshot({ path: testInfo.outputPath(`segurando-${theme}.png`) });
    await expect(ruled).toHaveClass(/is-applied/, { timeout: 3000 });
    await page.screenshot({ path: testInfo.outputPath(`aplicado-${theme}.png`) });
    await page.mouse.up();
    await expect(dialog.locator(".handwriting-paper-notice")).toContainText("Folhas trocadas");
    await expect(ruled).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(async () => (await papers()).every((item) => item.startsWith("ruled")))
      .toBe(true);

    // Cor: segurar "Escura" troca a cor de todas as folhas.
    await dialog.getByRole("button", { name: "Cor da folha", exact: true }).click();
    const dark = dialog.getByRole("button", { name: "Escura", exact: true });
    const darkBox = (await dark.boundingBox())!;
    await page.mouse.move(darkBox.x + darkBox.width / 2, darkBox.y + darkBox.height / 2);
    await page.mouse.down();
    await expect(dark).toHaveClass(/is-applied/, { timeout: 3000 });
    await page.mouse.up();
    await expect
      .poll(async () => (await papers()).every((item) => item.endsWith("/night")))
      .toBe(true);

    // Soltar cedo é um toque: não troca o resto.
    const light = dialog.getByRole("button", { name: "Clara", exact: true });
    await light.click();
    await dialog.getByRole("button", { name: "Cor da folha", exact: true }).click();
    await expect(light).toHaveAttribute("aria-pressed", "true");
    expect((await papers()).some((item) => item.endsWith("/night"))).toBe(true);

    // Sem segurar: o botão Caderno inteiro faz o mesmo (teclado e toque).
    await dialog.getByRole("button", { name: "Aplicar ao caderno inteiro" }).click();
    await expect
      .poll(async () => (await papers()).every((item) => item.endsWith("/light")))
      .toBe(true);
  });
}
