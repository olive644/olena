import { expect, test } from "@playwright/test";
import type { MathChallenge } from "../src/domain/adaptive-math";

test("place points animate down to zero and up again without changing stored rewards", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem(
      "helena.mathPlaceRewards.v1",
      JSON.stringify({ foundations: { points: 530, receipts: [], chests: [] } }),
    );
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  const number = page.locator(".math-place-total .math-number");
  await expect(number).toHaveAttribute("aria-label", "530");
  await page.getByRole("button", { name: "Próximo lugar" }).click();
  await page.waitForTimeout(120);
  const falling = Number(await number.getAttribute("aria-label"));
  expect(falling).toBeGreaterThan(0);
  expect(falling).toBeLessThan(530);
  await expect(number).toHaveAttribute("aria-label", "0");
  await page.getByRole("button", { name: "Lugar anterior" }).click();
  await page.waitForTimeout(120);
  const rising = Number(await number.getAttribute("aria-label"));
  expect(rising).toBeGreaterThan(0);
  expect(rising).toBeLessThan(530);
  await expect(number).toHaveAttribute("aria-label", "530");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helena.mathPlaceRewards.v1")!).foundations.points,
    ),
  ).toBe(530);
});

test("API latency does not erase correct or wrong feedback, or score twice", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  let answers = 0;
  await page.route("**/api/olena?action=math&version=1", async (route) => {
    if (route.request().postDataJSON().action !== "answer") return route.continue();
    answers++;
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({ response });
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await page.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }).click();
  const initial = page.waitForResponse(
    (response) =>
      response.url().includes("action=math") &&
      response.request().postDataJSON().action === "question",
  );
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  let question: MathChallenge = (await (await initial).json()).question;
  await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
  for (const correct of [true, false]) {
    const choice = correct
      ? question.answer
      : question.choices.find((value) => value !== question.answer)!;
    const button = page.getByRole("button", { name: "Resposta " + choice, exact: true });
    const response = page.waitForResponse(
      (item) =>
        item.url().includes("action=math") && item.request().postDataJSON().action === "answer",
    );
    await button.click();
    await button.dispatchEvent("click");
    expect(await page.locator(".math-answer-reaction").count()).toBe(0);
    await expect(page.locator(".math-api-loading")).toHaveCount(0);
    const confirmed = await response;
    expect(confirmed.status()).toBe(200);
    const result = await confirmed.json();
    expect(result.correct).toBe(correct);
    const reaction = page.locator(".math-answer-reaction");
    await expect(reaction).toBeVisible();
    await expect(button).toHaveAttribute("data-feedback", correct ? "correct" : "wrong");
    await page.waitForTimeout(350);
    await expect(reaction).toBeVisible();
    await expect(reaction).toHaveCSS("opacity", "1");
    await expect(reaction).toHaveCount(0);
    question = result.question;
  }
  expect(answers).toBe(2);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helena.mathLearning.v1")!).foundations.correct,
    ),
  ).toBe(1);
  await expect(page.locator(".math-arcade-stage")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByLabel("2 chances restantes")).toBeVisible();
});
