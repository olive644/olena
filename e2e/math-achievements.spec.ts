import { expect, test } from "@playwright/test";
import { upgradeMasteryProgress } from "../src/domain/math-mastery-progress";

for (const theme of ["light", "dark"]) {
  test(`conquistas de papel têm inspeção 3D e aviso real: ${theme}`, async ({ page }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    const collection = page.getByRole("region", { name: "Conquistas de matemática" });
    await expect(collection).toBeVisible();
    await expect(collection.locator(".achievement-tile")).toHaveCount(6);
    await collection.getByRole("button", { name: "Ver todas as conquistas" }).click();
    await expect(collection.locator(".achievement-tile")).toHaveCount(57);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await collection.getByRole("button", { name: /Cartógrafo do infinito 6\./ }).click();
    const dialog = page.getByRole("dialog", { name: "Cartógrafo do infinito" });
    await expect(dialog).toBeVisible();
    const stage = dialog.getByRole("button", { name: /Girar conquista/ });
    await stage.focus();
    await page.keyboard.press("ArrowRight");
    await expect(stage.locator(".oliver-inspection-turn")).toHaveCSS("transform", /matrix3d/);
    await page.keyboard.press("Home");
    await expect(dialog.locator(".math-achievement-art").first()).toHaveClass(/is-locked/);
    await dialog.screenshot({
      path: info.outputPath(`conquista-3d-${theme}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      collection.getByRole("button", { name: /Cartógrafo do infinito 6\./ }),
    ).toBeFocused();
    await page.evaluate(
      (progress) => {
        localStorage.setItem("helena.mathGame.v5", JSON.stringify({ foundations: progress }));
        window.dispatchEvent(new Event("helena:synced-storage-change"));
      },
      { ...upgradeMasteryProgress(), correct: 1 },
    );
    const notice = page.getByRole("complementary", { name: "Nova conquista" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Parabéns! Conquista desbloqueada");
    await notice.screenshot({ path: info.outputPath(`conquista-aviso-${theme}.png`) });
    await notice.getByRole("button", { name: "Inspecionar" }).click();
    await expect(page.getByRole("dialog", { name: "Constelação de acertos" })).toBeVisible();
  });
}
