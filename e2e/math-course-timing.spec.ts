import { expect, test } from "@playwright/test";
import type { MathChallenge } from "../src/domain/adaptive-math";

for (const course of [
  { title: "Oficina das Equações", index: 1, seconds: 16 },
  { title: "Mirante dos Vetores", index: 5, seconds: 24 },
]) {
  test(`${course.title} starts with its longer question clock and accepts answers`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    });
    await page.goto("/aprender");
    await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
    for (let index = 0; index < course.index; index++) {
      await page.getByRole("button", { name: "Próximo lugar" }).click();
    }
    await page.getByRole("button", { name: "Entrar em " + course.title }).click();
    const generated = page.waitForResponse(
      (response) =>
        response.url().includes("action=math") &&
        response.request().postDataJSON().action === "question",
    );
    await page.getByRole("button", { name: "Vamos calcular!" }).click();
    const question: MathChallenge = (await (await generated).json()).question;
    expect(question.budget).toBe(course.seconds);
    await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
    await expect(page.locator(".math-time .math-number")).toHaveAttribute(
      "aria-label",
      String(course.seconds),
    );
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "60");
    const confirmed = page.waitForResponse(
      (response) =>
        response.url().includes("action=math") &&
        response.request().postDataJSON().action === "answer",
    );
    await page.getByRole("button", { name: "Resposta " + question.answer, exact: true }).click();
    const response = await confirmed;
    expect(response.status()).toBe(200);
    expect((await response.json()).correct).toBe(true);
    await expect(page.locator(".math-answer-reaction")).toBeVisible();
  });
}
