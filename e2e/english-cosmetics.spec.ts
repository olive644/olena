import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`Teco e cosméticos ingleses com requisitos: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
      localStorage.setItem("olena:accessibility:v1", '{"reduceMotion":true}');
      if (sessionStorage.getItem("english-cosmetics-seeded")) return;
      sessionStorage.setItem("english-cosmetics-seeded", "1");
      localStorage.removeItem("helena.englishProgress.v1");
      localStorage.setItem("helena.profile.v1", '{"name":"Perfil de teste"}');
    }, theme);
    await page.goto("/perfil");
    const avatar = page.getByRole("button", { name: "Abrir foto do perfil", exact: true });
    await avatar.click();
    const dialog = page.getByRole("dialog", { name: "Personalize seu perfil", exact: true });
    await dialog.getByRole("button", { name: "Teco", exact: true }).click();
    await dialog.getByRole("button", { name: "Molduras", exact: true }).click();
    await expect(dialog.getByRole("button", { name: /Guardião das palavras/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await dialog.getByRole("button", { name: "Headers", exact: true }).click();
    await expect(dialog.getByRole("button", { name: /Horizonte das palavras/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await dialog.getByRole("button", { name: "Fundo do perfil", exact: true }).click();
    await expect(dialog.getByRole("button", { name: /Guardião das palavras/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.evaluate(() => {
      const solved = Array.from({ length: 100 }, (_, index) => index);
      localStorage.setItem(
        "helena.englishProgress.v1",
        JSON.stringify({
          english: Array.from({ length: 8 }, () => ({ solved, confirmed: true })),
        }),
      );
    });
    await page.reload();
    await avatar.click();
    await dialog.getByRole("button", { name: "Teco", exact: true }).click();
    for (const category of ["Molduras", "Headers", "Fundo do perfil"]) {
      await dialog.getByRole("button", { name: category, exact: true }).click();
      const option = dialog.getByRole("button", {
        name: category === "Headers" ? "Horizonte das palavras" : "Guardião das palavras",
        exact: true,
      });
      await expect(option).toHaveAttribute("aria-disabled", "false");
      await option.click();
    }
    await dialog.getByRole("button", { name: "Salvar personalização", exact: true }).click();
    const cover = page.locator(".profile-cover");
    await expect(cover).toHaveAttribute("data-profile-background", "english");
    await expect(avatar.locator("img").first()).toHaveAttribute(
      "src",
      "/profile-avatars/teco.webp",
    );
    await expect(cover.locator(".profile-frame-art").first()).toHaveAttribute(
      "src",
      "/profile-cosmetics/english.svg",
    );
    await expect(cover.locator(".profile-cover__art img")).toHaveAttribute(
      "src",
      "/profile-covers/english.svg",
    );
    await page.screenshot({
      path: info.outputPath(`english-cosmetics-${theme}.png`),
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await expect(cover).toHaveAttribute("data-profile-background", "english");
    await expect(avatar.locator("img").first()).toHaveAttribute(
      "src",
      "/profile-avatars/teco.webp",
    );
  });
}
