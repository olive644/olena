import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

for (const theme of ["light", "dark"]) {
  test(`ofensivas agrupadas no perfil e sino: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const workspace = createInitialWorkspace();
    const completedAt = new Date().toISOString();
    workspace.focusSessions = [
      {
        id: "group-focus",
        subjectId: "",
        durationMinutes: 25,
        completedAt,
        mode: "pomodoro",
      },
    ];
    workspace.practiceActivities = [
      {
        id: "group-math",
        islandId: "math",
        islandName: "Matemática",
        answers: 1,
        correct: 1,
        completedAt,
      },
      {
        id: "english:arcade:group:0",
        islandId: "english",
        islandName: "English",
        answers: 1,
        correct: 1,
        completedAt,
        englishAttempt: {
          curriculum: 4,
          area: "english",
          part: 0,
          mode: "practice",
          questions: [0],
          correctQuestions: [0],
        },
      },
    ];
    await page.addInitScript(
      ({ workspace, theme }) => {
        localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        localStorage.setItem("helenastudy.theme", theme);
        localStorage.removeItem("noteoli.pomodoro-streak.v1");
        localStorage.setItem("olena:accessibility:v1", JSON.stringify({ reduceMotion: true }));
      },
      { workspace, theme },
    );
    for (const path of ["/perfil", "/notificacoes"]) {
      await page.goto(path);
      const group = page.locator(".profile-streak-group");
      const summary = group.locator("summary");
      await expect(summary).toBeVisible();
      await expect(group).not.toHaveAttribute("open", "");
      await expect(summary).toHaveAttribute("aria-label", "Suas ofensivas: 3");
      await expect(group.locator(".profile-streak-group-list")).not.toBeVisible();
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(group).toHaveAttribute("open", "");
      const rows = group.locator(".profile-streak-group-row");
      await expect(rows).toHaveCount(3);
      for (const label of ["Pomodoro", "Ilhas", "Inglês"])
        await expect(rows.filter({ hasText: label })).toContainText("1 dia seguido");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: info.outputPath(`group-${theme}-${path.slice(1)}.png`),
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(group.locator(".profile-streak-group-list")).not.toBeVisible();
      await expect(summary).toBeFocused();
      if (info.project.name === "mobile") await summary.tap();
      else await summary.click();
      await expect(group.locator(".profile-streak-group-list")).toBeVisible();
      await summary.click();
      await expect(group.locator(".profile-streak-group-list")).not.toBeVisible();
      await page.reload();
      await expect(summary).toBeVisible();
      await expect(group.locator(".profile-streak-group-list")).not.toBeVisible();
    }
  });
}
