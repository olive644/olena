import { expect, test } from "@playwright/test";
import { activateHandwritingPen, compositeColorAt, openHandwritingA4 } from "./notebook-helpers";

// Barra de cores rápidas: cores fixas, seletor livre e conta-gotas que lê a cor da folha.
test("barra de cores rápidas com conta-gotas que lê a folha e lembra a cor", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    // Exercita a leitura da própria folha, sem abrir o seletor nativo do sistema.
    Object.defineProperty(window, "EyeDropper", { configurable: true, value: undefined });
  });
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await activateHandwritingPen(page);
  // No celular o seletor de papel abre aberto; fecha para ver a área de escrita.
  const picker = editor.getByRole("button", { name: "Tipo de papel", exact: true });
  if ((await picker.getAttribute("aria-expanded")) === "true") await picker.click();
  const bar = editor.getByRole("group", { name: "Cores rápidas", exact: true });
  await expect(bar).toBeVisible();

  // Cores fixas: escolher uma liga só ela.
  const pink = bar.getByRole("button", { name: "Tinta Rosa", exact: true });
  await pink.click();
  await expect(pink).toHaveAttribute("aria-pressed", "true");
  await expect(bar.getByRole("button", { name: "Tinta Grafite", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // A barra fica dentro da tela e não aumenta a folha.
  const box = (await bar.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

  // Conta-gotas: o próximo toque na folha lê a cor do papel e não desenha nada.
  const dropper = bar.getByRole("button", { name: "Conta-gotas", exact: true });
  await dropper.click();
  await expect(dropper).toHaveAttribute("aria-pressed", "true");
  const shell = (await editor.locator(".handwriting-page-shell").boundingBox())!;
  // Um ponto da folha que esteja na área visível (no celular a folha é mais alta que a tela).
  const view = (await editor.locator(".handwriting-viewport").boundingBox())!;
  const clickX = Math.max(shell.x + 20, view.x + view.width * 0.5);
  // Se as opções estiverem abertas, o painel pode cobrir a folha no celular:
  // se o toque cair nele, sobe para a parte da folha que continua à mostra.
  const panelLocator = editor.locator(".handwriting-brush-panel, .handwriting-ink-options");
  // A paleta agora fica à vista sem abrir as opções: o painel pode nem existir.
  const panel = (await panelLocator.count()) ? await panelLocator.first().boundingBox() : null;
  let clickY = Math.max(shell.y + 20, view.y + view.height * 0.4);
  if (
    panel &&
    clickX >= panel.x &&
    clickX <= panel.x + panel.width &&
    clickY >= panel.y &&
    clickY <= panel.y + panel.height
  ) {
    clickY = Math.max(shell.y + 20, panel.y - 40);
  }
  await page.mouse.click(clickX, clickY);
  await expect(dropper).toHaveAttribute("aria-pressed", "false");
  // A cor lida tem de ser a que a folha mostra naquele ponto (papel + pauta somados).
  const [red = 0, green = 0, blue = 0] = await compositeColorAt(
    page,
    ((clickX - shell.x) / shell.width) * 3200,
    ((clickY - shell.y) / shell.height) * 2400,
  );
  const expected = `#${[red, green, blue].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
  // Fica como cor recente (se não for uma das fixas) e já vem selecionada.
  const picked = bar.getByRole("button", { name: `Tinta ${expected}`, exact: true });
  await expect(picked).toBeVisible();
  await expect(picked).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("olena.handwriting.recent-colors")))
    .toBe(JSON.stringify([expected]));

  // Esc cancela o conta-gotas sem mudar a cor.
  await dropper.click();
  await expect(dropper).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(dropper).toHaveAttribute("aria-pressed", "false");
  await expect(picked).toHaveAttribute("aria-pressed", "true");

  // Tema escuro: a barra troca o papel claro por tons escuros, com contorno claro nas cores.
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await expect(bar).toHaveCSS("background-color", "rgb(41, 36, 50)");
  await expect(pink).toHaveCSS("border-top-color", "rgb(109, 95, 120)");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));

  if (process.env.QC_SHOT) await page.screenshot({ path: process.env.QC_SHOT });
});
