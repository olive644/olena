import { expect, test, type Page } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });

/** Responde a conversa da Olena: a primeira opção de cada pergunta, até a despedida. */
async function answerAll(page: Page, onStep?: (step: number) => Promise<void>) {
  for (let step = 1; step <= 9; step++) {
    const chips = page.locator(".onboarding__choices button");
    await chips.first().waitFor();
    if (onStep) await onStep(step);
    await chips.first().click();
    if (step === 5) await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
}

test("a Olena conduz as perguntas em conversa até o login com Google", async ({ page }) => {
  await page.goto("/?onboarding=1");
  await expect(page.getByText("Oi! Eu sou a Olena, sua assistente de estudos.")).toBeAttached();
  await answerAll(page, async (step) => {
    const image = page.locator(".onboarding__helena");
    await expect(image).toHaveAttribute(
      "src",
      new RegExp(`step-${Math.min(Math.floor((step - 1) / 2) + 1, 5)}`),
    );
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.locator(".onboarding__message--you")).toHaveCount(step - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
  await expect(
    page.getByText("Prontinho! Seu começo está preparado. Vamos criar seu espaço?"),
  ).toBeVisible();
  await expect(page.locator(".onboarding__message--you")).toHaveCount(9);
  await expect(page.getByRole("button", { name: "Entrar como convidado" })).toHaveCount(0);
  // A pose é PNG recortado: nada de caixa clara atrás da Olena nem mistura de cor.
  await expect(page.locator(".onboarding__helena")).toHaveCSS("mix-blend-mode", "normal");
  await expect(page.locator(".onboarding__helena")).toHaveCSS("filter", "none");
  await page.screenshot({ path: test.info().outputPath("conversa-final.png") });
  await page.getByRole("button", { name: "Registre-se" }).click();
  await expect(page.getByRole("heading", { name: "Vamos começar?" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Registre-se" })).toBeVisible();
  await expect(page.locator(".onboarding__message--you")).toHaveCount(9);
});

test("Voltar refaz uma resposta e o foco do teclado não usa realce amarelo", async ({ page }) => {
  await page.goto("/?onboarding=1");
  const first = page.locator(".onboarding__choices button").first();
  await first.waitFor();
  await first.focus();
  await expect(first).toHaveCSS("outline-style", "none");
  await expect(first).toHaveCSS("text-decoration-line", "underline");
  // O realce amarelo é opção das configurações, não padrão do onboarding.
  expect(await first.evaluate((el) => getComputedStyle(el).textDecorationColor)).not.toBe(
    "rgb(250, 204, 21)",
  );
  await expect(first).toHaveCSS("filter", "none");
  const title = page.getByRole("heading", { level: 2 }).first();
  await expect(title).toHaveCSS("text-decoration-line", "none");
  await expect(title).toHaveCSS("filter", "none");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Qual matéria desperta sua curiosidade?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Em que fase dos estudos você está?" }),
  ).toBeVisible();
  await expect(page.locator(".onboarding__choices .is-selected")).toHaveCount(1);
});

test("entra como convidado no fim do onboarding e continua assim ao recarregar", async ({
  page,
}) => {
  await page.goto("/?onboarding=1");
  await answerAll(page);
  await page.getByRole("button", { name: "Registre-se" }).click();
  await expect(page.getByRole("heading", { name: "Vamos começar?" })).toBeVisible();
  await expect(page.getByText(/você aparece como Guest/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("login-convidado.png") });

  await page.getByRole("button", { name: "Entrar como convidado" }).click();
  await expect(page.getByRole("heading", { name: "Vamos começar?" })).toHaveCount(0);
  await expect(page.locator("#main-content")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("helena.guest.v1"))).toBe("1");
  const privacy = page.getByRole("region", { name: "Privacidade no OlenaStudy" });
  await expect(privacy).toBeVisible();
  await privacy.getByRole("button", { name: "Entendi" }).click();

  // O endereço sem ?onboarding=1 é o de quem volta ao app depois.
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.locator(".onboarding")).toHaveCount(0);

  await page.goto("/perfil");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  if (page.viewportSize()!.width <= 760)
    await page.getByRole("button", { name: "Conta", exact: true }).click();
  await expect(page.getByText("Sessão de convidado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("perfil-convidado.png") });
});

test("Registre-se abre o acesso final sem concluir a sessão antes da escolha", async ({ page }) => {
  await page.goto("/?onboarding=1");
  await answerAll(page);
  await expect(page.getByRole("button", { name: "Entrar como convidado" })).toHaveCount(0);
  await page.getByRole("button", { name: "Registre-se" }).click();
  expect(await page.evaluate(() => localStorage.getItem("helena.guest.v1"))).toBeNull();
  await page.getByRole("button", { name: "Entrar como convidado" }).click();
  await expect(page.locator(".onboarding")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("helena.guest.v1"))).toBe("1");
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
]) {
  test(`todas as escolhas e o acesso cabem em ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?onboarding=1");
    async function fits() {
      expect(
        await page.evaluate(() => ({
          width: document.documentElement.scrollWidth <= innerWidth,
          height: document.documentElement.scrollHeight <= innerHeight + 1,
        })),
      ).toEqual({ width: true, height: true });
      for (const button of await page
        .locator(
          ".onboarding__choices button, .onboarding__actions button, .login-page__guest button",
        )
        .all()) {
        const box = await button.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
    await answerAll(page, async (step) => {
      await fits();
      if (step === 2) {
        await page.screenshot({ path: test.info().outputPath("materias-mobile.png") });
        for (const subject of [
          "Idiomas",
          "Português",
          "Química",
          "Biologia",
          "Matemática",
          "Programação",
        ])
          await expect(page.getByRole("button", { name: subject, exact: true })).toBeVisible();
      }
      if (step === 3) {
        await expect(page.getByRole("button", { name: "Japonês" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Chinês" })).toBeVisible();
      }
    });
    await page.getByRole("button", { name: "Registre-se" }).waitFor();
    await expect(page.getByRole("button", { name: "Registre-se" })).toBeEnabled();
    await fits();
    await page.getByRole("button", { name: "Registre-se" }).click();
    await expect(page.getByRole("button", { name: "Entrar como convidado" })).toBeVisible();
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    await fits();
    await expect(page.locator(".login-page__scene")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("acesso-mobile.png") });
  });
}
