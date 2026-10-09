import { test, expect } from "@playwright/test";

test("somente Matemática abre jogo, preservando as outras ilhas bloqueadas", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.soloProgress", "4");
  });
  await page.goto("/aprender");
  await expect(page.getByRole("heading", { name: "Picos dos Padrões" })).toBeVisible();
  for (let index = 0; index < 4; index++)
    await page.getByRole("button", { name: "Mundo anterior" }).click();
  await expect(page.getByRole("heading", { name: "Porto das Vozes" })).toBeVisible();
  for (let index = 0; index < 6; index++) {
    if (index === 4)
      await expect(page.getByRole("button", { name: "Entrar no laboratório" })).toBeEnabled();
    else await expect(page.getByRole("button", { name: "Ilha bloqueada" })).toBeDisabled();
    if (index < 5) await page.getByRole("button", { name: "Próximo mundo" }).click();
  }
  await page.getByRole("button", { name: "Mundo anterior" }).click();
  await page.getByRole("button", { name: "Entrar no laboratório" }).click();
  await expect(page.getByRole("region", { name: "Laboratório das contas" })).toBeVisible();
  await expect(page.locator(".practice-trail-map")).toHaveCount(0);
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
  const equation = await page.locator(".math-arcade-equation h1").innerText();
  const numbers = equation.match(/\d+/g)!.map(Number);
  await page
    .getByRole("button", { name: "Resposta " + (numbers[0]! + numbers[1]!), exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("BOA! +10");
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("math-arcade.png") });
  const geometry = await page.locator(".math-arcade-answers").boundingBox();
  const viewport = page.viewportSize()!;
  expect(geometry!.x).toBeGreaterThanOrEqual(0);
  expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(viewport.width);
  await expect(page.getByRole("button", { name: "Voltar às ilhas" })).toBeInViewport();
  for (let count = 0; count < 3; count++) {
    const expression = await page.locator(".math-arcade-equation h1").innerText();
    const operands = expression.match(/\d+/g)!.map(Number);
    const value = operands[0]! + operands[1]!;
    const options = page.getByRole("button", { name: /^Resposta/ });
    const labels = await options.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")),
    );
    const index = labels.findIndex((label) => Number(label!.split(" ")[1]) !== value);
    await options.nth(index).click();
    if (count < 2) await expect(page.getByRole("status")).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByLabel("3 chances restantes")).toBeVisible();
  await page.getByRole("button", { name: "Voltar às ilhas" }).click();
  await expect(page.getByRole("heading", { name: "Picos dos Padrões" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("helena.soloProgress"))).toBe("4");
});
