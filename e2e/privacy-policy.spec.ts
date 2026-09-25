import { expect, test } from "@playwright/test";

const POLICY = "/politica-de-privacidade.html";

// Contraste WCAG entre duas cores "rgb(r, g, b)".
function contrast(foreground: string, background: string): number {
  const channels = (color: string) => color.match(/\d+/g)!.slice(0, 3).map(Number);
  const luminance = (rgb: number[]) => {
    const [r, g, b] = rgb.map((value) => {
      const scaled = value / 255;
      return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const a = luminance(channels(foreground));
  const b = luminance(channels(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const width of [320, 390, 768, 1280]) {
  test(`a política cabe na tela e é legível em ${width}px`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Larguras verificadas explicitamente com Chromium.",
    );
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(message.text());
    });
    await page.setViewportSize({ width, height: 800 });
    await page.goto(POLICY);
    await expect(
      page.getByRole("heading", { level: 1, name: "Política de Privacidade" }),
    ).toBeVisible();

    // Nenhuma rolagem horizontal da página; a tabela rola dentro do próprio quadro.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // O índice leva à seção certa.
    await page.getByRole("link", { name: "Quais dados usamos e para quê" }).click();
    await expect(page).toHaveURL(/#dados$/);
    await expect(page.getByRole("heading", { name: /2\. Quais dados usamos/ })).toBeInViewport();

    // O texto usa a fonte legível de sempre e não tem letra menor que 13px.
    const smallest = await page.evaluate(() =>
      Math.min(
        ...Array.from(document.querySelectorAll("main p, main li, main td, main th")).map((node) =>
          parseFloat(getComputedStyle(node).fontSize),
        ),
      ),
    );
    expect(smallest).toBeGreaterThanOrEqual(13);
    expect(problems).toEqual([]);
  });
}

test("a tabela de dados rola dentro do próprio quadro no celular", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Larguras verificadas explicitamente com Chromium.",
  );
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(POLICY);
  const scroll = page.locator(".table-scroll").first();
  const inner = await scroll.evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
    overflowX: getComputedStyle(node).overflowX,
  }));
  expect(inner.overflowX).toBe("auto");
  expect(inner.scrollWidth).toBeGreaterThan(inner.clientWidth);
});

for (const scheme of ["light", "dark"] as const) {
  test(`cada bloco da política tem contraste suficiente no tema ${scheme}`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Tema verificado com Chromium.");
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(POLICY);
    const pairs = await page.evaluate(() => {
      // O fundo de verdade de um texto é o do primeiro ancestral que não é transparente.
      const background = (node: Element): string => {
        let current: Element | null = node;
        while (current) {
          const value = getComputedStyle(current).backgroundColor;
          if (value !== "rgba(0, 0, 0, 0)" && value !== "transparent") return value;
          current = current.parentElement;
        }
        return "rgb(255, 255, 255)";
      };
      const selectors: Record<string, string> = {
        "texto do título": ".hero p",
        "resumo em papel roxo": ".summary li",
        "título do resumo": ".summary h2",
        "destaque do resumo": ".summary strong",
        "título de seção": "h2#quem",
        "aviso amarelo": ".pending",
        "célula da tabela": "tbody td",
        "cabeçalho da tabela": "thead th",
        "link do índice": ".toc a",
        "texto do rodapé": ".brand-footer span",
      };
      return Object.entries(selectors).map(([name, selector]) => {
        const node = document.querySelector(selector)!;
        return { name, color: getComputedStyle(node).color, background: background(node) };
      });
    });
    for (const pair of pairs) {
      expect(
        contrast(pair.color, pair.background),
        `${pair.name} (${pair.color} sobre ${pair.background})`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
}

test("os blocos usam o papel recortado do aplicativo, com base deslocada", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Visual verificado com Chromium.");
  await page.goto(POLICY);
  const cards = await page.locator("main .paper:not(.toc)").evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        radius: style.borderTopLeftRadius + "/" + style.borderBottomRightRadius,
        shadow: style.boxShadow,
      };
    }),
  );
  // O índice é de propósito um bloco tracejado e plano; todos os outros têm base.
  expect(cards.length).toBeGreaterThanOrEqual(12);
  for (const card of cards) {
    // Sombra em camadas com base deslocada, nunca uma sombra difusa única.
    expect(card.shadow).toMatch(/\d+px \d+px 0px/);
    // Cantos assimétricos: não é um retângulo arredondado uniforme.
    const [topLeft, bottomRight] = card.radius.split("/");
    expect(topLeft).not.toBe(bottomRight);
  }
});

test("o rodapé da Galeria.Oli aparece com o ícone carregado na política", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Visual verificado com Chromium.");
  await page.goto(POLICY);
  const footer = page.locator("footer.brand-footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toContainText("Todos os direitos Galeria.Oli - OlenaStudy");
  const icon = footer.locator("img");
  await expect(icon).toBeVisible();
  expect(await icon.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  // O ícone fica à esquerda do texto.
  const [iconBox, textBox] = await Promise.all([
    icon.boundingBox(),
    footer.locator("span").boundingBox(),
  ]);
  expect(iconBox!.x + iconBox!.width).toBeLessThanOrEqual(textBox!.x + 1);
});

test("o rodapé da Galeria.Oli aparece no onboarding e no login", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo verificado no desktop.");
  await page.goto("/?onboarding=1");
  const onboarding = page.locator("footer.brand-footer");
  await expect(onboarding).toContainText("Todos os direitos Galeria.Oli - OlenaStudy");
  expect(
    await onboarding.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);
  await page.goto("/?onboarding=1&login=1");
  const login = page.locator("footer.brand-footer");
  await expect(login).toContainText("Todos os direitos Galeria.Oli - OlenaStudy");
  expect(
    await login.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);
});

test("o login pede a concordância e abre a política em outra aba sem perder o lugar", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo verificado no desktop.");
  await page.goto("/?onboarding=1&login=1");
  const box = page.getByRole("checkbox", { name: /Li e concordo/ });
  await expect(box).toBeVisible();
  await expect(box).not.toBeChecked();
  await expect(page.getByText("Marque a concordância para poder entrar.")).toBeVisible();
  // O botão não deve estar utilizável enquanto a concordância não for dada.
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeDisabled();

  await box.check();
  await expect(page.getByText("Marque a concordância para poder entrar.")).toHaveCount(0);

  const link = page.getByRole("link", { name: /Política de Privacidade/ });
  const [popup] = await Promise.all([page.waitForEvent("popup"), link.click()]);
  await expect(
    popup.getByRole("heading", { level: 1, name: "Política de Privacidade" }),
  ).toBeVisible();
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  // A tela de login continua onde estava, com a caixa marcada.
  await expect(box).toBeChecked();
});

test("o login cabe e a caixa de concordância é fácil de tocar no celular", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Larguras verificadas explicitamente com Chromium.",
  );
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/?onboarding=1&login=1");
  const consent = page.locator(".login-page__consent");
  await expect(consent).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const target = (await consent.boundingBox())!;
  expect(target.height).toBeGreaterThanOrEqual(44);
});
