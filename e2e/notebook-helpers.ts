import { expect, type Page } from "@playwright/test";

export async function activateHandwritingPen(page: Page) {
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  const pen = editor.getByRole("button", { name: "Caneta", exact: true });
  if ((await pen.getAttribute("aria-pressed")) !== "true") await pen.click();
  const options = editor.getByRole("button", { name: "Opções", exact: true });
  if ((await options.isVisible()) && (await options.getAttribute("aria-expanded")) !== "true")
    await options.click();
  // O sinal de painel aberto é a tinta DENTRO do painel de opções: a barra de cores rápidas
  // também tem "Tinta Roxo" e fica sempre visível com a caneta.
  const panelInk = editor
    .locator(".handwriting-ink-options")
    .getByRole("button", { name: "Tinta Roxo", exact: true });
  if (!(await panelInk.isVisible())) {
    await pen.click();
    if (!(await panelInk.isVisible())) await pen.click();
  }
}

// Escolhe a ferramenta e abre as opções dela: clicar de novo na ferramenta ativa mostra ou esconde
// o painel de opções. `probe` é um botão que só existe com o painel aberto.
export async function openHandwritingToolOptions(page: Page, tool: string, probe: string) {
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  const button = editor.getByRole("button", { name: tool, exact: true });
  if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
  if (!(await editor.getByRole("button", { name: probe }).isVisible())) await button.click();
  await expect(editor.getByRole("button", { name: probe })).toBeVisible();
}

// Os testes de ferramentas conservam a geometria A4. O quadro padrão tem uma
// suíte própria que cobre dimensões, troca de páginas e persistência.
export async function openHandwritingA4(page: Page, reopen = false) {
  const dialog = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  if (reopen) await page.getByRole("button", { name: /^Abrir preview de / }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Tipo de papel", exact: true }).click();
  await dialog.getByRole("button", { name: "Pautado", exact: true }).click();
  await dialog.getByRole("button", { name: "Tipo de papel", exact: true }).click();
}

// Cor composta de um ponto da folha, dado em unidades da folha (3200 por 2400). A folha é feita de
// camadas (base com papel e imagens, cenas, tinta confirmada); o que a pessoa vê é a soma delas.
export async function compositeColorAt(page: Page, px: number, py: number) {
  return page.evaluate(
    (point) => {
      // A camada-base (papel, pauta e imagens importadas) vem primeiro; as outras vão por cima.
      const layers = [
        ...document.querySelectorAll<HTMLCanvasElement>(".handwriting-page-shell canvas"),
      ];
      const first = layers[0]!;
      const x = Math.round((point.px * first.width) / 3200);
      const y = Math.round((point.py * first.height) / 2400);
      const target = document.createElement("canvas");
      target.width = 1;
      target.height = 1;
      const context = target.getContext("2d")!;
      for (const layer of layers) context.drawImage(layer, x, y, 1, 1, 0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    },
    { px, py },
  );
}

// A tela de cadernos continua em /cadernos, mas o item "Cadernos" saiu do menu lateral (os cadernos
// agora ficam na Biblioteca). Navega pela rota como o app faz, sem recarregar a página.
export async function openNotebooksView(page: Page) {
  await page.evaluate(() => {
    window.history.pushState(null, "", "/cadernos");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}
