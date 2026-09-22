import { expect, test } from "@playwright/test";

test("novos avatares preservam transparência e seleção nos dois temas", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  const avatars = ["Alice", "Soso Estrelinha", "Nicolas", "Guilherme", "Erick", "Miau", "Luizão"];
  for (const theme of ["Claro", "Escuro"]) {
    await page.getByLabel(/Aparência: tema/).click();
    await page.getByRole("button", { name: theme, exact: true }).click();
    await page.locator(".profile-menu summary").click();
    for (const name of avatars) {
      const option = page.locator(".profile-picker").getByRole("button", { name, exact: true });
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
      expect(pixels).toEqual({ width: 512, height: 512, corners: [0, 0, 0, 0], center: 255 });
    }
    await page.locator(".profile-picker").evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({ path: testInfo.outputPath(`avatares-${theme}.png`) });
    await page.getByRole("button", { name: "Soso Estrelinha", exact: true }).click();
    await expect(page.locator(".profile-menu summary")).toHaveAttribute(
      "aria-label",
      "Perfil de Soso Estrelinha",
    );
    await expect(page.locator(".user-profile img")).toHaveAttribute(
      "src",
      "/profile-avatars/soso-estrelinha.svg",
    );
    await page.reload();
    await expect(page.locator(".profile-menu summary")).toHaveAttribute(
      "aria-label",
      "Perfil de Soso Estrelinha",
    );
  }
});
