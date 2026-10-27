import { expect, test } from "@playwright/test";

test("espaço responsivo navega com vibração global e respeita acessibilidade", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: () => {
        document.documentElement.dataset["pulseCount"] = String(
          Number(document.documentElement.dataset["pulseCount"] ?? 0) + 1,
        );
        return true;
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Seu próximo destino" })).toBeVisible();
  await expect(page.locator(".student-focus-art .focus-rose.is-wilted")).toBeVisible();
  await expect(page.locator(".student-focus-art .focus-rose__dome-glass")).toHaveCount(1);
  await expect(
    page.locator('.metric-row .student-metric-icon[src$="student-agenda.svg"]'),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("espaco-do-aluno.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => localStorage.setItem("helenastudy.theme", "dark"));
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Seu próximo destino" })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("espaco-do-aluno-escuro.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /Hora de focar/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-pulse-count", "1");
  await expect(page.getByRole("img", { name: "Rosa de foco murcha" })).toBeVisible();
  await expect(page.getByText(/Sua flor está adormecida/)).toBeVisible();
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await page.getByRole("button", { name: "Aparência e acessibilidade", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Vibrações/ }).uncheck();
  const before = await page.locator("html").getAttribute("data-pulse-count");
  await page
    .getByRole("button", {
      name: page.viewportSize()!.width <= 760 ? "Voltar às configurações" : "Voltar ao perfil",
      exact: true,
    })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-pulse-count", before!);
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("olena:accessibility:v1") ?? "{}").haptics,
    ),
  ).toBe(false);
});

test("Oliver abre diretamente Matemática sem transbordar no celular", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/");
  const oliver = page.getByRole("img", { name: /Oliver aparece por trás/ });
  await expect(oliver).toBeVisible();
  await expect
    .poll(() => oliver.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(900);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Explorar Matemática", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pátio das Primeiras Contas" })).toBeVisible();
});

test("ilha animada e Oliver continuam visíveis ao entrar e voltar duas vezes", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/");
  for (let visit = 0; visit < 2; visit++) {
    await expect(page.locator(".student-island-art canvas")).toBeVisible({ timeout: 20000 });
    await expect(page.locator(".student-island-art")).toHaveAttribute("data-ready", "true");
    const card = await page.locator(".student-destination--learn").boundingBox();
    const art = await page.locator(".student-island-art").boundingBox();
    expect(Math.abs(card!.x + card!.width / 2 - art!.x - art!.width / 2)).toBeLessThan(2);
    await page.getByRole("button", { name: /Explorar as ilhas/ }).click();
    await expect(page.getByRole("heading", { name: "Pátio das Primeiras Contas" })).toBeVisible();
    await page.getByRole("button", { name: "Voltar às ilhas", exact: true }).click();
    const home = page.getByRole("button", {
      name: page.viewportSize()!.width <= 760 ? "Espaço" : "Espaço do aluno",
      exact: true,
    });
    await home.click();
    await expect(page.locator(".math-hero-slide")).toBeVisible();
    await expect(page.locator(".math-hero-peek img")).toHaveJSProperty("complete", true);
    await expect
      .poll(() =>
        page.locator(".math-hero-peek img").evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBe(900);
    await expect(page.locator(".student-island-art canvas")).toBeVisible({ timeout: 20000 });
    await expect(page.locator(".student-island-art")).toHaveAttribute("data-ready", "true");
  }
});
