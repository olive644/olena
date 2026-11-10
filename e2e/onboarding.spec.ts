import { expect, test } from "@playwright/test";
import { advanceOnboarding, answerOnboarding, welcomeOnboarding } from "./onboarding-helpers";
test.use({ storageState: { cookies: [], origins: [] } });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("conversa mantém arte aprovada e exige autenticação para concluir", async ({ page }) => {
  await page.goto("/?onboarding=1");
  await expect(page.getByText("Olá! Eu sou a Olena.", { exact: true })).toBeAttached();
  let source: string | null = null;
  await answerOnboarding(page, async () => {
    const image = page.locator(".onboarding__helena:visible");
    await expect(image).toBeVisible();
    const current = await image.getAttribute("src");
    if (source) expect(current).toBe(source);
    source = current;
    expect(current).toMatch(/-cutout\.webp$/);
    await expect
      .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(image).toHaveCSS("mix-blend-mode", "normal");
    await expect(image).toHaveCSS("filter", "none");
    await expect(page.locator(".onboarding__message--you")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar como convidado" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registre-se" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("helena.onboarding.v1"))).toBeNull();
});

test("Voltar preserva resposta e foco de teclado original", async ({ page }) => {
  await page.goto("/?onboarding=1");
  await welcomeOnboarding(page);
  const choice = page.getByRole("button", { name: "Estudo por conta própria", exact: true });
  await choice.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(choice).toHaveCSS("outline-style", "none");
  await expect(choice).toHaveCSS("text-decoration-line", "underline");
  expect(await choice.evaluate((el) => getComputedStyle(el).textDecorationColor)).not.toBe(
    "rgb(250, 204, 21)",
  );
  await expect(choice).toHaveCSS("filter", "none");
  await page.keyboard.press("Enter");
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  const title = page.getByRole("heading", { name: "Qual disciplina você mais tem dificuldade?" });
  await expect(title).toBeVisible();
  await expect(title).toHaveCSS("text-decoration-line", "none");
  await expect(title).toHaveCSS("filter", "none");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
});

test("secundário confirma modalidade, ano e instituição separadamente", async ({ page }) => {
  await page.goto("/?onboarding=1");
  await welcomeOnboarding(page);
  await advanceOnboarding(page, "Estudante do ensino secundário");
  await expect(page.getByRole("heading", { name: "Qual modalidade você cursa?" })).toBeVisible();
  await advanceOnboarding(page, "Ensino médio");
  for (const year of ["1º ano do médio", "2º ano do médio", "3º ano do médio"])
    await expect(page.getByRole("button", { name: year })).toBeVisible();
  await advanceOnboarding(page, "2º ano do médio");
  await expect(page.getByRole("heading", { name: "Onde você estuda?" })).toBeVisible();
  await page.getByRole("button", { name: "Ignorar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Qual disciplina você mais tem dificuldade?" }),
  ).toBeVisible();
});

test("capa não cria sessão ao abrir, fechar ou recarregar acesso", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Começar agora" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar conta com e-mail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar como convidado" })).toHaveCount(0);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Começar agora" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("helena.guest.v1"))).toBeNull();
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
]) {
  test(`escolhas e navegação fixa em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?onboarding=1");
    await answerOnboarding(page, async (step) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const next = await page.getByRole("button", { name: "Avançar", exact: true }).boundingBox();
      expect(next).not.toBeNull();
      expect(next!.y).toBeGreaterThanOrEqual(0);
      expect(next!.y + next!.height).toBeLessThanOrEqual(viewport.height);
      expect(next!.height).toBeGreaterThanOrEqual(44);
      for (const button of await page.locator(".onboarding__choices:visible button").all()) {
        await button.scrollIntoViewIfNeeded();
        await expect(button).toBeVisible();
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      if (step === 1)
        for (const subject of [
          "Idiomas",
          "Português",
          "Química",
          "Biologia",
          "Matemática",
          "Programação",
        ])
          await expect(page.getByRole("button", { name: subject, exact: true })).toBeAttached();
      if (step === 2)
        for (const language of ["Japonês", "Chinês"])
          await expect(page.getByRole("button", { name: language })).toBeAttached();
    });
    await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar como convidado" })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("acesso-mobile.png") });
  });
}
