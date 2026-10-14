import { expect, test } from "@playwright/test";
import { shownMathQuestion } from "./math-question";

for (const course of [
  { id: "school" as const, title: "Oficina das Equações", index: 1, seconds: 28 },
  { id: "calculus3" as const, title: "Mirante dos Vetores", index: 5, seconds: 28 },
]) {
  test(`${course.title} starts with its longer question clock and accepts answers`, async ({
    page,
  }) => {
    await page.addInitScript((unlockedIndex) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      const ids = ["foundations", "school", "advanced", "calculus1", "calculus2", "calculus3"];
      localStorage.setItem(
        "helena.mathGame.v3",
        JSON.stringify(
          Object.fromEntries(
            ids.slice(0, unlockedIndex).map((id) => [
              id,
              {
                level: 5,
                mastery: 5,
                mastered: 63,
                correct: 120,
                best: 900,
                solved: Array(6).fill(1048575),
                seen: Array(6).fill(1048575),
              },
            ]),
          ),
        ),
      );
    }, course.index);
    await page.goto("/aprender");
    await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
    for (let index = 0; index < course.index; index++) {
      await page.getByRole("button", { name: "Próximo lugar" }).click();
    }
    await page.getByRole("button", { name: "Entrar em " + course.title }).click();
    await page.getByRole("button", { name: "Vamos calcular!" }).click();
    await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
    const question = await shownMathQuestion(page, course.id);
    expect(question.budget).toBeGreaterThanOrEqual(course.seconds);
    await expect(page.locator(".math-time .math-number")).toHaveAttribute(
      "aria-label",
      String(question.budget),
    );
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "60");
    await page.getByRole("button", { name: "Resposta " + question.answer, exact: true }).click();
    await expect(page.locator(".math-answer-reaction")).toBeVisible();
  });
}
