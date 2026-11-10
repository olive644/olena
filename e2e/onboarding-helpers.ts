import { expect, type Page } from "@playwright/test";

export async function advanceOnboarding(page: Page, choice: string) {
  await page.getByRole("button", { name: choice, exact: true }).click();
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
}

export async function welcomeOnboarding(page: Page) {
  // O preview sem sessão conserva a entrada móvel existente; contas novas autenticadas
  // exercitam nome/avatar no componente real pelos testes de conta.
  if ((page.viewportSize()?.width ?? 1280) < 720) return;
  await page.getByRole("button", { name: "Prosseguir", exact: true }).click();
  await page.getByRole("textbox", { name: "Como devo te chamar?" }).fill("Ana Souza");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Personalize seu visual!" })).toBeVisible();
  const avatars = page.getByRole("group", { name: "Escolha seu avatar" });
  await expect(avatars.getByRole("button")).toHaveCount(16);
  await avatars.getByRole("button", { name: "Oliver", exact: true }).click();
  await expect(avatars.getByRole("button", { name: "Oliver", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(avatars.locator(".onboarding__avatar-check")).toHaveCount(1);
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
}

export const onboardingAnswers = [
  "Estudo por conta própria",
  "Química",
  "Inglês",
  "Criar uma rotina",
  ["Visual"],
  "Passo a passo",
  "Alternar estudo e pausas",
  "Agora não",
  "30 minutos",
] as const;

export async function answerOnboarding(page: Page, inspect?: (step: number) => Promise<void>) {
  await welcomeOnboarding(page);
  for (let step = 0; step < onboardingAnswers.length; step++) {
    await page.getByRole("button", { name: "Avançar", exact: true }).waitFor();
    if (inspect) await inspect(step);
    const value = onboardingAnswers[step]!;
    await advanceOnboarding(page, typeof value === "string" ? value : value[0]);
  }
}
