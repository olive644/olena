import { expect, test, type Page } from "@playwright/test";
import { openNotebooksView } from "./notebook-helpers";
import { setTestTheme } from "./theme-setup";

test("carrega os ícones de papel no desktop e mobile em ambos os temas", async ({
  page,
}, testInfo) => {
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    "href",
    "/olena-favicon-32.png",
  );
  const mobile = testInfo.project.name === "mobile";
  const navigation = page.getByRole("navigation", {
    name: mobile ? "Navegação móvel" : "Navegação principal",
  });
  for (const theme of ["light", "dark"]) {
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const icons = navigation.locator(".navigation-icon--colorful img:visible");
    expect(await icons.count()).toBeGreaterThan(0);
    for (const icon of await icons.all()) {
      await expect(icon).toHaveAttribute("src", /\/navigation-icons\/colorful\/.*\.svg$/);
      await expect
        .poll(() =>
          icon.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
    }
    if (mobile) {
      // Todas as ferramentas cabem na barra móvel: não há mais o menu "Mais ferramentas".
      await expect(page.getByRole("button", { name: "Mais ferramentas", exact: true })).toHaveCount(
        0,
      );
    }
    if (theme === "light") {
      await setTestTheme(page, "dark");
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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
});

test("mostra Oliver e o convite de Matemática nos dois temas", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await expect(
      page.getByRole("button", { name: "Explorar Matemática", exact: true }),
    ).toBeVisible();
    const art = page.getByAltText("Oliver aparece por trás do widget de Matemática");
    await expect(art).toBeVisible();
    await expect(art).toHaveAttribute("src", "/oliver-peeking-widget.webp?v=2");

    if (theme === "light") {
      await setTestTheme(page, "dark");
    }
  }
});

test("explora mundos com a foto do perfil e abre somente Matemática", async ({
  page,
}, testInfo) => {
  await page
    .getByRole("navigation", {
      name: testInfo.project.name === "mobile" ? "Navegação móvel" : "Navegação principal",
    })
    .getByRole("button", { name: "Praticar", exact: true })
    .click();
  await expect(page.getByAltText("Sua foto sobre a ilha")).toBeVisible();
  await page.getByRole("button", { name: "Próximo mundo" }).click();
  await expect(page.locator(".is-current .solo-island-art")).toHaveAttribute(
    "src",
    "/practice-islands/programming.webp",
  );
  await expect(page.getByRole("button", { name: "Ilha bloqueada" })).toBeDisabled();
  await page.getByRole("button", { name: "Mundo anterior" }).click();
  await page.getByRole("button", { name: "Explorar Matemática" }).click();
  await expect(page.getByRole("region", { name: "Ilhas de Matemática" })).toBeVisible();
  await page.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }).click();
  await expect(page.getByRole("region", { name: "Desafio de Matemática" })).toBeVisible();
  await expect(page.locator(".practice-trail-map")).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar às ilhas" }).click();
  await expect(page.getByAltText("Sua foto sobre a ilha")).toBeVisible();
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
  const tomato = page.getByRole("img", { name: "Tomate Pomodoro em papel recortado" });
  await expect(tomato).toHaveAttribute("data-stage", "0");
  await page.getByRole("button", { name: "Começar" }).click();
  // a primeira mordida só chega depois de um oitavo do tempo escolhido
  await expect(tomato).toHaveAttribute("data-stage", "0");
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

  await expect(navigation.getByRole("button")).toHaveCount(6);
  await expect(navigation.getByRole("button", { name: "Hábitos", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("button", { name: "Modo Sala", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("button", { name: "Espaço do aluno" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(sidebar.getByText("Espaço do aluno", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ferramentas do Espaço do aluno" })).toHaveCount(0);

  await expect(page.locator(".view-heading--today")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Descobertas com Oliver" })).toBeVisible();

  const metricDecorations = await page
    .locator(".metric-row article")
    .evaluateAll((items) => items.map((item) => getComputedStyle(item, "::before").content));
  expect(metricDecorations).toEqual(["none", "none", "none"]);

  // A barra lateral já nasce expandida: sem botão de expandir ou recolher.
  await expect(page.getByRole("button", { name: "Expandir menu lateral" })).toHaveCount(0);
  await expect(sidebar).toHaveClass(/sidebar--expanded/);
  await expect(sidebar).toHaveCSS("width", "260px");
  await expect(sidebar.getByLabel("OLENASTUDY")).toBeVisible();
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

test("troca o tema somente pela acessibilidade do Perfil", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Contrato visual do seletor desktop.");
  await expect(page.locator(".page-header__theme")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name: "Perfil", exact: true })
    .click();
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await page.getByRole("button", { name: "Aparência e acessibilidade", exact: true }).click();
  await page.getByRole("button", { name: "Escuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Escuro", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  if (testInfo.project.name === "desktop") {
    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toHaveCSS("background-color", "rgb(23, 21, 28)");
    await expect(sidebar.getByRole("button", { name: "Agenda" })).toHaveCSS(
      "color",
      "rgb(255, 249, 239)",
    );
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
  await expect(
    page.getByRole("button", { name: "Explorar Matemática", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Dados salvos neste dispositivo")).toHaveCount(0);
  await expect(page.getByAltText(/rosto da helena/i)).toHaveCount(0);
  await expect(page.getByAltText("Olena, a mascote do OlenaStudy")).toHaveCount(0);

  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await page.getByRole("button", { name: "Criar tarefa", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
  await form.getByLabel("Título", { exact: true }).fill("Revisar Simple Past");
  await form.getByRole("button", { name: "Adicionar", exact: true }).click();
  await studentSpaceButton(page, testInfo.project.name).click();
  await expect(page.getByText("Revisar Simple Past")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Revisar Simple Past")).toBeVisible();
});

test("oculta por enquanto as ferramentas do professor", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Planos de aula" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Banco de atividades" })).toHaveCount(0);
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
  ).toHaveCount(6);

  for (const label of ["Agenda", "Foco", "Praticar", "Espaço"]) {
    await navigation.getByRole("button", { name: label, exact: true }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
  }

  // As cinco ferramentas e o Perfil (com o avatar da conta) cabem na barra: não há menu extra.
  await expect(page.getByRole("button", { name: "Mais ferramentas", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("button", { name: "Perfil", exact: true })).toBeVisible();
  await navigation.getByRole("button", { name: "Biblioteca", exact: true }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});

test("adapta a barra móvel ao tema e anima a troca de aba", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Contrato visual da navegação móvel.");
  const navigation = page.getByRole("navigation", { name: "Navegação móvel" });

  await expect(navigation).toHaveCSS("background-color", "rgb(255, 249, 239)");
  await expect(navigation).toHaveCSS("color", "rgb(41, 36, 50)");
  const agendaIcon = navigation
    .getByRole("button", { name: "Agenda", exact: true })
    .locator(".navigation-icon--colorful img");
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

  await setTestTheme(page, "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(navigation).toHaveCSS("background-color", "rgb(41, 36, 50)");
  const focusIcon = navigation
    .getByRole("button", { name: "Foco", exact: true })
    .locator(".navigation-icon--colorful img");
  await expect(focusIcon).toBeVisible();
  await expect(navigation).toHaveCSS("color", "rgb(255, 249, 239)");
});

test("abre escrita à mão, retoma a folha e completa um bingo", async ({ page }, testInfo) => {
  await page.evaluate(() => localStorage.setItem("helena.soloProgress", "4"));
  await openNotebooksView(page);
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();

  await page
    .getByRole("dialog", { name: "Escrever à mão" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await page.getByRole("button", { name: /^Abrir preview de / }).click();
  await expect(page.getByRole("dialog", { name: "Escrever à mão" })).toBeVisible();
  await page
    .getByRole("dialog", { name: "Escrever à mão" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();

  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
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
  await page.getByRole("button", { name: "Explorar Matemática" }).click();
  await page.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
  await page.getByRole("button", { name: "Voltar às ilhas" }).click();
});
