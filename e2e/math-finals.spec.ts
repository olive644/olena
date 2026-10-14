import { expect, test, type Page } from "@playwright/test";
import { MATH_COURSES } from "../src/data/math-courses";
import { shownMathQuestion } from "./math-question";

async function enter(page: Page, position: number, title: string) {
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  for (let i = 0; i < position; i++)
    await page.getByRole("button", { name: "Próximo lugar" }).click();
  await page.getByRole("button", { name: `Entrar em ${title}` }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
}

for (const [position, course] of MATH_COURSES.entries())
  test(`${course.id} final fits both themes, works offline and resumes after reload`, async ({
    page,
    context,
  }, info) => {
    const level = course.id === "calculus1" ? 2 : 5;
    await page.addInitScript(
      ({ ids, position, level }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        if (sessionStorage.getItem("final-seeded")) return;
        const complete = {
          level: 5,
          mastery: 5,
          mastered: 63,
          correct: 120,
          best: 0,
          solved: Array(6).fill(1048575),
          seen: Array(6).fill(1048575),
        };
        localStorage.setItem(
          "helena.mathGame.v3",
          JSON.stringify(Object.fromEntries(ids.slice(0, position).map((id) => [id, complete]))),
        );
        const masks = Array.from({ length: 6 }, (_, i) => (i <= level ? 1048575 : 0));
        localStorage.setItem(
          "helena.mathGame.v5",
          JSON.stringify({
            [ids[position]!]: {
              level: Math.min(5, level + 1),
              mastery: level === 5 ? 5 : 0,
              mastered: (1 << (level + 1)) - 1,
              confirmed: (1 << level) - 1,
              correct: 100,
              best: 0,
              solved: masks,
              seen: masks,
              extraSolved: Array(6).fill(0),
              extraSeen: Array(6).fill(0),
              attempts: 0,
              recent: [],
              retry: [],
              recovery: [],
              cooldown: 0,
              finalSeen: Array(6).fill(0),
              final: {
                level,
                slots: level === 2 ? [5, 6, 12, 18, 0] : [0, 6, 12, 18, 1],
                answered: 0,
                correct: 0,
              },
            },
          }),
        );
        sessionStorage.setItem("final-seeded", "1");
      },
      { ids: MATH_COURSES.map((c) => c.id), position, level },
    );
    await page.goto("/aprender");
    await enter(page, position, course.title);
    await expect(page.getByRole("status", { name: /Desafio final, questão 1 de 5/ })).toBeVisible();
    const q = await shownMathQuestion(page, course.id);
    expect(q.seed).toBeGreaterThan(288);
    if (course.id === "calculus1") {
      await expect(page.getByRole("heading")).toContainText("x¹⁵");
      await expect(page.getByRole("heading")).toHaveAttribute(
        "aria-label",
        "f(x)=x¹⁵. derivada de f, calculada em x=2: ?",
      );
    }
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      for (const answer of await page.getByRole("button", { name: /^Resposta/ }).all()) {
        await expect(answer).toBeInViewport({ ratio: 0.999 });
        const outer = await answer.boundingBox(),
          inner = await answer.locator(".math-number").boundingBox();
        expect(inner!.width).toBeLessThanOrEqual(outer!.width);
        for (const digit of await answer.locator(".math-number svg").all()) {
          const bounds = await digit.boundingBox();
          expect(bounds!.x).toBeGreaterThanOrEqual(outer!.x + 8);
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(outer!.x + outer!.width - 8);
        }
      }
      await page.screenshot({ path: info.outputPath(`${course.id}-final-${theme}.png`) });
    }
    await context.setOffline(true);
    await page.keyboard.press(String(q.choices.indexOf(q.answer) + 1));
    await expect(page.locator('.math-answer-button[data-feedback="correct"]')).toHaveCount(1);
    await expect(page.getByRole("status", { name: /Desafio final, questão 2 de 5/ })).toBeVisible();
    expect(
      await page.evaluate(
        (id) => JSON.parse(localStorage.getItem("helena.mathGame.v5")!)[id].final.answered,
        course.id,
      ),
    ).toBe(1);
    await context.setOffline(false);
    await page.reload();
    await enter(page, position, course.title);
    await expect(page.getByRole("status", { name: /Desafio final, questão 2 de 5/ })).toBeVisible();
    for (let i = 1; i < 5; i++) {
      await expect(
        page.getByRole("status", { name: new RegExp(`Desafio final, questão ${i + 1} de 5`) }),
      ).toBeVisible();
      const question = await shownMathQuestion(page, course.id);
      await page.getByRole("button", { name: `Resposta ${question.answer}`, exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: "Parabéns, você se superou!" })).toBeVisible();
    expect(
      await page.evaluate(
        (id) => JSON.parse(localStorage.getItem("helena.mathGame.v5")!)[id].confirmed,
        course.id,
      ),
    ).toBe((1 << (level + 1)) - 1);
  });

test("a regrouping error offers a different short challenge as a revanche", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem(
      "helena.mathGame.v4",
      JSON.stringify({
        foundations: {
          level: 1,
          mastery: 0,
          mastered: 1,
          correct: 20,
          best: 0,
          solved: [1048575, 0, 0, 0, 0, 0],
          seen: [1048575, 16777215 ^ (1 << 4), 0, 0, 0, 0],
          extraSolved: Array(6).fill(0),
          extraSeen: [0, 16777215, 0, 0, 0, 0],
          attempts: 0,
          recent: [],
          retry: [],
        },
      }),
    );
  });
  await page.goto("/aprender");
  await enter(page, 0, MATH_COURSES[0]!.title);
  await expect(page.getByRole("heading", { name: "33 − 9" })).toBeVisible();
  await page.getByRole("button", { name: "Resposta 34", exact: true }).click();
  await expect(page.locator(".math-answer-reaction")).toHaveCount(0);
  for (let i = 0; i < 12; i++) {
    if (await page.getByText("Revanche", { exact: true }).isVisible()) break;
    const q = await shownMathQuestion(page, "foundations");
    await page.getByRole("button", { name: `Resposta ${q.answer}`, exact: true }).click();
    await expect(page.locator(".math-arcade-stage")).not.toHaveAttribute(
      "data-question-seed",
      String(q.seed),
    );
  }
  await expect(page.getByText("Revanche", { exact: true })).toBeVisible();
  const recovery = await shownMathQuestion(page, "foundations");
  expect(recovery.expression).not.toBe("33 − 9");
  await page.getByRole("button", { name: `Resposta ${recovery.answer}`, exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("helena.mathGame.v5")!).foundations.recovery.some(
        (r: { kind: string; resolved: boolean }) => r.kind === "regrouping" && r.resolved,
      ),
    ),
  ).toBe(true);
});
