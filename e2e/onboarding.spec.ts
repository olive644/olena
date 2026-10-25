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
  await expect(page.getByText("Oi! Eu sou a Olena, sua assistente de estudos.")).toBeVisible();
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
    page.getByText("Prontinho! Falta só entrar com o Google para começar."),
  ).toBeVisible();
  await expect(page.locator(".onboarding__message--you")).toHaveCount(9);
  await expect(page.getByRole("button", { name: "Entrar como convidado" })).toBeVisible();
  // A pose é PNG recortado: nada de caixa clara atrás da Olena nem mistura de cor.
  await expect(page.locator(".onboarding__helena")).toHaveCSS("mix-blend-mode", "normal");
  await expect(page.locator(".onboarding__helena")).toHaveCSS("filter", "none");
  await page.screenshot({ path: test.info().outputPath("conversa-final.png") });
  await page.getByRole("button", { name: "Entrar com Google" }).click();
  await expect(page.getByRole("heading", { name: "Vamos começar?" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await expect(page.locator(".onboarding__message--you")).toHaveCount(9);
});

test("Voltar refaz uma resposta e o foco do teclado usa o sublinhado amarelo", async ({ page }) => {
  await page.goto("/?onboarding=1");
  const first = page.locator(".onboarding__choices button").first();
  await first.waitFor();
  await first.focus();
  await expect(first).toHaveCSS("outline-style", "none");
  await expect(first).toHaveCSS("text-decoration-line", "underline");
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
  await page.getByRole("button", { name: "Entrar com Google" }).click();
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

test("entra como convidado direto da despedida da Olena", async ({ page }) => {
  await page.goto("/?onboarding=1");
  await answerAll(page);
  await page.getByRole("button", { name: "Entrar como convidado" }).click();
  await expect(page.locator(".onboarding")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("helena.guest.v1"))).toBe("1");
});
