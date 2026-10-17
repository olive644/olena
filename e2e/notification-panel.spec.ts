import { expect, test } from "@playwright/test";

test("sino fora do Perfil, avisos de 48 horas e leitura sempre visível", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.route("**/system-updates.json", (route) =>
    route.fulfill({
      json: [
        ...Array.from({ length: 20 }, (_, index) => ({
          id: index + 1,
          version: "beta",
          title: `Aviso ${index}`,
          date: new Date().toISOString(),
        })),
        {
          id: 30,
          version: "beta",
          title: "Aviso expirado",
          date: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ],
    }),
  );
  await page.goto("/foco");
  const bell = page.getByLabel("Atualizações do sistema, 20 não lidas", { exact: true });
  await bell.click();
  const panel = page.getByRole("region", { name: "Notificações de atualização" });
  await expect(panel.getByText("Aviso expirado", { exact: true })).toHaveCount(0);
  const read = panel.getByRole("button", { name: "Marcar como lidas" });
  await expect(read).toBeVisible();
  const before = await read.boundingBox();
  await panel.locator(".system-update-list").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect((await read.boundingBox())!.y).toBeCloseTo(before!.y, 0);
  await read.click();
  await expect(read).toBeDisabled();
  await page.goto("/perfil");
  await expect(page.locator("main")).toHaveCSS("opacity", "1");
  await expect(page.locator(".system-updates")).toHaveCount(0);
});
