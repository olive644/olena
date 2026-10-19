import { expect, test } from "@playwright/test";
for (const theme of ["light", "dark"]) {
  test(`Pomodoro personalizado em horas e minutos: ${theme}`, async ({ page }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    async function openStudy() {
      await page.getByRole("button", { name: "Configurações", exact: true }).click();
      await page.getByRole("button", { name: "Estudo e foco", exact: true }).click();
    }
    await openStudy();
    const study = page
      .locator("form.pomodoro-duration")
      .filter({ has: page.getByRole("slider", { name: "Tempo de estudo", exact: true }) });
    await study.getByRole("spinbutton", { name: "Horas", exact: true }).fill("1");
    await study.getByRole("spinbutton", { name: "Minutos", exact: true }).fill("30");
    await study.getByRole("button", { name: "Usar duração" }).click();
    await expect(
      page.getByRole("slider", { name: "Tempo de estudo", exact: true }),
    ).toHaveAttribute("aria-valuetext", "1 h 30 min");
    const pause = page
      .locator("form.pomodoro-duration")
      .filter({ has: page.getByRole("slider", { name: "Pausa curta", exact: true }) });
    await pause.getByRole("spinbutton", { name: "Minutos", exact: true }).fill("10");
    await pause.getByRole("button", { name: "Usar duração" }).click();
    await expect(page.getByRole("slider", { name: "Pausa curta", exact: true })).toHaveAttribute(
      "aria-valuetext",
      "10 min",
    );
    await page.reload();
    await openStudy();
    await expect(
      page.getByRole("slider", { name: "Tempo de estudo", exact: true }),
    ).toHaveAttribute("aria-valuetext", "1 h 30 min");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`pomodoro-${theme}.png`), fullPage: true });
  });
}
