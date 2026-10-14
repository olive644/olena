import { expect, test } from "@playwright/test";
import { MATH_COURSES } from "../src/data/math-courses";
import { shownMathQuestion } from "./math-question";

test("subtraction offers plausible counts on desktop and mobile in both themes", async ({
  page,
}, info) => {
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
          extraSolved: [0, 0, 0, 0, 0, 0],
          extraSeen: [0, 16777215, 0, 0, 0, 0],
          attempts: 0,
          recent: [],
          retry: [],
        },
      }),
    );
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByRole("heading", { name: "33 − 9" })).toBeVisible();
  for (const value of [23, 24, 25, 34])
    await expect(
      page.getByRole("button", { name: `Resposta ${value}`, exact: true }),
    ).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    for (const answer of await page.getByRole("button", { name: /^Resposta/ }).all())
      await expect(answer).toBeInViewport({ ratio: 0.999 });
    await page.screenshot({ path: info.outputPath(`plausible-${theme}.png`) });
  }
  await page.getByRole("button", { name: "Resposta 24", exact: true }).click();
  await expect(page.locator('.math-answer-button[data-feedback="correct"]')).toHaveCount(1);
});

for (const [position, course] of MATH_COURSES.entries())
  test(`new ${course.id} challenges remain readable and offline in both themes`, async ({
    page,
  }, info) => {
    await page.addInitScript(
      ({ index, ids }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        const complete = {
          level: 5,
          mastery: 5,
          mastered: 63,
          correct: 120,
          best: 2374,
          solved: Array(6).fill(1048575),
          seen: Array(6).fill(1048575),
        };
        const current = {
          level: 5,
          mastery: 0,
          mastered: 31,
          correct: 100,
          best: 2374,
          solved: [1048575, 1048575, 1048575, 1048575, 1048575, 0],
          seen: Array(6).fill(16777215),
          extraSolved: Array(6).fill(0),
          extraSeen: [0, 0, 0, 0, 0, 16777215 ^ (1 << 4)],
          attempts: 0,
          recent: [],
          retry: [],
        };
        localStorage.setItem(
          "helena.mathGame.v3",
          JSON.stringify(Object.fromEntries(ids.slice(0, index).map((id) => [id, complete]))),
        );
        localStorage.setItem("helena.mathGame.v4", JSON.stringify({ [ids[index]!]: current }));
      },
      { index: position, ids: MATH_COURSES.map((item) => item.id) },
    );
    await page.route("**/api/olena?action=math*", (route) => route.abort());
    await page.goto("/aprender");
    await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
    for (let index = 0; index < position; index++)
      await page.getByRole("button", { name: "Próximo lugar" }).click();
    await page.getByRole("button", { name: `Entrar em ${course.title}` }).click();
    await page.getByRole("button", { name: "Vamos calcular!" }).click();
    await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
    const q = await shownMathQuestion(page, course.id);
    expect(q.format).toBe(4);
    expect(q.difficulty).toBe(3);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme,
      );
      const heading = page.getByRole("heading"),
        box = await heading.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      for (const answer of await page.getByRole("button", { name: /^Resposta/ }).all())
        await expect(answer).toBeInViewport({ ratio: 0.999 });
      await page.screenshot({ path: info.outputPath(`${course.id}-${theme}.png`) });
    }
    await page.getByRole("button", { name: `Resposta ${q.answer}`, exact: true }).click();
    await expect(page.locator('.math-answer-button[data-feedback="correct"]')).toHaveCount(1);
    const stored = await page.evaluate(
      (id) => JSON.parse(localStorage.getItem("helena.mathGame.v5")!)[id],
      course.id,
    );
    expect(stored.extraSolved[5]).toBe(1 << 4);
  });

test("partial completion uses six cut-paper pieces, without missing-percentage text or score overlap", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem(
      "helena.mathGame.v3",
      JSON.stringify({
        foundations: {
          level: 1,
          mastery: 5,
          mastered: 1,
          correct: 28,
          best: 2374,
          solved: [1048575, 255, 0, 0, 0, 0],
          seen: [1048575, 255, 0, 0, 0, 0],
        },
      }),
    );
    localStorage.setItem(
      "helena.mathPlaceRewards.v1",
      JSON.stringify({ foundations: { points: 2374, receipts: [], chests: [] } }),
    );
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  const badge = page.getByRole("progressbar", { name: /Conclusão de Pátio/ });
  await expect(badge).toHaveAttribute("aria-valuenow", "23");
  await expect(badge).toContainText("23%");
  await expect(badge.getByText(/Faltam/)).toHaveCount(0);
  await expect(badge.locator(".is-complete")).toHaveCount(1);
  await page.waitForTimeout(900);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const box = await badge.boundingBox(),
      score = await page.locator(".math-place-total").boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(score!.y + score!.height);
    await expect(badge).toHaveCSS("color", "rgb(41, 36, 50)");
    await page.screenshot({ path: info.outputPath(`completion-${theme}.png`) });
  }
});
