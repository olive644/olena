import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Layout específico do celular.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
});

// O "+" de chamar amigos e o X de sair da folha ficam na barra de cima, junto das ferramentas de
// arquivo (configurações, upload, compartilhar e salvar). Em telas estreitas os seis botões encolhem
// e continuam na tela, sem passar por cima dos dois papéis à esquerda.
for (const width of [411, 360, 320]) {
  test(`barra de cima do editor tem ferramentas, + e X na tela com ${width}px`, async ({
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
    const names = [
      "Configurações do editor",
      "Upload",
      "Compartilhar",
      "Salvar caderno",
      "Compartilhar caderno",
      "Fechar",
    ];
    for (const name of names)
      await expect(editor.getByRole("button", { name, exact: true })).toBeVisible();
    await expect
      .poll(async () => {
        const boxes = [];
        for (const name of names)
          boxes.push((await editor.getByRole("button", { name, exact: true }).boundingBox())!);
        const inTopBar = boxes.every((box) => box.y >= 0 && box.y + box.height <= 62);
        const insideScreen = boxes.every((box) => box.x >= 0 && box.x + box.width <= width);
        // Os papéis ocupam os 116px da esquerda: nenhuma ferramenta pode invadi-los.
        const clearOfPapers = boxes.every((box) => box.x >= 116);
        // A bolinha do "+" fica na mesma linha do X e das ferramentas (centros a até 2px).
        const centers = boxes.map((box) => box.y + box.height / 2);
        const aligned = Math.max(...centers) - Math.min(...centers) <= 2;
        return inTopBar && insideScreen && clearOfPapers && aligned;
      })
      .toBe(true);
  });
}

// Telas estreitas e fonte maior alargam os textos "Opções" e "Histórico e zoom" da barra de baixo:
// eles encurtam em vez de quebrar a linha e empurrar botões para fora da tela.
test("barra de baixo do editor não passa da largura da tela com fonte maior", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Escrever à mão", exact: true })).toBeVisible();
  await page.addStyleTag({ content: ".notebook-mobile-dock button{font-size:17px !important}" });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const dock = document.querySelector(".notebook-mobile-dock")!.getBoundingClientRect();
        return dock.right <= window.innerWidth + 1 && dock.bottom <= window.innerHeight + 1;
      }),
    )
    .toBe(true);
});

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
