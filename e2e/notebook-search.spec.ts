import { expect, test } from "@playwright/test";

test("a prateleira acomoda cinco cadernos e reabre o caderno escolhido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/cadernos");
  const create = page.getByRole("button", { name: "Crie", exact: true });
  for (let index = 1; index <= 5; index++) {
    await create.click();
    await page
      .getByRole("textbox", { name: "Nome", exact: true })
      .fill(`Caderno de teste ${index}`);
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  }
  await expect(create).toHaveCount(0);
  await expect(page.locator(".notebook-spine")).toHaveCount(5);
  await page.getByRole("button", { name: "Abrir Caderno de teste 3", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Caderno de teste 3" })).toBeVisible();
  await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  await expect(page.locator(".notebook-spine")).toHaveCount(5);
});
