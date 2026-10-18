import { expect, test } from "@playwright/test";
test("sino abre página com atividades por padrão, novidades e retorno amarelo", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.route("**/system-updates.json", (route) =>
    route.fulfill({
      json: [
        { id: 408, version: "beta", title: "Aviso recente", date: new Date().toISOString() },
        {
          id: 30,
          version: "beta",
          title: "Aviso expirado",
          date: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ],
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Atualizações do sistema/ }).click();
  await expect(page).toHaveURL(/\/notificacoes$/);
  await expect(page.getByRole("heading", { name: "Notificações", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Atividades", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".system-update-sheet")).toHaveCount(0);
  await page.getByRole("button", { name: "Novidades", exact: true }).click();
  await expect(page.getByText("Aviso recente", { exact: true })).toBeVisible();
  await expect(page.getByText("Aviso expirado", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Marcar como lidas" }).click();
  await expect(page.getByRole("button", { name: "Marcar como lidas" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Atividades", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("notificacoes.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Voltar ao Espaço", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});
