import { test, expect } from "@playwright/test";

test("opening another device's focus snapshot keeps it paused until explicit continuation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    if (!sessionStorage.getItem("foreign-focus-seeded")) {
      localStorage.setItem(
        "olena.focus-session.v1",
        JSON.stringify({
          mode: "timer",
          phase: "focus",
          completed: 0,
          duration: 25,
          secondsRemaining: 1500,
          elapsedMilliseconds: 120000,
          running: true,
          timerStartedAt: Date.now() - 120000,
          pomodoroDeadline: null,
          savedAt: Date.now(),
          deviceId: "another-device",
        }),
      );
      sessionStorage.setItem("foreign-focus-seeded", "1");
    }
  });
  await page.goto("/foco");
  await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("olena.focus-session.v1")!).deviceId),
  ).toBe("another-device");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("olena.focus-session.v1")!).deviceId ===
        localStorage.getItem("helena.focus-device.v1"),
    ),
  ).toBe(true);
});

test("timer survives reload while running and keeps recorded minutes after two reloads", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-12T12:00:00Z") });
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/foco");
  await page.getByRole("button", { name: "Começar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
  await page.clock.fastForward(65000);
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("olena.focus-session.v1")!).elapsedMilliseconds,
      ),
    )
    .toBeGreaterThanOrEqual(60000);
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("olena.focus-session.v1")!).elapsedMilliseconds,
  );
  expect(before).toBeGreaterThanOrEqual(60000);
  await page.reload();
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
  const restored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("olena.focus-session.v1")!).elapsedMilliseconds,
  );
  expect(restored).toBeGreaterThanOrEqual(before);
  await page.getByRole("button", { name: "Encerrar e registrar", exact: true }).click();
  for (let reload = 0; reload < 2; reload++) {
    await page.reload();
    await expect(page.getByRole("button", { name: "Começar", exact: true })).toBeVisible();
    const records = await page.evaluate(
      () => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).focusSessions,
    );
    expect(records).toHaveLength(1);
    expect(records[0].mode).toBe("timer");
    expect(records[0].durationMinutes).toBeGreaterThanOrEqual(1);
  }
});

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
  await expect(page.getByRole("region", { name: "Seu perfil" })).toBeVisible();
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
