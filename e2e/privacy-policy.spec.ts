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
  test(`o texto da política tem contraste suficiente no tema ${scheme}`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Tema verificado com Chromium.");
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(POLICY);
    const colors = await page.evaluate(() => {
      const pick = (selector: string) => {
        const node = document.querySelector(selector)!;
        return {
          color: getComputedStyle(node).color,
          background: getComputedStyle(node).backgroundColor,
        };
      };
      return {
        body: pick("main p"),
        heading: pick("main h2"),
        page: getComputedStyle(document.body).backgroundColor,
        card: getComputedStyle(document.querySelector("main")!).backgroundColor,
        link: getComputedStyle(document.querySelector("main a")!).color,
      };
    });
    expect(contrast(colors.body.color, colors.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.heading.color, colors.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.link, colors.card)).toBeGreaterThanOrEqual(4.5);
    // Cada tema tem o seu fundo: o escuro não é o claro com o texto trocado.
    if (scheme === "dark") expect(colors.page).not.toBe("rgb(255, 249, 239)");
  });
}

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
