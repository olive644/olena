import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`expired time costs a heart and survives suspended callbacks, ${theme}`, async ({
    page,
  }, info) => {
    await page.clock.install();
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", appearance);
    }, theme);
    await page.goto("/aprender");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
    await page.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }).click();
    await page.getByRole("button", { name: "Vamos calcular!" }).click();
    await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    for (let remaining = 2; remaining >= 0; remaining--) {
      // fastForward salta callbacks intermediários, simulando suspensão da aba.
      await page.clock.fastForward(61000);
      await page.clock.runFor(1);
      await expect(page.getByLabel(`${remaining} chances restantes`)).toBeVisible();
      await expect(page.getByText("Putz! Perdeu a vez!", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0);
      await page.clock.runFor(200);
      if (remaining === 2) {
        await page.screenshot({
          path: `artifacts/math-heart-timeout/${info.project.name}-${theme}-timeout.png`,
        });
      }
      await page.clock.runFor(1100);
      if (remaining > 0) {
        await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
        await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
        if (remaining === 2)
          await page.screenshot({
            path: `artifacts/math-heart-timeout/${info.project.name}-${theme}-continued.png`,
          });
      }
    }
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
  });
}
