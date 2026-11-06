import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

for (const theme of ["light", "dark"]) {
  test(`ofensiva inglesa no perfil e no sino: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const workspace = createInitialWorkspace();
    workspace.practiceActivities = [0, 1].map((index) => ({
      id: `english:arcade:streak:${index}`,
      islandId: "english",
      islandName: "English",
      answers: 1,
      correct: 1,
      completedAt: new Date(Date.now() - (1 - index) * 86400000).toISOString(),
      englishAttempt: {
        curriculum: 4,
        area: "english",
        part: 0,
        mode: "practice",
        questions: [index],
        correctQuestions: [index],
      },
    }));
    await page.addInitScript(
      ({ workspace, theme }) => {
        localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        localStorage.setItem("helenastudy.theme", theme);
        localStorage.setItem("olena:accessibility:v1", JSON.stringify({ reduceMotion: true }));
      },
      { workspace, theme },
    );
    for (const path of ["/perfil", "/notificacoes"]) {
      await page.goto(path);
      const streak = page.getByRole("button", { name: "Inglês: 2 dias seguidos", exact: true });
      await expect(streak).toBeVisible();
      await expect(streak.locator("img")).toHaveAttribute(
        "src",
        "/languages/english-streak-flame.svg",
      );
      await streak.focus();
      await page.keyboard.press("Enter");
      await expect(streak).toHaveAttribute("aria-expanded", "true");
      await expect(
        page.getByRole("status").filter({ hasText: "Inglês: 2 dias seguidos" }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: info.outputPath(`english-streak-${theme}-${path.slice(1)}.png`),
        fullPage: true,
        animations: "disabled",
      });
      await page.reload();
      await expect(streak).toBeVisible();
    }
  });
}
