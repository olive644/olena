import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
});

test("o botão do preview cresce com o rótulo dentro e a navegação retorna à vitrine", async ({
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
  const button = preview.getByRole("button", { name: "Personalizar", exact: true });
  await expect(button).toBeEnabled();
  const heading = await preview.locator(".notebook-preview-heading h1").boundingBox();
  const back = await preview
    .getByRole("button", { name: "Meus Cadernos", exact: true })
    .boundingBox();
  expect(back!.x + back!.width).toBeLessThanOrEqual(heading!.x);
  await page.mouse.move(0, 0);
  const compact = await button.evaluate((element) => element.getBoundingClientRect().width);
  await page.keyboard.press("Tab");
  await button.focus();
  await expect
    .poll(() => button.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThan(compact + 35);
  const positions = await button.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const label = element.querySelector(".notebook-cover-label")!.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      labelLeft: label.left,
      labelRight: label.right,
    };
  });
  expect(positions.labelLeft).toBeGreaterThan(positions.left);
  expect(positions.labelRight).toBeLessThanOrEqual(positions.right);
  await page.screenshot({ path: info.outputPath("preview-expandido.png") });
  await button.click();
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
