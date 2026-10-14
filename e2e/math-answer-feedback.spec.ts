import { expect, test } from "@playwright/test";
import { shownMathQuestion } from "./math-question";

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
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole("button", { name: "Próximo lugar" }).click();
  await page.clock.runFor(120);
  const falling = Number(await number.getAttribute("aria-label"));
  expect(falling).toBeGreaterThan(0);
  expect(falling).toBeLessThan(530);
  await page.clock.runFor(1000);
  await expect(number).toHaveAttribute("aria-label", "0");
  await page.getByRole("button", { name: "Lugar anterior" }).click();
  await page.clock.runFor(120);
  const rising = Number(await number.getAttribute("aria-label"));
  expect(rising).toBeGreaterThan(0);
  expect(rising).toBeLessThan(530);
  await page.clock.runFor(1000);
  await expect(number).toHaveAttribute("aria-label", "530");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helena.mathPlaceRewards.v1")!).foundations.points,
    ),
  ).toBe(530);
});

test("server disconnection cannot delay feedback or score an answer twice", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  let answers = 0;
  await page.route("**/api/olena?action=math&version=1", async (route) => {
    answers++;
    await route.abort("connectionfailed");
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await page.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
  for (const correct of [true, false]) {
    const question = await shownMathQuestion(page, "foundations");
    const choice = correct
      ? question.answer
      : question.choices.find((value) => value !== question.answer)!;
    const button = page.getByRole("button", { name: "Resposta " + choice, exact: true });
    await button.click();
    await button.dispatchEvent("click");
    await expect(page.locator(".math-api-loading")).toHaveCount(0);
    const reaction = page.locator(".math-answer-reaction");
    await expect(reaction).toBeVisible();
    await expect(button).toHaveAttribute("data-feedback", correct ? "correct" : "wrong");
    await page.waitForTimeout(350);
    await expect(reaction).toBeVisible();
    await expect(reaction).toHaveCSS("opacity", "1");
    await expect(reaction).toHaveCount(0);
  }
  expect(answers).toBe(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helena.mathGame.v5")!).foundations.correct,
    ),
  ).toBe(1);
  await expect(page.locator(".math-arcade-stage")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByLabel("2 chances restantes")).toBeVisible();
});

test("mastery celebrates offline, retains progress after reload and opens the next real place", async ({
  page,
  context,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    if (!sessionStorage.getItem("mastery-seeded")) {
      localStorage.setItem(
        "helena.mathGame.v5",
        JSON.stringify({
          foundations: {
            level: 5,
            mastery: 5,
            mastered: 63,
            confirmed: 31,
            correct: 119,
            best: 500,
            solved: Array(6).fill(1048575),
            seen: Array(6).fill(1048575),
            extraSolved: Array(6).fill(0),
            extraSeen: Array(6).fill(0),
            attempts: 4,
            recent: [],
            retry: [],
            recovery: [],
            cooldown: 0,
            finalSeen: [0, 0, 0, 0, 0, 266305],
            final: { level: 5, slots: [0, 6, 12, 18, 1], answered: 15, correct: 15 },
          },
        }),
      );
      sessionStorage.setItem("mastery-seeded", "1");
    }
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await page.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4, { timeout: 10000 });
  const question = await shownMathQuestion(page, "foundations");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Resposta " + question.answer, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Parabéns, você se superou!" })).toBeVisible();
  await expect(page.locator(".math-mastery")).toHaveCSS("opacity", "1");
  await expect
    .poll(() =>
      page
        .locator(".math-mastery-seal use")
        .first()
        .evaluate((element) => (element as SVGGraphicsElement).getBBox().width),
    )
    .toBeGreaterThan(0);
  const button = page.getByRole("button", { name: "Ver minha conquista" });
  await expect(button).toBeFocused();
  await expect(button).toBeInViewport({ ratio: 1 });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    expect(
      await page
        .locator(".math-mastery-seal .paper-digits")
        .evaluate((element) => getComputedStyle(element).getPropertyValue("--digit-face").trim()),
    ).toBe("#7c3aed");
    await expect(page.locator(".math-mastery h1")).toHaveCSS("color", "rgb(41, 36, 50)");
  }
  await page.screenshot({ path: info.outputPath("math-mastery.png") });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helena.mathGame.v5")!).foundations.confirmed,
    ),
  ).toBe(63);
  await button.click();
  await page.getByRole("button", { name: "Explorar Oficina das Equações" }).click();
  await expect(page.getByRole("heading", { name: "Oficina das Equações" })).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helena.mathGame.v5")!).foundations.confirmed,
    ),
  ).toBe(63);
});
