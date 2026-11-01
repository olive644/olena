import { expect, test } from "@playwright/test";
import { challengeQuestion } from "../src/data/math-challenge-bank";

for (const theme of ["light", "dark"]) {
  test(`reviews original missed questions without extra rewards, ${theme}`, async ({
    page,
  }, info) => {
    await page.clock.install();
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", appearance);
    }, theme);
    await page.goto("/aprender");
    await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
    await page.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }).click();
    await page.getByRole("button", { name: "Vamos calcular!" }).click();
    await expect(page.locator(".math-answer-button")).toHaveCount(4);
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const missed: { expression: string; choices: string[]; answer: number }[] = [];
    for (let index = 0; index < 3; index++) {
      const seed = Number(
        await page.locator(".math-arcade-stage").getAttribute("data-question-seed"),
      );
      const q = challengeQuestion("foundations", Math.floor((seed - 1) / 48), (seed - 1) % 48);
      const choices = await page
        .locator(".math-answer-button")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")!));
      missed.push({ expression: q.expression, choices, answer: q.answer });
      if (index === 1) {
        await page.clock.fastForward(61000);
        await page.clock.runFor(1);
      } else {
        await page
          .getByRole("button", {
            name: choices.find((label) => label !== `Resposta ${q.answer}`)!,
            exact: true,
          })
          .click();
      }
      await page.clock.runFor(1300);
    }
    await expect(page.getByRole("heading", { name: "Vamos entender juntos?" })).toBeVisible();
    await page.locator(".math-arcade").evaluate((node) => {
      node.scrollTop = 0;
    });
    await page.screenshot({
      path: `artifacts/math-oliver-review/integration/${info.project.name}-${theme}-intro.png`,
    });
    const presentation = await page.evaluate(() => {
      const root = document.querySelector(".math-arcade")!;
      const plate = document.querySelector(".oliver-review__calculation")!;
      const symbol = plate.querySelector(".math-expression > span")!;
      const header = document.querySelector(".oliver-review__header")!.getBoundingClientRect();
      const back = document.querySelector(".math-world-back")!.getBoundingClientRect();
      return {
        background: getComputedStyle(root).backgroundColor,
        plateInk: getComputedStyle(plate).color,
        symbolInk: getComputedStyle(symbol).color,
        symbolShadow: getComputedStyle(symbol).textShadow,
        headerTop: header.top,
        backBottom: back.bottom,
      };
    });
    expect(presentation.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(presentation.symbolInk).toBe(presentation.plateInk);
    expect(presentation.symbolShadow).toBe("none");
    expect(presentation.headerTop).toBeGreaterThanOrEqual(presentation.backBottom);
    await page.clock.runFor(1);
    const saved = await page.evaluate(() => ({
      progress: localStorage.getItem("helena.mathGame.v5"),
      rewards: localStorage.getItem("helena.mathPlaceRewards.v1"),
    }));
    for (let index = 0; index < 3; index++) {
      await page.getByRole("button", { name: "Agora é sua vez" }).click();
      await expect(
        page.getByRole("heading", { name: missed[index]!.expression, exact: true }),
      ).toBeVisible();
      expect(
        await page
          .locator(".oliver-review__answers button")
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label"))),
      ).toEqual(missed[index]!.choices);
      const wrong = missed[index]!.choices.find(
        (label) => label !== `Resposta ${missed[index]!.answer}`,
      )!;
      await page.getByRole("button", { name: wrong, exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.clock.runFor(900);
      if (index === 0)
        await page.screenshot({
          path: `artifacts/math-oliver-review/integration/${info.project.name}-${theme}-wrong.png`,
        });
      await page.clock.fastForward(90000);
      await expect(page.getByRole("progressbar")).toHaveCount(0);
      await expect(page.locator(".math-hearts")).toHaveCount(0);
      await page
        .getByRole("button", { name: `Resposta ${missed[index]!.answer}`, exact: true })
        .click();
      await page.clock.runFor(480);
      await expect(page.locator(".oliver-review__answers button:disabled")).toHaveCount(4);
      if (index === 0)
        await page.screenshot({
          path: `artifacts/math-oliver-review/integration/${info.project.name}-${theme}-correct.png`,
        });
      await page
        .getByRole("button", { name: index === 2 ? "Concluir revisão" : "Próxima questão" })
        .click();
    }
    await expect(page.getByRole("heading", { name: "Você conseguiu!" })).toBeVisible();
    await page.getByRole("button", { name: "Ver resultado" }).click();
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
    expect(
      await page.evaluate(() => ({
        progress: localStorage.getItem("helena.mathGame.v5"),
        rewards: localStorage.getItem("helena.mathPlaceRewards.v1"),
      })),
    ).toEqual(saved);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  });
}
