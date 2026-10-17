import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`cinco capas e Perfil compacto sem espaços artificiais: ${theme}`, async ({
    page,
  }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
      if (!localStorage.getItem("helena.profile.v1"))
        localStorage.setItem(
          "helena.profile.v1",
          JSON.stringify({
            bio: "Aprendendo um pouco a cada dia.",
            socialLinks: ["https://github.com/oli"],
          }),
        );
    }, theme);
    await page.goto("/perfil");
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    const mobile = page.viewportSize()!.width <= 600;
    if (mobile) {
      const card = await page.locator(".profile-cover").boundingBox();
      expect(card!.height).toBeLessThan(520);
      expect((await page.locator(".profile-cover__portrait").boundingBox())!.width).toBe(112);
    }
    await expect(page.getByRole("button", { name: "Editar perfil", exact: true })).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    const editCover = page.getByRole("button", { name: "Editar capa", exact: true });
    await expect(editCover).toHaveText("");
    await expect(editCover).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(editCover).toHaveCSS("box-shadow", "none");
    await editCover.click();
    const dialog = page.getByRole("dialog", { name: "Capa do perfil", exact: true });
    await expect(dialog.getByRole("group").getByRole("button")).toHaveCount(5);
    for (const name of ["Noite da Helena", "Eclipse Solar", "Aurora", "Bosque", "Oceano"]) {
      await dialog.getByRole("button", { name, exact: true }).click();
      await expect(dialog.locator(".profile-cover-preview img")).toHaveJSProperty(
        "naturalWidth",
        1200,
      );
      await expect(dialog.getByRole("button", { name, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    await dialog.screenshot({
      path: info.outputPath(`capas-${theme}.png`),
      animations: "disabled",
    });
    await dialog.getByRole("button", { name: "Usar capa" }).click();
    await expect(page.locator(".profile-cover__art img")).toHaveAttribute("data-cover", "ocean");
    await page.reload();
    await expect(page.locator(".profile-cover__art img")).toHaveAttribute("data-cover", "ocean");
    await expect(page.getByLabel("Conexões do perfil")).toContainText("0 Seguidores0 Seguindo");
    await page.screenshot({ path: info.outputPath(`perfil-${theme}.png`), animations: "disabled" });
    await page.getByRole("button", { name: "Editar perfil", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Editar perfil", exact: true });
    await expect(editor.getByLabel("Nome", { exact: true })).toHaveAttribute("readonly", "");
    await expect(editor.getByLabel("Nome de usuário", { exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    if (mobile) {
      await page.evaluate(() => window.scrollTo(0, 350));
      const header = page.locator(".profile-toolbar .page-header");
      expect((await header.boundingBox())!.y).toBeCloseTo(0, 0);
      await expect(page.getByRole("button", { name: "Configurações", exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
