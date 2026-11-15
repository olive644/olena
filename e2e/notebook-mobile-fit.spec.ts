import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Layout específico do celular.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
});

// Telas estreitas e fonte maior alargam os textos da barra de baixo do editor. Antes, o "+" de
// chamar amigos e o X de sair da folha caíam para uma segunda linha escondida fora da tela.
for (const width of [411, 360, 320]) {
  test(`barra de baixo do editor mantém o + e o X na tela com ${width}px e fonte maior`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/cadernos");
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    await page.locator(".notebook-spine").first().click();
    await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
    await expect(editor).toBeVisible();
    await page.addStyleTag({ content: ".notebook-mobile-dock button{font-size:17px !important}" });
    for (const name of ["Compartilhar caderno", "Fechar"]) {
      const button = editor.getByRole("button", { name, exact: true });
      await expect(button).toBeVisible();
      await expect
        .poll(async () => {
          const box = (await button.boundingBox())!;
          return box.x >= 0 && box.x + box.width <= width && box.y + box.height <= 800;
        })
        .toBe(true);
    }
  });
}

// A hera ocupa as laterais da prateleira: os cadernos não podem ficar por baixo das folhas.
test("na prateleira do celular o primeiro caderno começa depois da hera", async ({ page }) => {
  await page.setViewportSize({ width: 411, height: 891 });
  await page.goto("/cadernos");
  // Com poucos cadernos a fileira fica centralizada; com três eles chegam perto da hera.
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    const achievement = page.getByRole("button", { name: "Fechar conquista" });
    while (await achievement.first().isVisible()) await achievement.first().click();
    const back = page.getByRole("button", { name: "Meus Cadernos", exact: true });
    if (await back.isVisible()) await back.click();
  }
  await expect(page.locator(".notebook-display-shelf .notebook-spine")).toHaveCount(3);
  const [vineRight, firstBookLeft] = await page.evaluate(() => [
    document.querySelector(".notebook-shelf-vines.is-left")!.getBoundingClientRect().right,
    document.querySelector(".notebook-display-shelf .notebook-spine")!.getBoundingClientRect().left,
  ]);
  expect(firstBookLeft).toBeGreaterThanOrEqual(vineRight);
});
