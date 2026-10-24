import { expect, test } from "@playwright/test";
import { GENERAL_ACHIEVEMENTS } from "../src/domain/general-achievement-catalog";

for (const theme of ["light", "dark"]) {
  test(`celebração rara não modal e movimento reduzido: ${theme}`, async ({ page }, info) => {
    await page.addInitScript(() => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
    });
    await page.goto("/perfil");
    await expect(page.getByRole("button", { name: "Adicionar amigo", exact: true })).toBeVisible();
    // Recibo local fictício aplicado ao componente real, sem simular login ou acesso à conta.
    await page.evaluate(
      ({ theme, id }) => {
        document.documentElement.dataset.theme = theme;
        const profile = JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}");
        profile.achievementHistory = {
          ...profile.achievementHistory,
          [id]: "2026-10-23T12:00:00Z",
        };
        localStorage.setItem("helena.profile.v1", JSON.stringify(profile));
        window.dispatchEvent(new CustomEvent("helena:synced-storage-change"));
      },
      { theme, id: GENERAL_ACHIEVEMENTS.find((item) => item.rarity === "rare")!.id },
    );
    const notice = page.getByLabel("Nova conquista", { exact: true });
    await expect(notice).toHaveAttribute("data-rarity", "rare");
    await expect(notice).toHaveCSS("pointer-events", "none");
    const card = notice.locator(".achievement-celebration-card");
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await notice.getByRole("button", { name: "Fechar conquista" }).focus();
    await card.screenshot({
      path: info.outputPath(`celebracao-${theme}.png`),
      animations: "disabled",
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(card).toHaveCSS("animation-name", "none");
    await expect(notice.locator(".achievement-celebration-burst")).toBeHidden();
    await notice.getByRole("button", { name: "Fechar conquista" }).click();
    await expect(notice).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Adicionar amigo", exact: true })).toBeVisible();
  });
}
