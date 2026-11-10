import { expect, test } from "@playwright/test";
import { answerOnboarding, onboardingAnswers } from "./onboarding-helpers";
test.use({ storageState: { cookies: [], origins: [] } });
for (const theme of ["light", "dark"]) {
  test(`API prepara escolhas e configuração persistida respeita edições: ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((value) => localStorage.setItem("helenastudy.theme", value), theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = page.waitForResponse((value) => value.url().includes("action=onboarding"));
    await page.goto("/?onboarding=1");
    await answerOnboarding(page);
    const prepared = await response;
    expect(prepared.status()).toBe(200);
    expect(prepared.request().postDataJSON().answers).toEqual(onboardingAnswers);
    const configuration: unknown = await prepared.json();
    await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("helena.onboarding.v1"))).toBeNull();
    // Fixture de uma conclusão pertencente à conta, sem simular OAuth nem login real.
    // O callback que grava esta estrutura é exercitado pelo componente autenticado no Vitest.
    await page.evaluate(
      ({ configuration, answers }) => {
        localStorage.setItem("helena.account.v1", "e2e-owner");
        localStorage.setItem(
          "helena.onboarding.v1",
          JSON.stringify({
            completed: true,
            configurationOwner: "e2e-owner",
            configurationPending: true,
            configuration,
            answers,
          }),
        );
      },
      { configuration, answers: onboardingAnswers },
    );
    await page.goto("/");
    await expect(page.getByText("0 de 30 minutos da meta diária")).toBeVisible();
    const privacy = page.getByRole("region", { name: "Privacidade no OlenaStudy" });
    await privacy.getByRole("button", { name: "Entendi" }).click();
    await page.goto("/foco");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const value = JSON.parse(localStorage.getItem("olena.focus-session.v1") ?? "null");
          return value
            ? {
                mode: value.mode,
                duration: value.duration,
                running: value.running,
                subjectId: value.subjectId,
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
      "/languages/islands/english.webp",
    );
  });
}
test("falha da API permite repetir ou continuar para autenticação sem configuração", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let requests = 0;
  await page.route("**/api/olena?action=onboarding&version=1", (route) => {
    requests++;
    return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.goto("/?onboarding=1");
  await answerOnboarding(page);
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível preparar suas preferências agora.",
  );
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "88");
  expect(await page.evaluate(() => localStorage.getItem("helena.onboarding.v1"))).toBeNull();
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect.poll(() => requests).toBe(2);
  await page.getByRole("button", { name: "Continuar sem configuração automática" }).click();
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar como convidado" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("helena.onboarding.v1"))).toBeNull();
});
