import { expect, test } from "@playwright/test";

test("orienta o primeiro passo da rota de estudo", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Dê um ponto de partida ao seu estudo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir Biblioteca" }).click();
  await expect(page.getByRole("heading", { name: "Novo material" })).toBeVisible();
});
