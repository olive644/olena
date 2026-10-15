import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

for (const theme of ["light", "dark"]) {
  test(`capa do Perfil se recolhe e preserva identidade e controles: ${theme}`, async ({
    page,
  }, info) => {
    const workspace = createInitialWorkspace();
    workspace.focusSessions = Array.from({ length: 5 }, (_, index) => ({
      id: `session-${index}`,
      subjectId: workspace.subjects[0]!.id,
      durationMinutes: 25,
      completedAt: `2026-10-${15 - index}T12:00:00Z`,
    }));
    await page.addInitScript(
      ({ seed, appearance }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(seed));
        localStorage.setItem(
          "helena.profile.v1",
          JSON.stringify({
            name: "Andreyna de Oliveira",
            photoUrl: "/profile-avatars/andreyna.webp",
          }),
        );
        localStorage.setItem("helenastudy.theme", appearance);
      },
      { seed: workspace, appearance: theme },
    );
    await page.goto("/perfil");
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const chrome = page.locator(".profile-chrome");
    const avatar = page.getByRole("img", { name: "Sua foto de perfil" });
    await expect(avatar).toHaveAttribute("src", "/profile-avatars/andreyna.webp");
    await expect(page.locator(".profile-cover__name")).toHaveText("Guest");
    await expect(page.locator(".profile-cover__art")).toHaveJSProperty("naturalWidth", 1800);
    await expect(
      page.getByRole("heading", { name: "O estudo que você já construiu" }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`profile-expanded-${theme}.png`),
      fullPage: true,
    });
    await page.evaluate(() => window.scrollTo(0, 540));
    await expect(chrome).toHaveAttribute("data-compact", "true");
    await expect(chrome.locator(".page-header")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect.poll(async () => (await chrome.boundingBox())?.y).toBeCloseTo(0, 0);
    const photoBox = await avatar.boundingBox();
    expect(photoBox!.width).toBeCloseTo(44, 0);
    const nameBox = await page.locator(".profile-cover__name").boundingBox();
    const gearBox = await page
      .getByRole("button", { name: "Configurações", exact: true })
      .boundingBox();
    expect(nameBox!.x + nameBox!.width).toBeLessThan(gearBox!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`profile-compact-${theme}.png`) });
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Seções do Perfil" })).toBeVisible();
    await page.getByRole("button", { name: "Fechar configurações" }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(chrome).toHaveAttribute("data-compact", "false");
    await expect.poll(async () => (await avatar.boundingBox())?.width).toBeCloseTo(112, 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo(0, 540));
    await expect(chrome).toHaveCSS("--profile-collapse", "1");
    await expect(page.locator(".profile-cover__spark").first()).toHaveCSS("animation-name", "none");
  });
}

test("perfil vazio também se recolhe em tela alta e respeita movimento reduzido do app", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  const workspace = createInitialWorkspace();
  workspace.focusSessions = [];
  await page.addInitScript((seed) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(seed));
    localStorage.setItem("olena:accessibility:v1", JSON.stringify({ reduceMotion: true }));
  }, workspace);
  await page.goto("/perfil");
  await expect(page.locator("main")).toHaveCSS("opacity", "1");
  await expect(page.getByText(/As sessões concluídas vão aparecer aqui/)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator(".profile-chrome")).toHaveAttribute("data-compact", "true");
  await expect(page.locator(".profile-chrome")).toHaveCSS("--profile-collapse", "1");
  await expect(page.locator(".profile-cover__spark").first()).toHaveCSS("animation-name", "none");
  for (const width of [320, 820]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator(".profile-chrome")).toHaveAttribute("data-compact", "true");
    await expect
      .poll(async () => {
        const menu = await page.getByRole("button", { name: "Mais ferramentas" }).boundingBox();
        const avatar = await page.getByRole("img", { name: "Sua foto de perfil" }).boundingBox();
        return avatar!.x - menu!.x - menu!.width;
      })
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
