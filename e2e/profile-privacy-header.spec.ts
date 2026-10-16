import { expect, test } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });

for (const theme of ["light", "dark"]) {
  test(`entrada, privacidade e cabeçalho no tema ${theme}`, async ({ page }, info) => {
    await page.addInitScript((value) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", value);
    }, theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const notice = page.getByRole("region", { name: "Privacidade no OlenaStudy" });
    await expect(notice).toBeVisible();
    await expect(page.getByLabel(/Atualizações do sistema/)).toBeVisible();
    await expect(page.locator(".page-header .profile-menu")).toHaveCount(0);
    await notice.getByRole("button", { name: "Ver detalhes" }).click();
    await expect(notice.getByText(/Este aviso não ativa nenhum deles/)).toBeVisible();
    await expect(notice.getByRole("checkbox")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await notice.screenshot({
      path: info.outputPath(`privacidade-${theme}.png`),
      animations: "disabled",
    });
    await notice.getByRole("button", { name: "Entendi" }).click();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Espaço do aluno" })).toBeVisible();
    await expect(notice).toHaveCount(0);
    const navigation = page.getByRole("navigation", {
      name: info.project.name === "desktop" ? "Navegação principal" : "Navegação móvel",
    });
    for (const tab of ["Agenda", "Foco", "Perfil"]) {
      await navigation.getByRole("button", { name: tab, exact: true }).click();
      await expect(page.locator(".page-header__theme")).toHaveCount(0);
      await expect(page.getByLabel(/Atualizações do sistema/)).toHaveCount(0);
      await expect(page.locator(".page-header .profile-menu")).toHaveCount(0);
    }
    const toggle = page.getByRole("button", { name: "Configurações", exact: true });
    await expect(toggle).toHaveText("");
    await expect(toggle).toHaveCSS("background-color", "rgb(255, 249, 239)");
    const settingsBox = (await toggle.boundingBox())!;
    expect(settingsBox.x + settingsBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expect(page.getByRole("navigation", { name: "Seções do Perfil" })).toHaveCount(0);
    await toggle.click();
    await page.getByRole("button", { name: "Privacidade e dados", exact: true }).click();
    await expect(notice).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`configuracoes-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Fechar configurações" }).click();
    await expect(toggle).toBeFocused();
    await expect(page.getByRole("navigation", { name: "Seções do Perfil" })).toHaveCount(0);
    await expect(page.locator(".helena-virtual-mascot > img")).toHaveAttribute(
      "src",
      "/helena-assistant/star-rive.png",
    );
  });
}
