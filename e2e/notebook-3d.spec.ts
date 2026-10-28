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
  const toolbar = page.getByRole("toolbar", { name: "Ferramentas do caderno" });
  await expect(toolbar.getByRole("button")).toHaveCount(4);

  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  for (let created = 0; created < 3; created++) {
    await page
      .getByRole("button", { name: created ? "Criar nova folha" : "Criar primeira folha" })
      .last()
      .click();
    await expect(editor).toBeVisible({ timeout: 20_000 });
    await editor.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  }
  await expect(page.getByText("3 folhas guardadas")).toBeVisible();

  // Capa e contracapa ficam nas setas de papel, com nomes para teclado e leitor de tela.
  await page.getByRole("button", { name: "Contracapa ›" }).click();
  await expect(page.getByText("Contracapa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "‹ Última folha" }).click();
  await expect(page.getByText(/Folhas \d/)).toBeVisible();

  // Índice: folheia até a folha escolhida e entra nela com o editor 2D de sempre.
  await page.getByRole("button", { name: "Índice de folhas", exact: true }).click();
  const index = page.getByRole("dialog", { name: "Índice de folhas" });
  await index
    .getByRole("button", { name: /Nova folha/ })
    .nth(2)
    .click();
  await expect(editor).toBeVisible({ timeout: 15_000 });
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
