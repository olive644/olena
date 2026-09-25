import { expect, test, type Page } from "@playwright/test";

test("carrega os ícones de papel no desktop e mobile em ambos os temas", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  const navigation = page.getByRole("navigation", {
    name: mobile ? "Navegação móvel" : "Navegação principal",
  });
  for (const theme of ["light", "dark"]) {
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const icons = navigation.locator(".navigation-icon__variant:visible");
    expect(await icons.count()).toBeGreaterThan(0);
    for (const icon of await icons.all()) {
      await expect(icon).toHaveAttribute("src", /\/navigation-icons\/paper\/.*\.svg$/);
      await expect
        .poll(() =>
          icon.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
    }
    if (mobile) {
      await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
      const menu = page.getByRole("dialog", { name: "Mais ferramentas" });
      const secondary = menu.locator(".navigation-icon__variant:visible");
      await expect(secondary).toHaveCount(5);
      for (const icon of await secondary.all()) {
        await expect(icon).toHaveAttribute("src", /\/navigation-icons\/paper\/.*\.svg$/);
        await expect
          .poll(() =>
            icon.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
          )
          .toBe(true);
      }
      await menu.getByRole("button", { name: "Fechar menu" }).click();
    }
    if (theme === "light") {
      await page.locator(".page-header__theme .appearance-picker__trigger").click();
      await page.getByRole("button", { name: "Escuro", exact: true }).click();
    }
  }
  await page.screenshot({ path: testInfo.outputPath("paper-icons.png"), fullPage: true });
});

function studentSpaceButton(page: Page, projectName: string) {
  const mobile = projectName === "mobile";
  const navigation = page.getByRole("navigation", {
    name: mobile ? "Navegação móvel" : "Navegação principal",
  });

  return navigation.getByRole("button", {
    name: mobile ? "Espaço" : "Espaço do aluno",
    exact: true,
  });
}

async function navigateToTool(
  page: Page,
  projectName: string,
  desktopLabel: string,
  mobileLabel: string,
) {
  if (projectName === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: mobileLabel, exact: true })
      .click();
    return;
  }

  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name: desktopLabel, exact: true })
    .click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
});

test("usa o ícone grafite original em Começar prática", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    const action = page.getByRole("button", { name: "Começar prática", exact: true });
    await expect(
      action.locator('[data-icon="learn"] .navigation-icon__variant--claro'),
    ).toBeVisible();
    await expect(
      action.locator('[data-icon="learn"] .navigation-icon__variant--escuro'),
    ).toBeHidden();

    if (theme === "light") {
      await page.locator(".page-header__theme .appearance-picker__trigger").click();
      await page.getByRole("button", { name: "Escuro", exact: true }).click();
    }
  }
});

test("explora mundos com a Helena e abre a trilha de níveis", async ({ page }, testInfo) => {
  await page
    .getByRole("navigation", {
      name: testInfo.project.name === "mobile" ? "Navegação móvel" : "Navegação principal",
    })
    .getByRole("button", { name: "Praticar", exact: true })
    .click();
  await page.getByRole("button", { name: "Próximo mundo" }).click();
  await expect(page.locator(".solo-island-art")).toHaveCount(1);
  await expect(page.locator(".solo-island-art")).toHaveAttribute("src", "/solo-world-2.webp");
  await expect(page.locator(".solo-traveler")).toHaveClass(/solo-traveler--2/);
  await expect(page.getByText("Mundo bloqueado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mundo anterior" }).click();
  await expect(page.locator(".solo-traveler__jump img")).toHaveCSS(
    "transform",
    "matrix(-1, 0, 0, 1, 0, 0)",
  );
  await page.getByRole("button", { name: "Entrar no mundo", exact: true }).click();
  await expect(page.locator("body")).toHaveClass(/solo-world-open/);
  await expect(page.locator(".solo-level-path")).toHaveClass(/solo-level-path--world-1/);
  await expect(page.getByRole("button", { name: /Nível 1: Escuta/ })).toBeEnabled();
  await expect(
    page.getByRole("button", { name: /Nível 1: Escuta/ }).getByAltText("Helena no nível 1"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Nível 2: Flashcards/ })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".solo-level-path")).toHaveCSS("animation-name", "none");
});

test("troca os modos de foco pelas setas laterais", async ({ page }, testInfo) => {
  const navigation = page.getByRole("navigation", {
    name: testInfo.project.name === "mobile" ? "Navegação móvel" : "Navegação principal",
  });
  await navigation.getByRole("button", { name: "Foco", exact: true }).click();

  await expect(page.getByText("Cronômetro", { exact: true })).toBeVisible();
  await expect(page.locator(".focus-layout > .focus-card")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await page.getByRole("button", { name: "Próximo modo" }).click();
  await expect(page.getByText("Pomodoro", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Tomate Pomodoro em papel recortado" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("pomodoro-tomato.png") });
  await expect(page.locator(".focus-mode-slide")).toHaveCSS("animation-name", "focus-mode-arrive");
  const bites = page.locator(".pomodoro-tomato__bites");
  await expect(bites).toHaveAttribute("stroke-dasharray", "0 100");
  await page.getByRole("button", { name: "Começar" }).click();
  await expect(bites).not.toHaveAttribute("stroke-dasharray", "0 100");
  await page.getByRole("button", { name: "Pausar" }).click();
  await page.getByRole("button", { name: "Reiniciar contador" }).click();
  await page.getByRole("button", { name: "Modo anterior" }).click();
  await expect(page.getByText("Cronômetro", { exact: true })).toBeVisible();
  await expect(page.locator(".focus-mode-slide")).toHaveClass(/is-backward/);
  await expect(page.locator(".focus-paper-control-icon")).toBeVisible();
  await expect(page.getByRole("heading", { name: "00:00:00" })).toBeVisible();
  await page.getByRole("button", { name: "Começar" }).click();
  await expect(page.getByRole("heading", { name: /00:00:0[1-9]/ })).toBeVisible();
  await page.getByRole("button", { name: "Pausar" }).click();
});

test("concentra as ferramentas na navegação lateral", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Contrato visual da página inicial desktop.");
  const navigation = page.getByRole("navigation", { name: "Navegação principal" });
  const sidebar = page.locator(".sidebar");

  await expect(navigation.getByRole("button")).toHaveCount(10);
  await expect(navigation.getByRole("button", { name: "Espaço do aluno" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(sidebar.getByText("Espaço do aluno", { exact: true })).toBeHidden();
  await expect(page.getByRole("region", { name: "Ferramentas do Espaço do aluno" })).toHaveCount(0);

  const heroDecoration = await page
    .locator(".view-heading--today")
    .evaluate((element) => getComputedStyle(element, "::before").content);
  expect(heroDecoration).toBe("none");

  const metricDecorations = await page
    .locator(".metric-row article")
    .evaluateAll((items) => items.map((item) => getComputedStyle(item, "::before").content));
  expect(metricDecorations).toEqual(["none", "none", "none"]);

  const compactSidebarBox = await sidebar.boundingBox();
  const compactNavigationBox = await navigation.boundingBox();
  expect(compactSidebarBox).not.toBeNull();
  expect(compactNavigationBox).not.toBeNull();
  expect(compactNavigationBox!.x).toBeGreaterThanOrEqual(compactSidebarBox!.x);
  expect(compactNavigationBox!.x + compactNavigationBox!.width).toBeLessThanOrEqual(
    compactSidebarBox!.x + compactSidebarBox!.width,
  );

  await page.getByRole("button", { name: "Expandir menu lateral" }).click();
  await expect(sidebar).toHaveClass(/sidebar--expanded/);
  await expect(sidebar).toHaveCSS("width", "260px");
  await expect(sidebar.getByLabel("OlenaStudy")).toBeVisible();
  await expect(sidebar.getByText("Área do aluno", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Espaço do aluno", { exact: true })).toBeVisible();

  const expandedSidebarBox = await sidebar.boundingBox();
  const expandedNavigationBox = await navigation.boundingBox();
  expect(expandedSidebarBox).not.toBeNull();
  expect(expandedNavigationBox).not.toBeNull();
  expect(expandedNavigationBox!.x).toBeGreaterThanOrEqual(expandedSidebarBox!.x);
  expect(expandedNavigationBox!.x + expandedNavigationBox!.width).toBeLessThanOrEqual(
    expandedSidebarBox!.x + expandedSidebarBox!.width,
  );
});

test("troca o tema pelo seletor de aparência do cabeçalho", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Contrato visual do seletor desktop.");
  const toggle = page.locator(".page-header__theme .appearance-picker__trigger");
  await expect(toggle).toHaveAccessibleName(/tema claro/i);
  await expect(toggle.locator('[data-icon="theme-dark"]')).toBeVisible();
  await toggle.click();
  await page.getByRole("button", { name: "Escuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAccessibleName(/tema escuro/i);
  await expect(toggle.locator('[data-icon="theme-light"]')).toBeVisible();
  if (testInfo.project.name === "desktop") {
    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toHaveCSS("background-color", "rgb(23, 21, 28)");
    await sidebar.getByRole("button", { name: "Expandir menu lateral" }).click();
    await expect(sidebar.getByRole("button", { name: "Agenda" })).toHaveCSS(
      "color",
      "rgb(255, 249, 239)",
    );
    await toggle.click();
    await page.getByRole("button", { name: "Claro", exact: true }).click();
    await expect(sidebar.getByRole("button", { name: "Agenda" }).locator("span").last()).toHaveCSS(
      "color",
      "rgb(15, 15, 20)",
    );
    await expect(sidebar).toHaveCSS("width", "260px");
    await expect(page.locator("main")).toHaveCSS("margin-left", "260px");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const rail = document.querySelector(".sidebar")!.getBoundingClientRect();
          const main = document.querySelector("main")!.getBoundingClientRect();
          return main.x - rail.right;
        }),
      )
      .toBe(0);
  }
});

test("organiza uma tarefa e mantém o dado após recarregar", async ({ page }, testInfo) => {
  await expect(page.getByRole("heading", { name: "Espaço do aluno" })).toBeVisible();
  await expect(page.getByText("Dados salvos neste dispositivo")).toHaveCount(0);
  await expect(page.getByAltText(/rosto da helena/i)).toHaveCount(0);
  await expect(page.getByAltText("Helena, a mascote do OlenaStudy")).toHaveCount(0);

  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await page.getByLabel(/o que precisa ser feito/i).fill("Revisar Simple Past");
  await page.getByRole("button", { name: /adicionar tarefa/i }).click();
  await studentSpaceButton(page, testInfo.project.name).click();
  await expect(page.getByText("Revisar Simple Past")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Revisar Simple Past")).toBeVisible();
});

test("preserva o criador de planos de aula", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "O atalho mobile fica no Espaço do aluno.");
  await page.getByRole("button", { name: /planos de aula/i }).click();
  await expect(page.getByRole("heading", { name: "Mão no vocabulário" })).toBeVisible();
  await expect(page.getByLabel("Folha com moldes de mãos para imprimir")).toBeVisible();
  await expect(page.getByRole("img", { name: /molde de mão/i })).toHaveCount(8);
  await page.getByLabel(/tema da aula/i).fill("Simple Past");
  await page.getByLabel(/perfil da turma/i).fill("Adultos iniciantes");
  await page.getByRole("button", { name: /criar rascunho/i }).click();
  await expect(page.getByRole("heading", { name: "Simple Past" })).toBeVisible();
  await expect(page.getByText("Warm-up")).toBeVisible();
});

test("cria um flashcard e conclui a revisão", async ({ page }, testInfo) => {
  await page.evaluate(() => localStorage.setItem("helena.soloProgress", "2"));
  await navigateToTool(page, testInfo.project.name, "Biblioteca", "Biblioteca");
  await page.getByLabel("Frente").fill("Improve");
  await page.getByLabel("Verso").fill("Melhorar");
  await page.getByRole("button", { name: /criar flashcard/i }).click();

  await studentSpaceButton(page, testInfo.project.name).click();
  await page
    .getByRole("navigation", {
      name: testInfo.project.name === "mobile" ? "Navegação móvel" : "Navegação principal",
    })
    .getByRole("button", {
      name: "Praticar",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /entrar no mundo/i }).click();
  await page.getByRole("button", { name: /Nível 2: Flashcards/ }).click();
  await expect(page.getByRole("heading", { name: "Improve" })).toBeVisible();
  await page.getByRole("button", { name: /mostrar resposta/i }).click();
  await expect(page.getByRole("heading", { name: "Melhorar" })).toBeVisible();
  await page.getByRole("button", { name: "Fácil" }).click();
  await expect(page.getByText(/revisão em dia/i)).toBeVisible();
  await page.getByRole("button", { name: "Voltar aos mundos", exact: true }).click();
  await page.getByRole("button", { name: "Entrar no mundo", exact: true }).click();
  const nextLevel = page.getByRole("button", { name: /Nível 3: Quiz/ });
  await expect(nextLevel.getByAltText("Helena no nível 3")).toBeVisible();
  const alignment = await nextLevel.evaluate((element) => {
    const mascot = element.querySelector(".solo-path-mascot")!.getBoundingClientRect();
    const tile = element.querySelector(".solo-path-level__badge")!.getBoundingClientRect();
    return Math.abs(mascot.x + mascot.width / 2 - tile.x - tile.width / 2);
  });
  expect(alignment).toBeLessThan(2);
});

test("mantém os módulos acessíveis e sem rolagem horizontal no celular", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Contrato específico da navegação móvel.");
  const navigation = page.getByRole("navigation", { name: "Navegação móvel" });
  await expect(navigation).toBeVisible();
  await expect(
    navigation.locator(
      ":scope > .mobile-nav__item, :scope > .appearance-picker > .mobile-nav__item",
    ),
  ).toHaveCount(5);

  for (const label of ["Agenda", "Foco", "Praticar", "Espaço"]) {
    await navigation.getByRole("button", { name: label, exact: true }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
  }

  await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
  const toolsDialog = page.getByRole("dialog", { name: "Mais ferramentas" });
  await expect(toolsDialog).toBeVisible();
  await page.waitForTimeout(350);
  const toolItems = toolsDialog.locator(".more-item");
  await expect(toolItems).toHaveCount(5);

  for (const item of await toolItems.all()) {
    const iconBox = await item.locator(".navigation-icon").boundingBox();
    const glyphBox = await item.locator(".navigation-icon__variant:visible").boundingBox();
    expect(iconBox).not.toBeNull();
    expect(glyphBox).not.toBeNull();
    expect(iconBox!.width).toBeCloseTo(32, 3);
    expect(iconBox!.height).toBeCloseTo(32, 3);
    expect(glyphBox!.width).toBeCloseTo(20, 3);
    expect(glyphBox!.height).toBeCloseTo(20, 3);
  }

  await toolsDialog.getByRole("button", { name: "Fechar menu" }).click();
  await expect(toolsDialog).toBeHidden();

  for (const label of ["Hábitos", "Cadernos", "Biblioteca", "Planos de aula"]) {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
    const more = page.getByRole("dialog", { name: "Mais ferramentas" });
    await expect(more).toBeVisible();
    await more.getByRole("button", { name: label, exact: true }).click();
    await expect(more).toBeHidden();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
  }
});

test("mantém o retorno do Modo Sala livre no celular", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Contrato visual do Modo Sala móvel.");
  const navigation = page.getByRole("navigation", { name: "Navegação móvel" });

  await navigation.getByRole("button", { name: "Praticar", exact: true }).click();
  await page.getByRole("button", { name: "Abrir Modo Sala", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Modo Sala" });
  const backButton = dialog.getByRole("button", { name: "Voltar", exact: true });
  const heading = dialog.getByRole("heading", { name: "Modo Sala", exact: true });
  await expect(backButton.locator(".helena-room-icon")).toBeVisible();

  const backBox = await backButton.boundingBox();
  const headingBox = await heading.boundingBox();
  expect(backBox).not.toBeNull();
  expect(headingBox).not.toBeNull();
  expect(backBox!.y + backBox!.height).toBeLessThanOrEqual(headingBox!.y);
});

test("adapta a barra móvel ao tema e anima a troca de aba", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Contrato visual da navegação móvel.");
  const navigation = page.getByRole("navigation", { name: "Navegação móvel" });

  await expect(navigation).toHaveCSS("background-color", "rgb(255, 249, 239)");
  await expect(navigation).toHaveCSS("color", "rgb(41, 36, 50)");
  const agendaIcon = navigation
    .getByRole("button", { name: "Agenda", exact: true })
    .locator(".navigation-icon__variant--claro");
  await expect(agendaIcon).toBeVisible();

  await navigation.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(navigation.getByRole("button", { name: "Agenda", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(navigation.locator(".mobile-nav__item--active .mobile-nav__icon")).toHaveCSS(
    "animation-name",
    "mobile-tab-pop",
  );
  await expect(page.locator("main")).toHaveCSS("animation-name", "mobile-view-arrive");

  await page.locator(".page-header__theme .appearance-picker__trigger").click();
  await page.getByRole("button", { name: "Escuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(navigation).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const focusIcon = navigation
    .getByRole("button", { name: "Foco", exact: true })
    .locator(".navigation-icon__variant--claro");
  await expect(focusIcon).toBeVisible();
  await expect(navigation).toHaveCSS("color", "rgb(41, 36, 50)");
});

test("abre digitalização, escrita à mão e completa um bingo", async ({ page }, testInfo) => {
  await page.evaluate(() => localStorage.setItem("helena.soloProgress", "4"));
  await navigateToTool(page, testInfo.project.name, "Cadernos", "Cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();

  await page
    .getByRole("dialog", { name: "Escrever à mão" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await page.getByRole("button", { name: "Digitalizar" }).click();
  await expect(page.getByRole("dialog", { name: "Digitalizar documento" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();

  await page.getByRole("button", { name: "Escrever à mão" }).click();
  await expect(page.getByRole("dialog", { name: "Escrever à mão" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();

  await studentSpaceButton(page, testInfo.project.name).click();
  await page
    .getByRole("navigation", {
      name: testInfo.project.name === "mobile" ? "Navegação móvel" : "Navegação principal",
    })
    .getByRole("button", {
      name: "Praticar",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /entrar no mundo/i }).click();
  await page.getByRole("button", { name: /Nível 4: Bingo/ }).click();
  await page.getByRole("button", { name: "Criar bingo" }).click();
  const board = page.getByRole("group", { name: "Cartela de bingo" });
  const cells = board.getByRole("button");
  await expect(cells).toHaveCount(9);
  for (let index = 0; index < 3; index += 1) await cells.nth(index).click();
  await expect(page.getByRole("status")).toContainText("Bingo");
});
