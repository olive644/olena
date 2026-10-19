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
    await expect
      .poll(() =>
        tomato.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
          const box = canvas.getBoundingClientRect();
          return Math.abs(canvas.width / canvas.height - box.width / box.height);
        }),
      )
      .toBeLessThan(0.03);
    await expect(popup.locator(".pomodoro-worm")).toHaveCount(1);
    await expect(popup.locator(".pomodoro-worm")).toHaveCSS("opacity", "0");
    await expect(
      popup.locator(".pomodoro-progress, .pomodoro-week, main p, main small"),
    ).toHaveCount(0);
    await expect(popup.locator("body")).toHaveCSS("background-image", /pomodoro-pattern.svg/);
    await expect(page.locator("body")).not.toHaveCSS("background-image", /pomodoro-pattern.svg/);
    await expect(page.getByRole("button", { name: "Expandir controles do Pomodoro" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Fechar mini Pomodoro" })).toHaveText("");
    await popup.getByRole("button", { name: "Expandir controles do Pomodoro" }).click();
    expect(
      await popup.evaluate(() => ({
        width: document.documentElement.scrollWidth <= innerWidth,
        height: document.documentElement.scrollHeight <= innerHeight,
      })),
    ).toEqual({ width: true, height: true });
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
    // A aba de origem oculta não pode pausar o runtime da janela flutuante.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const pixels = () =>
      tomato.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
        const copy = document.createElement("canvas");
        copy.width = canvas.width;
        copy.height = canvas.height;
        const ctx = copy.getContext("2d")!;
        ctx.drawImage(canvas, 0, 0);
        return ctx
          .getImageData(0, 0, copy.width, copy.height)
          .data.reduce((sum, value, index) => (sum + value * (index % 251)) % 1000000007, 0);
      });
    const before = await pixels();
    await expect.poll(pixels).not.toBe(before);
    await expect(popup.locator(".paper-digits use").first()).toHaveAttribute("href", /^#digit-/);
    // sprite embutido na janela flutuante: o dígito novo pinta na hora, sem sumir a cada segundo
    await expect(popup.locator(".pomodoro-sprite symbol")).toHaveCount(10);
    expect(
      await popup
        .locator(".paper-digits use")
        .first()
        .evaluate((node: SVGGraphicsElement) => node.getBBox().height),
    ).toBeGreaterThan(0);
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
    await expect(popup.locator(".paper-digits")).toHaveCSS("--digit-face", "#292432");
    await popup.screenshot({ path: info.outputPath(`mini-${theme}.png`) });
    await popup
      .locator(".timer")
      .evaluate((node: HTMLElement) => (node.style.transform = "scale(3)"));
    await popup.locator(".timer").screenshot({ path: info.outputPath(`digits-${theme}.png`) });
    await popup.close();
    await expect(page.getByRole("button", { name: "Abrir mini Pomodoro" })).toBeVisible();
    expect(await page.locator(".timer").textContent()).toBe(pausedTime);
  });
}

test("PiP nativo usa a própria janela para animar com a origem oculta", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "PiP nativo é exercitado no desktop compatível.");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ studentResume: { focus: { mode: "pomodoro", at: Date.now() } } }),
    );
  });
  await page.goto("/foco");
  const supported = await page.evaluate(() => "documentPictureInPicture" in window);
  test.skip(!supported, "Navegador não oferece Document PiP.");
  await page.getByRole("button", { name: "Abrir mini Pomodoro" }).click();
  const state = () =>
    page.evaluate(() => {
      const child = (window as Window & { documentPictureInPicture: { window: Window | null } })
        .documentPictureInPicture.window;
      const doc = child?.document;
      return {
        ready: doc?.querySelector(".pomodoro-tomato-live")?.getAttribute("data-ready"),
        overflow: child
          ? doc!.documentElement.scrollWidth > child.innerWidth ||
            doc!.documentElement.scrollHeight > child.innerHeight
          : true,
        glyph: doc?.querySelector<SVGGraphicsElement>(".paper-digits use")?.getBBox().height ?? 0,
      };
    });
  await expect.poll(state, { timeout: 20000 }).toMatchObject({ ready: "true", overflow: false });
  expect((await state()).glyph).toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const pixels = () =>
    page.evaluate(() => {
      const child = (window as Window & { documentPictureInPicture: { window: Window } })
        .documentPictureInPicture.window;
      const canvas = child.document.querySelector("canvas")!;
      const copy = child.document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      const ctx = copy.getContext("2d")!;
      ctx.drawImage(canvas, 0, 0);
      return ctx
        .getImageData(0, 0, copy.width, copy.height)
        .data.reduce((sum, value, index) => (sum + value * (index % 251)) % 1000000007, 0);
    });
  const before = await pixels();
  await expect.poll(pixels).not.toBe(before);
  await page.evaluate(() =>
    (
      window as Window & { documentPictureInPicture: { window: Window } }
    ).documentPictureInPicture.window.close(),
  );
});
