import { test, expect } from "@playwright/test";
test("mathematics islands use the real adaptive API and resume mastery", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.soloProgress", "4");
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar no laboratório" }).click();
  await expect(page.getByRole("region", { name: "Ilhas de Matemática" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vila das Primeiras Contas" })).toBeVisible();
  await page.getByRole("button", { name: "Próxima ilha de Matemática" }).click();
  await expect(page.getByRole("heading", { name: "Cidade das Equações" })).toBeVisible();
  await page.getByRole("button", { name: "Ilha anterior de Matemática" }).click();
  await page.screenshot({ path: testInfo.outputPath("math-islands.png") });
  await page.getByRole("button", { name: "Explorar ilha" }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
  for (let index = 0; index < 4; index++) {
    const question = page.locator(".math-game-question h1");
    const text = await question.getAttribute("aria-label");
    const nums = text!.match(/\d+/g)!.map(Number);
    const answer = text!.includes("−") ? nums[0]! - nums[1]! : nums[0]! + nums[1]!;
    await page.getByRole("button", { name: "Resposta " + answer, exact: true }).click();
    await expect(page.locator(".math-answer-reaction")).toBeVisible();
    await expect(page.locator(".math-answer-reaction")).toHaveCount(0);
  }
  await expect(page.getByText("Multiplicação", { exact: true })).toBeVisible();
  await expect(page.getByText(/VOCÊ ESTÁ INSANO/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("math-playing.png") });
  const geometry = await page.locator(".math-answers").boundingBox();
  await expect(page.locator(".math-game-stats")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: /^Resposta/ }).last()).toBeInViewport({ ratio: 1 });
  expect(geometry!.x).toBeGreaterThanOrEqual(0);
  expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  for (let index = 0; index < 3; index++) {
    const text = await page.locator(".math-game-question h1").getAttribute("aria-label");
    const nums = text!.match(/\d+/g)!.map(Number);
    const value = nums[0]! * nums[1]!;
    const buttons = page.getByRole("button", { name: /^Resposta/ });
    const labels = await buttons.evaluateAll((items) =>
      items.map((item) => item.getAttribute("aria-label")),
    );
    await buttons.nth(labels.findIndex((label) => Number(label!.split(" ")[1]) !== value)).click();
    await expect(page.locator(".math-answer-reaction")).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("math-result.png") });
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByText("Multiplicação", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Voltar às ilhas" }).click();
  await expect(page.getByRole("region", { name: "Ilhas de Matemática" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar às ilhas" }).click();
  await expect(page.getByRole("heading", { name: "Picos dos Padrões" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("helena.soloProgress"))).toBe("4");
});
