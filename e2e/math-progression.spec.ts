import { expect, test } from "@playwright/test";
import { shownMathQuestion } from "./math-question";

test("locks later places and keeps the paper completion badge above the avatar in both themes", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem(
      "helena.mathLearning.v2",
      JSON.stringify({
        foundations: { level: 5, mastery: 5, mastered: 63, correct: 200, best: 1640 },
      }),
    );
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  const badge = page.getByRole("progressbar", { name: /Conclusão de Pátio/ });
  await expect(badge).toHaveAttribute("aria-valuenow", "0");
  await expect(badge).toContainText("Faltam 100%");
  await page.waitForTimeout(900);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await expect(badge).toBeInViewport({ ratio: 1 });
    await expect(badge).toHaveCSS("color", "rgb(41, 36, 50)");
    const box = await badge.boundingBox();
    const avatar = await page.locator(".math-journey-avatar .practice-user-portrait").boundingBox();
    expect(box!.y + box!.height).toBeLessThan(avatar!.y);
    await page.screenshot({ path: info.outputPath(`math-map-${theme}.png`) });
  }
  await page.getByRole("button", { name: "Próximo lugar" }).click();
  await expect(page.getByRole("heading", { name: "Oficina das Equações" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lugar bloqueado" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Entrar em Oficina das Equações" })).toBeDisabled();
  await expect(page.getByText("Complete Pátio das Primeiras Contas para liberar.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await expect(badge).toHaveAttribute("aria-valuenow", "0");
});
test("keeps short word challenges and all four answers usable on desktop and mobile", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem(
      "helena.mathGame.v3",
      JSON.stringify({
        foundations: {
          level: 3,
          mastery: 0,
          mastered: 7,
          correct: 60,
          best: 900,
          solved: [1048575, 1048575, 1048575, 0, 0, 0],
          seen: [1048575, 1048575, 1048575, 0, 0, 0],
        },
      }),
    );
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await page.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
  const question = await shownMathQuestion(page, "foundations");
  await page.getByRole("button", { name: `Resposta ${question.answer}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: /fichas em/ })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const box = await page.getByRole("heading").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    for (const answer of await page.getByRole("button", { name: /^Resposta/ }).all())
      await expect(answer).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: info.outputPath(`math-question-${theme}.png`) });
  }
});
