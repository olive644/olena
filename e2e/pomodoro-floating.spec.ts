import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

test("avisos nativos acompanham estudo e pausa sem duplicar", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem(
      "olena.focus-session.v1",
      JSON.stringify({
        mode: "pomodoro",
        phase: "focus",
        completed: 0,
        duration: 1,
        secondsRemaining: 1,
        elapsedMilliseconds: 0,
        running: false,
        timerStartedAt: null,
        pomodoroDeadline: null,
        savedAt: Date.now(),
      }),
    );
    const notices: string[] = [];
    Object.assign(window, { testPomodoroNotices: notices });
    class NotificationMock {
      static permission = "granted";
      constructor(_title: string, options: NotificationOptions) {
        notices.push(options.body ?? "");
      }
    }
    Object.defineProperty(window, "Notification", { value: NotificationMock, configurable: true });
  });
  await page.goto("/foco");
  await page.getByRole("button", { name: "Expandir controles do Pomodoro" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.clock.fastForward(1500);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { testPomodoroNotices?: string[] }).testPomodoroNotices,
      ),
    )
    .toEqual(["Rodada concluída. Hora de descansar."]);
  await page.clock.fastForward(300000);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { testPomodoroNotices?: string[] }).testPomodoroNotices,
      ),
    )
    .toEqual([
      "Rodada concluída. Hora de descansar.",
      "A pausa terminou. Hora de voltar ao estudo.",
    ]);
});

for (const theme of ["light", "dark"]) {
  test(`mini Pomodoro compartilha contador e controles: ${theme}`, async ({ page }, info) => {
    await page.clock.install();
    await page.clock.resume();
    const workspace = createInitialWorkspace();
    workspace.focusPreferences.pomodoroMinutes = 1;
    await page.addInitScript(
      ({ workspace, theme }) => {
        localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        localStorage.setItem("helenastudy.theme", theme);
        localStorage.setItem(
          "olena.focus-session.v1",
          JSON.stringify({
            mode: "pomodoro",
            phase: "focus",
            completed: 0,
            duration: 1,
            secondsRemaining: 60,
            elapsedMilliseconds: 0,
            running: false,
            timerStartedAt: null,
            pomodoroDeadline: null,
            savedAt: Date.now(),
          }),
        );
        Object.defineProperty(window, "documentPictureInPicture", {
          value: undefined,
          configurable: true,
        });
        class NotificationMock {
          static permission = "denied";
        }
        Object.defineProperty(window, "Notification", {
          value: NotificationMock,
          configurable: true,
        });
      },
      { workspace, theme },
    );
    await page.goto("/foco");
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Abrir mini Pomodoro" }).click();
    const popup = await popupPromise;
    await expect(popup.getByRole("main", { name: "Mini Pomodoro" })).toBeVisible();
    await expect(popup.locator("html")).toHaveAttribute("data-theme", theme);
    const tomato = popup.locator(".pomodoro-tomato-live");
    await expect(tomato).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
    await expect(tomato.locator("canvas")).toBeVisible();
    await expect(popup.locator(".pomodoro-worm")).toBeVisible();
    await expect(
      popup.locator(".pomodoro-progress, .pomodoro-week, main p, main small"),
    ).toHaveCount(0);
    for (const selector of ["html", "body", "main"]) {
      await expect(popup.locator(selector)).toHaveCSS("background-image", "none");
      await expect(popup.locator(selector)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    }
    await popup.getByRole("button", { name: "Expandir controles do Pomodoro" }).click();
    await page.getByRole("button", { name: "Expandir controles do Pomodoro" }).click();
    const boxes = await popup.locator(".pomodoro-controls__row > button").evaluateAll((buttons) =>
      buttons.map((button) => ({
        top: button.getBoundingClientRect().top,
        left: button.getBoundingClientRect().left,
      })),
    );
    expect(boxes).toHaveLength(3);
    const row = await popup.locator(".pomodoro-controls__row").boundingBox();
    expect(row!.y + row!.height).toBeLessThanOrEqual(await popup.evaluate(() => innerHeight - 4));
    expect(
      Math.max(...boxes.map((box) => box.top)) - Math.min(...boxes.map((box) => box.top)),
    ).toBeLessThan(1);
    await popup.getByRole("button", { name: "Começar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
    await expect(page.getByText(/Os avisos estão bloqueados/)).toBeVisible();
    await page.clock.fastForward(16000);
    await expect(tomato).toHaveAttribute("data-stage", "2");
    await expect(page.locator(".pomodoro-tomato-live")).toHaveAttribute("data-stage", "2");
    await expect
      .poll(async () =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("olena.focus-session.v1")!).secondsRemaining,
        ),
      )
      .toBeLessThan(60);
    await popup.getByRole("button", { name: "Pausar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeVisible();
    const pausedTime = await popup.locator(".timer").textContent();
    await popup.screenshot({ path: info.outputPath(`mini-${theme}.png`) });
    await popup.close();
    await expect(page.getByRole("button", { name: "Abrir mini Pomodoro" })).toBeVisible();
    expect(await page.locator(".timer").textContent()).toBe(pausedTime);
  });
}
