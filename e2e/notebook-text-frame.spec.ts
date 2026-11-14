import { expect, test } from "@playwright/test";

test("a caixa de texto move e mantém a posição ao trocar de folha", async ({ page }, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await editor.getByRole("button", { name: "Texto na página inteira" }).click();
  const frame = editor.locator(".handwriting-sticky--text").first();
  const text = frame.locator("textarea");
  await expect(frame).toBeVisible();
  const before = (await frame.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 35, before.y + before.height / 2 + 25, {
    steps: 8,
  });
  await page.mouse.up();
  const moved = (await frame.boundingBox())!;
  expect(moved.x).toBeGreaterThan(before.x + 20);
  expect(moved.y).toBeGreaterThan(before.y + 10);
  await page.mouse.click(moved.x + moved.width / 2, moved.y + moved.height / 2);
  await expect(text).not.toHaveAttribute("readonly");
  await text.fill("Texto que acompanha a caixa");
  const position = () => frame.evaluate(({ style }) => [style.left, style.top]);
  const savedPosition = await position();
  await editor.getByRole("button", { name: "Criar próxima folha" }).click();
  await expect(frame).toHaveCount(0);
  await editor.getByRole("button", { name: "Folha anterior" }).click();
  await expect(text).toHaveValue("Texto que acompanha a caixa");
  await expect.poll(position).toEqual(savedPosition);
});
