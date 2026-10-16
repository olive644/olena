import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`edita ficha, reconhece redes e preserva dados ao cancelar: ${theme}`, async ({
    page,
  }, info) => {
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", appearance);
      if (!localStorage.getItem("helena.profile.v1"))
        localStorage.setItem(
          "helena.profile.v1",
          JSON.stringify({ name: "Guest", photoUrl: "/profile-avatars/oliver.webp" }),
        );
    }, theme);
    await page.goto("/perfil");
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    await expect(page.locator(".page-header__theme")).toHaveCount(0);
    await expect(page.getByText("Seu espaço, do seu jeito.", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Cada descoberta faz parte da sua história.", { exact: true }),
    ).toHaveCount(0);
    const connections = page.getByLabel("Conexões do perfil");
    await expect(connections).toHaveText("0 Seguidores0 Seguindo");
    await expect(connections.getByRole("button")).toHaveCount(0);
    const edit = page.getByRole("button", { name: "Editar perfil", exact: true });
    await edit.click();
    const dialog = page.getByRole("dialog", { name: "Editar perfil", exact: true });
    await expect(dialog.getByLabel("Apelido")).toHaveAttribute("readonly", "");
    await expect(dialog.getByLabel("Nome", { exact: true })).toBeDisabled();
    await dialog.getByLabel("Bio", { exact: true }).fill("Uma descoberta de cada vez.");
    await dialog.getByRole("button", { name: "Pronomes", exact: true }).click();
    await page.getByRole("option", { name: "Personalizado", exact: true }).click();
    await dialog.getByLabel("Pronomes personalizados").fill("ele/dela");
    const networks = ["instagram", "facebook", "linkedin", "github", "tiktok"];
    for (const [index, network] of networks.entries()) {
      if (index) await dialog.getByRole("button", { name: "Adicionar rede" }).click();
      await dialog
        .getByLabel(`Rede social ${index + 1}`, { exact: true })
        .fill(`${network}.com/oli`);
      await expect(
        dialog.locator(`img[src="/navigation-icons/paper/profile-${network}.svg"]`),
      ).toHaveJSProperty("complete", true);
    }
    await expect(dialog.getByRole("button", { name: "Adicionar rede" })).toBeDisabled();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await dialog.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(dialog.locator("#profile-username-label")).toHaveCSS(
      "color",
      await dialog.evaluate((element) => getComputedStyle(element).color),
    );
    await dialog.screenshot({
      path: info.outputPath(`editor-${theme}.png`),
      animations: "disabled",
    });
    await dialog.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    await expect(edit).toBeFocused();
    await expect(page.getByText("@oli_estuda", { exact: true })).toHaveCount(0);
    await expect(page.getByText("ele/dela", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "GitHub", exact: true })).toHaveAttribute(
      "href",
      "https://github.com/oli",
    );
    await page.screenshot({
      path: info.outputPath(`perfil-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.reload();
    await expect(page.getByText("Uma descoberta de cada vez.", { exact: true })).toBeVisible();
    await edit.click();
    await dialog.getByLabel("Bio", { exact: true }).fill("Não salvar");
    await dialog.getByLabel("Rede social 1", { exact: true }).fill("javascript:alert(1)");
    await dialog.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByText("Uma descoberta de cada vez.", { exact: true })).toBeVisible();
    await edit.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(edit).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await page.getByRole("button", { name: "Editar perfil", exact: true }).click();
    await expect(dialog.getByLabel("Nome", { exact: true })).toBeDisabled();
    await expect(dialog.getByLabel("Pronomes personalizados")).toHaveValue("ele/dela");
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}
