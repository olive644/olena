import { expect, test } from "@playwright/test";
import { setTestTheme } from "./theme-setup";

test("novos avatares preservam transparência e seleção nos dois temas", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  const profileMenu = page.locator(".profile-avatar-options");
  const avatars = [
    "Alice",
    "Soso Estrelinha",
    "Nicolas",
    "Guilherme",
    "Erick",
    "Miau",
    "Luizão",
    "Leo",
  ];
  for (const theme of ["Claro", "Escuro"]) {
    await setTestTheme(page, theme === "Claro" ? "light" : "dark");
    await profileMenu.locator("summary").click();
    for (const name of avatars) {
      const option = profileMenu
        .locator(".profile-picker")
        .getByRole("button", { name, exact: true });
      await option.scrollIntoViewIfNeeded();
      await expect(option).toBeVisible();
      const pixels = await option.locator("img").evaluate(async (image: HTMLImageElement) => {
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 512;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0, 512, 512);
        return {
          width: image.naturalWidth,
          height: image.naturalHeight,
          corners: [
            [0, 0],
            [511, 0],
            [0, 511],
            [511, 511],
          ].map(([x, y]) => context.getImageData(x!, y!, 1, 1).data[3]),
          center: context.getImageData(256, 256, 1, 1).data[3],
        };
      });
      expect(pixels).toMatchObject({ width: 512, height: 512, corners: [0, 0, 0, 0] });
      expect(pixels.center).toBeGreaterThanOrEqual(250);
    }
    await profileMenu.locator(".profile-picker").evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({ path: testInfo.outputPath(`avatares-${theme}.png`) });
    await profileMenu.getByRole("button", { name: "Leo", exact: true }).click();
    await expect(page.getByAltText("Avatar atual")).toHaveAttribute(
      "src",
      "/profile-avatars/leo.svg",
    );
    await page.reload();
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await expect(page.getByAltText("Avatar atual")).toHaveAttribute(
      "src",
      "/profile-avatars/leo.svg",
    );
  }
});
