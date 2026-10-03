import { test, expect } from "@playwright/test";

test("Pomodoro retoma ao voltar à aba e após recarregar", async ({ page }, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/foco");
  await page.getByRole("button", { name: "Próximo modo" }).click();
  await page.getByRole("button", { name: "Começar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "25:00", exact: true })).toHaveCount(0);
  const deadline = await page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem("olena.focus-session.v1")!) as { pomodoroDeadline: number })
        .pomodoroDeadline,
  );
  const navigation = page.getByRole("navigation", {
    name: testInfo.project.name === "mobile" ? "Navegação móvel" : "Navegação principal",
  });
  await navigation.getByRole("button", { name: "Perfil", exact: true }).click();
  await navigation.getByRole("button", { name: "Foco", exact: true }).click();
  await expect(page.locator(".focus-mode-name")).toHaveText("Pomodoro");
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".focus-mode-name")).toHaveText("Pomodoro");
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          JSON.parse(localStorage.getItem("olena.focus-session.v1")!) as {
            pomodoroDeadline: number;
          }
        ).pomodoroDeadline,
    ),
  ).toBe(deadline);
});
