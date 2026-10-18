import { expect, test } from "@playwright/test";
import { setTestTheme } from "./theme-setup";

test("room labels and CSS descriptions follow language after the room was already loaded", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/sala");
  await expect(page.locator(".local-room-activity").first()).toBeVisible();
  const mobile = page.viewportSize()!.width <= 760;
  await page
    .getByRole("navigation", { name: mobile ? "Navegação móvel" : "Navegação principal" })
    .getByRole("button", { name: "Perfil", exact: true })
    .click();
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await page.getByRole("button", { name: "Mudar idioma para inglês" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await page.goBack();
  await expect(page).toHaveURL(/\/sala$/);
  const card = page.locator(".local-room-activity").first();
  await expect(card).toContainText("Group listening");
  await expect
    .poll(() => card.evaluate((element) => getComputedStyle(element, "::after").content))
    .toContain("Play audio and receive answers in real time.");
});

test("bandeira troca interface inteira e volta sem recarregar", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/perfil");
  await page.evaluate(() => {
    document.body.dataset["languageTest"] = "same-document";
  });
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await page.getByRole("button", { name: "Mudar idioma para inglês" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  const menu = page.getByRole("navigation", { name: "Profile sections" });
  await expect(menu.getByRole("button", { name: "Account", exact: true })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Security", exact: true })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Talk to the team", exact: true })).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-language-test", "same-document");
  await expect(page.locator('[data-paper-icon="flag-us"]')).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("settings-english.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Switch language to Portuguese" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { name: "Configurações", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Seções do Perfil" })
      .getByRole("button", { name: "Conta", exact: true }),
  ).toBeVisible();
});

test("English persists across reload and primary navigation in both themes", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.language", "en-US");
  });
  await page.goto("/perfil");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  for (const theme of ["light", "dark"] as const) {
    await setTestTheme(page, theme);
    const mobile = page.viewportSize()!.width <= 760;
    const nav = page.getByRole("navigation", {
      name: mobile ? "Mobile navigation" : "Main navigation",
    });
    for (const name of ["Calendar", "Focus", "Practice", "Profile"]) {
      await nav.getByRole("button", { name, exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
      await expect(page.locator("main")).not.toContainText("Carregando");
      await expect(page.locator("body")).not.toContainText(/\[\d{3,4}\]/);
    }
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
});
