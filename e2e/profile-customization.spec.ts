import { test, expect } from "@playwright/test";
import { upgradeMasteryProgress, validMasteryProgress } from "../src/domain/math-mastery-progress";
for (const theme of ["light", "dark"])
  test(
    "personalização original, bandeiras e recompensa matemática: " + theme,
    async ({ page }, info) => {
      const progress = {
        ...upgradeMasteryProgress(),
        level: 5,
        mastery: 5,
        mastered: 63,
        solved: Array(6).fill(1048575),
        seen: Array(6).fill(1048575),
        correct: 120,
        confirmed: 63,
      };
      expect(validMasteryProgress(progress)).toBe(true);
      await page.addInitScript(
        ({ theme, progress }) => {
          localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
          localStorage.setItem("helena.guest.v1", "1");
          if (sessionStorage.getItem("customization-seeded")) return;
          sessionStorage.setItem("customization-seeded", "1");
          localStorage.setItem("helenastudy.theme", theme);
          localStorage.setItem(
            "helena.profile.v1",
            JSON.stringify({ name: "Perfil de teste", photoUrl: "/profile-avatars/oliver.webp" }),
          );
          localStorage.setItem("helena.mathGame.v5", JSON.stringify({ foundations: progress }));
        },
        { theme, progress },
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/perfil");
      await page.locator(".profile-cover__portrait").click();
      const dialog = page.getByRole("dialog", { name: "Personalize seu perfil" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Molduras", exact: true }).click();
      await dialog.getByRole("button", { name: "Bissexual" }).click();
      await expect(
        dialog.locator(".profile-customizer-preview .profile-frame-art"),
      ).toHaveAttribute("src", "/profile-cosmetics/bi.svg");
      await expect(
        dialog.getByRole("button", { name: "Guardião dos números" }),
      ).not.toHaveAttribute("aria-disabled", "true");
      await dialog.evaluate((node) => {
        node.scrollTop = 0;
      });
      await dialog.screenshot({ path: info.outputPath("molduras-" + theme + ".png") });
      await dialog.getByRole("button", { name: "Headers", exact: true }).click();
      await dialog.getByRole("button", { name: "Horizonte dos números" }).click();
      await dialog.getByRole("button", { name: "Fundo do perfil", exact: true }).click();
      await dialog.getByRole("button", { name: "Caderno geométrico" }).click();
      await dialog.screenshot({ path: info.outputPath("personalizar-" + theme + ".png") });
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await dialog.getByRole("button", { name: "Salvar personalização" }).click();
      await expect(dialog).not.toBeVisible();
      await expect(page.locator(".profile-cover")).toHaveAttribute(
        "data-profile-background",
        "geometry",
      );
      await expect(page.locator(".profile-cover__portrait .profile-frame-art")).toHaveAttribute(
        "src",
        "/profile-cosmetics/bi.svg",
      );
      await expect(page.locator(".profile-cover__art img")).toHaveAttribute(
        "src",
        "/profile-covers/mathematics.svg",
      );
      expect(
        await page
          .locator(".profile-cover")
          .evaluate((node) => getComputedStyle(node).backgroundImage),
      ).not.toBe("none");
      await page.screenshot({ path: info.outputPath("perfil-" + theme + ".png"), fullPage: true });
      await page.reload();
      await expect(page.locator(".profile-cover__portrait .profile-frame-art")).toHaveAttribute(
        "src",
        "/profile-cosmetics/bi.svg",
      );
    },
  );
