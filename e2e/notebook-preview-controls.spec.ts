import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
});

test("a barra de baixo tem só ícones, a seta de voltar fica à esquerda e a navegação retorna à vitrine", async ({
  page,
}, info) => {
  await page.goto("/cadernos");
  if (info.project.name === "mobile") await expect(page.locator(".mobile-nav")).toBeVisible();
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  const preview = page.getByRole("region", { name: "Preview do caderno" });
  if (info.project.name === "mobile") {
    for (const height of [640, 844]) {
      await page.setViewportSize({ width: 390, height });
      const book = await preview.locator(".notebook-paper-spread").boundingBox();
      expect(book!.width / book!.height).toBeCloseTo(1.4, 1);
    }
  }
  if (info.project.name === "mobile") await expect(page.locator(".mobile-nav")).toBeHidden();
  const button = preview.getByRole("button", { name: "Índice de folhas", exact: true });
  await expect(button).toBeEnabled();
  // A seta amarela de voltar fica à esquerda e o nome do caderno só existe para leitores de tela.
  const back = await preview
    .getByRole("button", { name: "Meus Cadernos", exact: true })
    .boundingBox();
  const area = await preview.boundingBox();
  expect(back!.x).toBeLessThan(area!.x + area!.width * 0.25);
  await expect(preview.locator(".notebook-preview-heading h1")).toHaveClass(/visually-hidden/);
  // Ferramentas só com ícone, na barra de baixo; o nome fica no aria-label.
  await expect(button.locator("span:not(.paper-tab-icon)")).toBeHidden();
  const dock = await preview.locator(".notebook-2d-dock").boundingBox();
  const book = await preview.locator(".notebook-paper-spread").boundingBox();
  expect(dock!.y).toBeGreaterThan(book!.y + book!.height);
  await page.screenshot({ path: info.outputPath("preview-barra-de-baixo.png") });
  await preview.getByRole("button", { name: "‹ Capa", exact: true }).click();
  await expect(preview.getByRole("button", { name: "Criar nova folha" })).toHaveCount(0);
  const leaves = preview.getByRole("button", { name: "Ver folhas", exact: true });
  await expect(leaves.locator("svg")).toBeVisible();
  await expect(leaves).toBeEnabled();
  await leaves.click();
  await preview.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  if (info.project.name === "mobile") await expect(page.locator(".mobile-nav")).toBeVisible();
});

test("play creme nos dois modos de foco", async ({ page }) => {
  await page.goto("/foco");
  const play = page.locator(".focus-paper-control-icon.is-play .focus-paper-control-icon__face");
  await expect(play).toHaveCSS("fill", "rgb(255, 249, 239)");
  await expect(page.locator(".paper-digits svg")).toHaveCount(6);
  await page.getByRole("button", { name: "Próximo modo", exact: true }).click();
  await expect(play).toHaveCSS("fill", "rgb(255, 249, 239)");
  await expect(page.locator(".paper-digits svg")).toHaveCount(4);
});
