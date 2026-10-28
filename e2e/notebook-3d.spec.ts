import { expect, test, type Page } from "@playwright/test";

// O caderno 3D é o padrão do app. A configuração global das outras suítes o desliga
// para testar a vitrine 2D; aqui ele volta ao padrão.
test.use({ launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } });

async function openNewNotebook(page: Page, mobile: boolean, enabled = true) {
  await page.addInitScript((value) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    if (value) localStorage.removeItem("olena:accessibility:v1");
    else localStorage.setItem("olena:accessibility:v1", JSON.stringify({ notebook3d: false }));
  }, enabled);
  await page.goto("/");
  if (mobile) {
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
}

/** O "+" mora na bandeja de ferramentas: abre a bandeja (se estiver fechada) e cria a folha. */
async function createViaTray(page: Page, first: boolean) {
  const show = page.getByRole("button", { name: "Mostrar ferramentas do caderno" });
  if (await show.count()) await show.click();
  await page
    .getByRole("button", { name: first ? "Criar primeira folha" : "Criar nova folha" })
    .last()
    .click();
}

test("caderno em 3D abre a capa, cria folhas e volta da folha 2D", async ({ page }, info) => {
  test.slow();
  await openNewNotebook(page, info.project.name === "mobile");
  const scene = page.locator("[data-notebook-3d] .notebook-3d__canvas");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  // Parada, a cena não desenha quadros: sem gasto de CPU, GPU nem bateria.
  const frames = () =>
    scene.evaluate(
      (canvas) => (canvas as unknown as { nb3dStats: () => { frames: number } }).nb3dStats().frames,
    );
  await expect
    .poll(
      async () => {
        const before = await frames();
        await page.waitForTimeout(1200);
        return (await frames()) - before;
      },
      { timeout: 40_000 },
    )
    .toBe(0);
  const bounds = await scene.boundingBox();
  expect(bounds!.width).toBeGreaterThan(250);
  expect(bounds!.height).toBeGreaterThan(250);
  await expect(page.getByRole("button", { name: "Personalizar", exact: true })).toHaveCount(0);
  await expect(page.locator(".notebook-cover-inventory")).toHaveCount(0);
  // As ferramentas e o "+" ficam atrás da seta de baixo e só têm ícone, sem texto. Sem folhas a
  // bandeja já abre, para a pessoa ver onde criar a primeira.
  const toolbar = page.getByRole("toolbar", { name: "Ferramentas do caderno" });
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole("button")).toHaveCount(5);
  for (const tool of await toolbar.getByRole("button").all())
    await expect(tool.locator("span:not(.paper-tab-icon)")).toBeHidden();
  // A seta amarela de voltar fica no canto esquerdo, não no meio da tela.
  const back = await page.getByRole("button", { name: "Meus Cadernos", exact: true }).boundingBox();
  const area = await scene.boundingBox();
  expect(back!.x).toBeLessThan(area!.x + area!.width * 0.25);
  // O nome do caderno já está na capa: o título da tela fica só para leitores de tela.
  await expect(page.getByRole("heading", { level: 1, name: "Meu caderno" })).toHaveClass(
    /visually-hidden/,
  );

  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  for (let created = 0; created < 3; created++) {
    await createViaTray(page, created === 0);
    await expect(editor).toBeVisible({ timeout: 20_000 });
    await editor.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  }
  await expect(page.getByText("3 folhas guardadas")).toBeVisible();
  // Com folhas, a bandeja começa fechada e a seta a abre e fecha.
  await expect(toolbar).toBeHidden();
  await page.getByRole("button", { name: "Mostrar ferramentas do caderno" }).click();
  await expect(toolbar).toBeVisible();
  await page.getByRole("button", { name: "Esconder ferramentas do caderno" }).click();
  await expect(toolbar).toBeHidden();

  // Capa e contracapa ficam nas setas de papel, com nomes para teclado e leitor de tela.
  await page.getByRole("button", { name: "Contracapa ›" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Contracapa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "‹ Última folha" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Folhas \d/)).toBeVisible();

  // Índice: folheia até a folha escolhida e entra nela com o editor 2D de sempre.
  await page.getByRole("button", { name: "Mostrar ferramentas do caderno" }).click();
  await page.getByRole("button", { name: "Índice de folhas", exact: true }).click();
  const index = page.getByRole("dialog", { name: "Índice de folhas" });
  await index
    .getByRole("button", { name: /Nova folha/ })
    .nth(2)
    .click();
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
});

test("sem o caderno 3D ligado, o caderno continua na vitrine 2D", async ({ page }, info) => {
  await openNewNotebook(page, info.project.name === "mobile", false);
  await expect(page.getByRole("region", { name: "Preview do caderno" })).toBeVisible();
  await expect(page.locator("[data-notebook-3d]")).toHaveCount(0);
  await expect(
    page.locator(".notebook-paper-spread, .notebook-concept-cover").first(),
  ).toBeVisible();
});

test("pôr marca mostra onde ela cai, a edição destaca a escolhida e a estante recebe o caderno fechado", async ({
  page,
}, info) => {
  test.slow();
  test.skip(info.project.name === "mobile", "passar o ponteiro por cima só existe no PC");
  await openNewNotebook(page, false);
  const scene = page.locator("[data-notebook-3d] .notebook-3d__canvas");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  for (let created = 0; created < 2; created++) {
    await createViaTray(page, created === 0);
    await expect(editor).toBeVisible({ timeout: 20_000 });
    await editor.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  }
  const project = (x: number, z: number) =>
    scene.evaluate(
      (canvas, point) =>
        (
          canvas as unknown as {
            nb3dProject: (x: number, y: number, z: number) => { x: number; y: number };
          }
        ).nb3dProject(point[0]!, 0.2, point[1]!),
      [x, z],
    );
  const hint = page.locator(".notebook-3d__peek");
  // Folha: o ponteiro mostra que o toque abre aquela folha.
  const middle = await project(1.3, 0);
  await page.mouse.move(middle.x, middle.y);
  await expect(hint).toContainText("Abrir folha 2");
  await page.getByRole("button", { name: "Mostrar ferramentas do caderno" }).click();
  // Divisória: no meio da folha não pode; na borda direita, o fantasma e a dica confirmam.
  await page.getByRole("button", { name: "Colocar divisória" }).click();
  await page.mouse.move(middle.x - 5, middle.y);
  await expect(hint).toHaveClass(/is-warn/);
  const edge = await project(2.8, 0.4);
  await page.mouse.move(edge.x, edge.y);
  await expect(hint).toContainText("Pôr aqui · folha 2");
  await expect(hint).not.toHaveClass(/is-warn/);
  await page.mouse.click(edge.x, edge.y);
  await expect(page.getByRole("button", { name: /^Divisória .*folha 2/ })).toHaveCount(1);
  // Edição: apontar a marca diz qual é; tocar abre o painel para renomear ou remover.
  await page.getByRole("button", { name: "Editar marcas" }).click();
  const tab = await project(3.3, 0.45);
  await page.mouse.move(tab.x, tab.y);
  await expect(hint).toContainText("Editar marca");
  await page.mouse.click(tab.x, tab.y);
  await expect(page.getByRole("button", { name: "Remover marcação" })).toBeVisible();
  await page.getByRole("button", { name: "Remover marcação" }).click();
  await expect(page.getByRole("button", { name: /^Divisória .*folha 2/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  // Voltar: o caderno fecha na capa e só então a capa viaja até a estante.
  await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  await expect(page.getByText("Capa fechada")).toBeVisible();
  await expect(page.locator(".notebook-journey")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".notebook-journey")).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator("[data-notebook-3d]")).toHaveCount(0);
});
