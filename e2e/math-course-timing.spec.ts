import { expect, test } from "@playwright/test";
import { shownMathQuestion } from "./math-question";

for (const course of [
  { id: "school" as const, title: "Oficina das Equações", index: 1, seconds: 16 },
  { id: "calculus3" as const, title: "Mirante dos Vetores", index: 5, seconds: 24 },
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
    await page.getByRole("button", { name: "Vamos calcular!" }).click();
    await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
    const question = await shownMathQuestion(page, course.id);
    expect(question.budget).toBe(course.seconds);
    await expect(page.locator(".math-time .math-number")).toHaveAttribute(
      "aria-label",
      String(course.seconds),
    );
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "60");
    await page.getByRole("button", { name: "Resposta " + question.answer, exact: true }).click();
    await expect(page.locator(".math-answer-reaction")).toBeVisible();
  });
}
