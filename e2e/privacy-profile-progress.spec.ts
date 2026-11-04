import { test, expect } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";
for (const theme of ["light", "dark"]) {
  test(`English A1 mastery survives reload and navigation: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const workspace = createInitialWorkspace();
    workspace.studyPreferences.initialIslandId = "languages";
    workspace.practiceActivities = Array.from({ length: 23 }, (_, id) => ({
      id: `preserved-a1-${id}`,
      islandId: "english",
      islandName: "Inglês",
      completedAt: new Date(1700000000000 + id * 1000).toISOString(),
      answers: 1,
      correct: 1,
      englishA1Attempt: {
        curriculum: 5,
        area: "english",
        part: 0,
        mode: "practice",
        questions: [id],
        correctQuestions: [id],
      },
    }));
    await page.addInitScript(
      ({ workspace, theme }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", theme);
        if (!sessionStorage.getItem("preserved-a1")) {
          sessionStorage.setItem("preserved-a1", "1");
          localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        }
      },
      { workspace, theme },
    );
    const open = async () => {
      await page.goto("/aprender");
      await page.getByRole("button", { name: "Explorar Inglês", exact: true }).click();
      await expect(page.locator(".english-parts-journey")).toBeVisible();
      await expect(page.locator(".math-journey-completion")).toHaveAttribute("aria-valuenow", "23");
    };
    await open();
    await page.reload();
    await open();
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).practiceActivities.length,
      ),
    ).toBe(23);
    await page.screenshot({ path: info.outputPath(`preserved-a1-${theme}.png`) });
  });
  test(`profile level stays above the cosmetic frame: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    await expect(page.getByRole("button", { name: "Adicionar amigo", exact: true })).toBeVisible();
    // CSS inspection fixture clones the real rendered badge, not an authenticated account.
    await page.evaluate(() => {
      const dialog = document.createElement("dialog");
      dialog.className = "profile-editor social-directory profile-visit-dialog";
      dialog.style.width = "min(700px, calc(100vw - 24px))";
      const profile = document.createElement("section");
      profile.className = "social-profile";
      const cover = document.createElement("div");
      cover.className = "social-visit-cover";
      const avatar = document.createElement("div");
      avatar.className = "social-visit-avatar";
      const img = document.createElement("img");
      img.src = "/profile-avatars/nicolas.svg";
      img.width = img.height = 140;
      const frame = document.createElement("img");
      frame.src = "/profile-cosmetics/bi.svg";
      frame.className = "profile-frame-art";
      avatar.append(img, frame, document.querySelector(".profile-level-badge")!.cloneNode(true));
      profile.append(cover, avatar);
      dialog.append(profile);
      document.body.append(dialog);
      dialog.showModal();
    });
    const avatar = page.locator("dialog .social-visit-avatar"),
      badge = avatar.locator(".profile-level-badge");
    await expect(badge).toBeVisible();
    await expect(avatar.locator("img").first()).toHaveJSProperty("complete", true);
    expect(
      await avatar
        .locator("img")
        .first()
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
    const visible = await badge.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const frame = el.parentElement!.querySelector(".profile-frame-art")!;
      return (
        Number(getComputedStyle(el).zIndex) > Number(getComputedStyle(frame).zIndex) &&
        el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2))
      );
    });
    expect(visible).toBe(true);
    await expect(avatar.locator(".profile-frame-art")).toBeVisible();
    await avatar.screenshot({ path: info.outputPath(`profile-level-${theme}.png`) });
  });
}
