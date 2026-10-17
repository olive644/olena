import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";
for (const theme of ["light", "dark"]) {
  test(`personagens exclusivos, capa fixa e streaks reais: ${theme}`, async ({ page }, info) => {
    const workspace = createInitialWorkspace();
    workspace.focusSessions = ["timer", "pomodoro"].map((mode, index) => ({
      id: String(index),
      subjectId: workspace.subjects[0]!.id,
      durationMinutes: 25,
      mode: mode as "timer" | "pomodoro",
      completedAt: new Date().toISOString(),
    }));
    workspace.practiceActivities = [
      {
        id: "math",
        islandId: "mathematics:fundamental",
        islandName: "Matemática",
        completedAt: new Date().toISOString(),
        answers: 4,
        correct: 2,
      },
    ];
    await page.addInitScript(
      ({ theme, workspace }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", theme);
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        if (!localStorage.getItem("helena.profile.v1"))
          localStorage.setItem(
            "helena.profile.v1",
            JSON.stringify({
              name: "Guest",
              username: "oli",
              bio: "Uma descoberta de cada vez.",
              photoUrl: "/profile-avatars/oliver.webp",
            }),
          );
      },
      { theme, workspace },
    );
    await page.goto("/perfil");
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Editar capa" })).toBeVisible();
    const connections = page.getByLabel("Sequências de estudo");
    for (const name of ["Pomodoro", "Cronômetro", "Ilhas"])
      await expect(connections.getByLabel(`${name}: 1 dia seguido`)).toBeVisible();
    await expect(connections.locator(".agenda-week-flower.is-active")).toBeVisible();
    await expect(connections.locator('img[src="/math-islands/flame.svg"]')).toBeVisible();
    const name = await page.locator(".profile-cover__name").boundingBox();
    const edit = await page
      .getByRole("button", { name: "Editar perfil", exact: true })
      .boundingBox();
    expect(edit!.x).toBeGreaterThan(name!.x + name!.width);
    expect(Math.abs(edit!.y + edit!.height / 2 - name!.y - name!.height / 2)).toBeLessThan(2);
    const avatar = page.getByRole("button", { name: "Abrir foto do perfil" });
    await avatar.click();
    const dialog = page.getByRole("dialog", { name: "Avatar do perfil", exact: true });
    const transparent = await dialog
      .locator(".profile-picker__options img")
      .evaluateAll(async (images) => {
        return Promise.all(
          images.map(async (element) => {
            const image = element as HTMLImageElement;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 32;
            const context = canvas.getContext("2d")!;
            context.drawImage(image, 0, 0, 32, 32);
            const pixels = context.getImageData(0, 0, 32, 32).data;
            return pixels[3] === 0 && pixels[(32 * 32 - 1) * 4 + 3] === 0;
          }),
        );
      });
    expect(transparent).toHaveLength(16);
    expect(transparent.every(Boolean)).toBe(true);
    await expect(dialog.locator('input[type="file"]')).toHaveCount(0);
    await dialog.getByRole("button", { name: "Jairo", exact: true }).click();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(avatar).toBeFocused();
    await expect(avatar.locator("img")).toHaveAttribute("src", "/profile-avatars/oliver.webp");
    await avatar.click();
    await dialog.getByRole("button", { name: "Jairo", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Jairo", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await dialog.screenshot({
      path: info.outputPath(`avatares-${theme}.png`),
      animations: "disabled",
    });
    await dialog.getByRole("button", { name: "Usar personagem", exact: true }).click();
    await expect(avatar.locator("img")).toHaveAttribute("src", "/profile-avatars/jairo.webp");
    await page.reload();
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    await expect(avatar.locator("img")).toHaveAttribute("src", "/profile-avatars/jairo.webp");
    await page.screenshot({ path: info.outputPath(`perfil-${theme}.png`), animations: "disabled" });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator(".profile-chrome")).toHaveAttribute("data-compact", "true");
    const compactName = await page.locator(".profile-cover__name").boundingBox();
    const mobile = (page.viewportSize()?.width ?? 1280) <= 600;
    if (mobile) await expect(page.locator(".profile-cover__handle")).toBeHidden();
    else {
      const handle = await page.locator(".profile-cover__handle").boundingBox();
      expect(handle!.y).toBeGreaterThan(compactName!.y + compactName!.height);
    }
    await expect(page.locator(".profile-cover__portrait")).toHaveCSS("border-width", "0px");
    await expect(page.locator(".profile-cover__portrait")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    if (mobile) {
      expect((await avatar.boundingBox())!.width).toBe(112);
      await expect(page.locator(".profile-toolbar")).toHaveCSS("position", "sticky");
    } else expect((await page.locator(".profile-chrome").boundingBox())!.height).toBe(88);
    await page.screenshot({ path: info.outputPath(`barra-${theme}.png`), animations: "disabled" });
    await avatar.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
