import { createInitialWorkspace } from "../src/domain/workspace";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`widget inglês alterna e abre o percurso: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    const prepared = page.waitForResponse(
      (response) =>
        response.url().includes("/languages/olena-english-widget.webp") && response.ok(),
    );
    await page.goto("/");
    expect((await (await prepared).body()).length).toBeLessThan(80 * 1024);
    await expect(
      page.getByRole("img", { name: "Olena convida você a praticar Inglês" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Explorar Matemática", exact: true }),
    ).toBeVisible();
    const selector = page.getByRole("button", { name: "Mostrar Inglês", exact: true });
    await selector.click();
    await expect(selector).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "Uma nova conversa começa aqui." })).toHaveCount(
      0,
    );
    await expect(page.locator("[data-hero-decoration=english] svg")).toBeVisible();
    const art = page.getByRole("img", { name: "Olena convida você a praticar Inglês" });
    await expect(art).toBeVisible();
    await expect(art).toHaveCSS("animation-name", "none");
    await expect.poll(() => art.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(900);
    expect(await art.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page
      .locator(".math-hero-carousel")
      .screenshot({ path: info.outputPath(`english-widget-${theme}.png`), animations: "disabled" });
    await selector.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("button", { name: "Explorar Matemática", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Explorar Inglês", exact: true })).toBeVisible();
    const carousel = page.locator(".math-hero-carousel");
    await carousel.dispatchEvent("touchstart", {
      touches: [{ identifier: 0, clientX: 100, clientY: 200 }],
    });
    await carousel.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 0, clientX: 240, clientY: 205 }],
    });
    await expect(page.getByRole("button", { name: "Mostrar Matemática" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await carousel.dispatchEvent("touchstart", {
      touches: [{ identifier: 0, clientX: 240, clientY: 200 }],
    });
    await carousel.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 0, clientX: 100, clientY: 205 }],
    });
    await expect(selector).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Explorar Inglês", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Cais das Boas-vindas", exact: true }),
    ).toBeVisible();
  });
}

for (const urgent of [false, true]) {
  test(`carrossel prioriza Inglês por ${urgent ? "expiração próxima" : "maior ofensiva"}`, async ({
    page,
  }) => {
    const workspace = createInitialWorkspace();
    const now = Date.now();
    const record = (english: boolean, time: number, id: number) => ({
      id: `hero-priority-${english}-${id}`,
      islandId: english ? "english" : "mathematics:foundations",
      islandName: english ? "English" : "Matemática",
      answers: 1,
      correct: 1,
      completedAt: new Date(time).toISOString(),
      ...(english
        ? {
            englishAttempt: {
              curriculum: 4 as const,
              area: "english" as const,
              part: 0,
              mode: "practice" as const,
              questions: [0],
              correctQuestions: [0],
            },
          }
        : {}),
    });
    workspace.practiceActivities = urgent
      ? [
          record(true, now - 23.5 * 3600000, 0),
          ...[0, 1, 2].map((day) => record(false, now - day * 86400000, day)),
        ]
      : [...[0, 1, 2].map((day) => record(true, now - day * 86400000, day)), record(false, now, 0)];
    await page.addInitScript((state) => {
      localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helena.agendaTimeZone.v1", "UTC");
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
    }, workspace);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Mostrar Inglês" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.getByRole("img", { name: "Olena convida você a praticar Inglês" }),
    ).toBeVisible();
    if (urgent)
      await expect(
        page.getByRole("status").filter({ hasText: "Sua ofensiva de Inglês termina" }),
      ).toBeVisible();
    await page.getByRole("button", { name: "Mostrar Matemática" }).click();
    await expect(page.getByRole("button", { name: "Mostrar Matemática" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
}
