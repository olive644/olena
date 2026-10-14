import { expect, test } from "@playwright/test";

test("rare and epic paper cards stay readable in both themes and support reduced motion", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem(
      "helena.mathPlaceRewards.v1",
      JSON.stringify({
        foundations: {
          points: 200,
          receipts: ["rare", "epic"],
          chests: [
            { id: "rare", unlockAt: 0, opened: true, cards: ["third-bridge"], revealed: 0 },
            { id: "epic", unlockAt: 0, opened: true, cards: ["last-note"], revealed: 0 },
          ],
        },
      }),
    );
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  for (const [id, rarity] of [
    ["rare", "Rara"],
    ["epic", "Épica"],
  ]) {
    await page.locator(`[data-chest-id="${id}"]`).click();
    for (let tap = 1; tap <= 4; tap++)
      await page.getByRole("button", { name: `Revelar raridade, toque ${tap} de 4` }).click();
    await page.getByRole("button", { name: "Revelar carta", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Poeira cósmica", exact: true });
    await expect(dialog).toHaveAttribute("data-rarity", rarity!);
    await expect(page.locator(".oliver-inspection.is-inline")).toHaveCSS("animation-name", "none");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => (document.documentElement.dataset["theme"] = t), theme);
      await expect(page.getByRole("button", { name: "Guardar cartas" })).toBeInViewport();
      await expect(page.locator(".oliver-cards-remaining .paper-digits")).toHaveCSS(
        "--digit-face",
        "#292432",
      );
      await page.screenshot({ path: info.outputPath(`${id}-${theme}.png`) });
    }
    await page.getByRole("button", { name: "Fechar cartas" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Coleção do Oliver" })).toHaveCount(0);
  }
});
