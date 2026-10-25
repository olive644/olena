import { expect, test, type Page } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });
async function answers(page: Page) {
  for (const choice of [
    "Ensino médio",
    "Química",
    "Inglês",
    "Criar uma rotina",
    "Visual",
    "Passo a passo",
    "Alternar estudo e pausas",
    "Agora não",
    "30 minutos",
  ]) {
    await page.getByRole("button", { name: choice, exact: true }).click();
    if (choice === "Visual")
      await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
}
for (const theme of ["light", "dark"]) {
  test(`API prepara o espaço e não desfaz edições ao recarregar: ${theme}`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem("helenastudy.theme", theme), theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = page.waitForResponse((response) =>
      response.url().includes("action=onboarding"),
    );
    await page.goto("/?onboarding=1");
    await answers(page);
    expect((await response).status()).toBe(200);
    await expect(page.getByRole("button", { name: "Registre-se" })).toBeEnabled();
    await expect(page.locator(".onboarding-preparation .paper-digits").first()).toHaveCSS(
      "--digit-face",
      "#292432",
    );
    await expect(page.getByRole("definition").filter({ hasText: "Química" })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("preparado-pela-olena.png") });
    await page.getByRole("button", { name: "Registre-se" }).click();
    await page.getByRole("button", { name: "Entrar como convidado" }).click();
    await expect(page.getByText("0 de 30 minutos da meta diária")).toBeVisible();
    const privacy = page.getByRole("region", { name: "Privacidade no OlenaStudy" });
    await privacy.getByRole("button", { name: "Entendi" }).click();
    await page.goto("/foco");
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const session = JSON.parse(localStorage.getItem("olena.focus-session.v1") ?? "null");
          return session
            ? {
                mode: session.mode,
                duration: session.duration,
                running: session.running,
                subjectId: session.subjectId,
              }
            : null;
        }),
      )
      .toEqual({ mode: "pomodoro", duration: 25, running: false, subjectId: "subject-chemistry" });
    await page.goto("/aprender");
    await expect(page.locator(".practice-carousel-island.is-current img").first()).toHaveAttribute(
      "src",
      "/practice-islands/chemistry.webp",
    );
    await expect(page.locator(".practice-carousel-island.is-current")).toBeDisabled();
    await page.goto("/");
    await page.getByRole("button", { name: "Explorar Matemática" }).click();
    await expect(
      page.getByRole("heading", { name: "Pátio das Primeiras Contas", exact: true }),
    ).toBeVisible();
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await page.getByRole("button", { name: "Estudo e foco", exact: true }).click();
    await page
      .getByRole("group", { name: "Meta diária", exact: true })
      .getByRole("button", { name: "60 minutos", exact: true })
      .click();
    await page.locator(".onboarding-initial-subject select").selectOption("Inglês");
    await page.goto("/");
    await expect(page.getByText("0 de 60 minutos da meta diária")).toBeVisible();
    await page.reload();
    await expect(page.getByText("0 de 60 minutos da meta diária")).toBeVisible();
    await page.goto("/aprender");
    await expect(page.locator(".practice-carousel-island.is-current img").first()).toHaveAttribute(
      "src",
      "/practice-islands/languages.webp",
    );
  });
}
test("falha da API permite tentar novamente ou continuar sem configuração automática", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let requests = 0;
  await page.route("**/api/olena?action=onboarding&version=1", (route) => {
    requests++;
    return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.goto("/?onboarding=1");
  await answers(page);
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível preparar suas preferências agora.",
  );
  await expect(page.getByRole("button", { name: "Registre-se" })).toBeDisabled();
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect.poll(() => requests).toBe(2);
  await page.getByRole("button", { name: "Continuar sem configuração automática" }).click();
  await page.getByRole("button", { name: "Registre-se" }).click();
  await page.getByRole("button", { name: "Entrar como convidado" }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "{}").configuration,
    ),
  ).toBeUndefined();
});
