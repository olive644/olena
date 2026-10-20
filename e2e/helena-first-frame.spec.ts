import { expect, test } from "@playwright/test";

test("a primeira estrela é a arte do Rive, mesmo com carga lenta ou falha", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/helena-assistant/helena.riv?*", async (route) => {
    await gate;
    await route.abort();
  });
  await page.goto("/");
  const mascot = page.locator(".helena-virtual-mascot");
  const firstFrame = mascot.locator("img");
  await expect(firstFrame).toHaveAttribute("src", "/helena-assistant/star-rive.png");
  await expect(firstFrame).toBeVisible();
  await expect(mascot).toHaveAttribute("data-ready", "false");
  const imageBox = (await firstFrame.boundingBox())!;
  const canvasBox = (await mascot.locator("canvas").boundingBox())!;
  expect(imageBox).toEqual(canvasBox);
  await firstFrame.screenshot({ path: info.outputPath("estrela-primeiro-quadro.png") });
  release();
  await expect(firstFrame).toBeVisible();
  await page.getByRole("button", { name: "Conversar com Olena", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Olena", exact: true })).toBeVisible();
  await expect(firstFrame).toHaveAttribute("src", "/helena-assistant/helena-rive.png");
});
