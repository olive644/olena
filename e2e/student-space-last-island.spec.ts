import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

for (const theme of ["light", "dark"]) {
  test(`o Espaço do aluno leva à última ilha praticada, Inglês: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 740 });
    const workspace = createInitialWorkspace();
    workspace.studyPreferences.initialIslandId = "languages";
    workspace.practiceActivities = [
      {
        id: "english-last",
        islandId: "english",
        islandName: "Cais dos Encontros · Inglês",
        completedAt: new Date(Date.now() - 60000).toISOString(),
        answers: 3,
        correct: 3,
        // Cais das Boas-vindas é a parte 0, do currículo A1.
        englishA1Attempt: {
          curriculum: 5,
          area: "english",
          part: 0,
          mode: "practice",
          questions: [1, 2, 3],
          correctQuestions: [1, 2, 3],
        },
      },
    ];
    await page.addInitScript(
      ({ workspace, theme }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", theme);
        if (!sessionStorage.getItem("space-fixture")) {
          sessionStorage.setItem("space-fixture", "1");
          localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        }
      },
      { workspace, theme },
    );
    await page.goto("/");
    const island = page.locator(".student-destination--learn .student-island-art");
    await expect(island).toHaveAttribute("src", "/languages/english-parts/welcome.webp");
    await expect
      .poll(() => island.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    await page.locator(".student-space-shortcuts").screenshot({
      path: info.outputPath(`espaco-${info.project.name}-${theme}.png`),
    });
    await page.getByRole("button", { name: "Explorar as ilhas", exact: true }).click();
    // Entra direto no Cais dos Encontros, nos cenários de Inglês, sem passar por Matemática.
    await expect(page.getByRole("button", { name: "Explorar lugar", exact: true })).toBeVisible();
    await expect(page.getByText("Cais das Boas-vindas").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Explorar Matemática" })).toHaveCount(0);
  });
}
