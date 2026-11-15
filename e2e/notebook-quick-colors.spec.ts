import { expect, test } from "@playwright/test";
import { activateHandwritingPen, openHandwritingA4 } from "./notebook-helpers";

// Barra de cores rápidas: cores fixas, seletor livre e conta-gotas que lê a cor da folha.
test("barra de cores rápidas com conta-gotas que lê a folha e lembra a cor", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  await activateHandwritingPen(page);
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
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
  await page.mouse.click(shell.x + shell.width * 0.5, shell.y + shell.height * 0.5);
  await expect(dropper).toHaveAttribute("aria-pressed", "false");
  // Papel claro: #fffdf7. Fica como cor recente (não é uma das fixas) e já vem selecionada.
  const paper = bar.getByRole("button", { name: "Tinta #fffdf7", exact: true });
  await expect(paper).toBeVisible();
  await expect(paper).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("olena.handwriting.recent-colors")))
    .toBe(JSON.stringify(["#fffdf7"]));

  // Tema escuro: a barra troca o papel claro por tons escuros, com contorno claro nas cores.
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await expect(bar).toHaveCSS("background-color", "rgb(41, 36, 50)");
  await expect(pink).toHaveCSS("border-top-color", "rgb(255, 249, 239)");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));

  if (process.env.QC_SHOT) await bar.screenshot({ path: process.env.QC_SHOT });

  // Esc cancela o conta-gotas sem mudar a cor.
  await dropper.click();
  await expect(dropper).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(dropper).toHaveAttribute("aria-pressed", "false");
  await expect(paper).toHaveAttribute("aria-pressed", "true");
});
