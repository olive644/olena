import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`amigos no Perfil mantém layout móvel e exige conta real: ${theme}`, async ({
    page,
  }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    const open = page.getByRole("button", { name: "Adicionar amigo", exact: true });
    await open.click();
    const dialog = page.getByRole("dialog", { name: "Encontre seus amigos", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Escolher nos contatos" })).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Compartilhar perfil", exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await dialog.screenshot({
      path: info.outputPath(`amigos-${theme}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
    await page.getByRole("button", { name: /0 Seguidores/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Encontre seus amigos", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Editar capa", exact: true }).click();
    const covers = page.getByRole("group", { name: "Temas de capa" });
    const ocean = covers.getByRole("button", { name: "Oceano", exact: true });
    const art = ocean.locator("img");
    // Mede as duas caixas no mesmo frame e aguarda a geometria estabilizar após abrir o diálogo.
    await expect
      .poll(() =>
        ocean.evaluate((button) =>
          Math.abs(
            button.getBoundingClientRect().width -
              button.querySelector("img")!.getBoundingClientRect().width,
          ),
        ),
      )
      .toBeLessThan(5);
    await expect(art).toBeVisible();
    await expect(ocean.locator("span")).toHaveCSS("position", "absolute");
    await page
      .getByRole("dialog", { name: "Capa do perfil" })
      .screenshot({ path: info.outputPath(`capas-${theme}.png`) });
  });
}
