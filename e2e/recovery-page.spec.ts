import { expect, test } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });

for (const theme of ["light", "dark"]) {
  test(`404 original em desktop e celular no tema ${theme}`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem("helenastudy.theme", theme), theme);
    await page.goto("/esta-pagina-nao-existe");
    await expect(page.getByRole("heading", { name: "Esta página saiu do mapa." })).toBeVisible();
    await expect(page.locator(".onboarding")).toHaveCount(0);
    const footerIcons = page.locator(".paper-recovery__footer img");
    await expect(footerIcons.nth(0)).toHaveAttribute("src", "/olena-favicon-180.png");
    await expect(footerIcons.nth(1)).toHaveAttribute("src", "/galeria-oli-icon.svg");
    const faviconBox = await footerIcons.nth(0).boundingBox();
    const oliverBox = await footerIcons.nth(1).boundingBox();
    expect(faviconBox!.x + faviconBox!.width).toBeLessThanOrEqual(oliverBox!.x);
    const image = page.locator(".paper-recovery__olena");
    await expect
      .poll(() => image.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    const code = page.locator(".paper-digits");
    await expect(code).toContainText("404");
    const numberFace = await code.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--digit-face").trim(),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const home = page.getByRole("link", { name: "Voltar ao início" });
    const box = await home.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await home.focus();
    await expect(home).toHaveCSS("outline-style", "none");
    await expect(home).toHaveCSS("text-decoration-line", "underline");
    await page.screenshot({ path: test.info().outputPath(`404-${theme}.png`), fullPage: true });
    await home.click();
    await expect(page).toHaveURL("/");
    await expect(page.locator(".onboarding")).toBeVisible();
    await page.goto("/404.html");
    expect(
      await page
        .locator(".paper-digits")
        .evaluate((element) => getComputedStyle(element).getPropertyValue("--digit-face").trim()),
    ).toBe(numberFace);
  });
}

test("404 estática funciona sem JavaScript em 320x568", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 568 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/404.html`);
  const title = page.getByRole("heading", { name: "Esta página saiu do mapa." });
  await expect(title).toBeVisible();
  const home = page.getByRole("link", { name: "Voltar ao início" });
  const box = await home.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  await expect(home).toHaveAttribute("href", "/");
  await page.screenshot({ path: test.info().outputPath("404-sem-javascript.png"), fullPage: true });
  await context.close();
});

test("404 estática respeita inglês sem depender do aplicativo", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("helenastudy.language", "en-US"));
  await page.goto("/404.html");
  await expect(page.getByRole("heading", { name: "This page went off the map." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
});

test("falha ao baixar o aplicativo mostra recuperação de papel e tentar novamente", async ({
  page,
}) => {
  const applicationChunk = /\/assets\/app-[^/]+\.js$/;
  await page.route(applicationChunk, (route) => {
    return route.fulfill({ status: 503, contentType: "text/javascript", body: "" });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Não foi possível abrir seu espaço." }),
  ).toBeVisible();
  await expect(page.locator(".paper-recovery__code")).toContainText("Ops");
  await expect(page.locator(".paper-digits")).toHaveCount(0);
  await expect(page.locator('link[rel="modulepreload"][href*="/app-"]')).toHaveCount(0);
  await page.unroute(applicationChunk);
  const navigation = page.waitForEvent("domcontentloaded");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await navigation;
  await expect(page.locator(".onboarding")).toBeVisible();
  await expect(page.locator(".paper-recovery")).toHaveCount(0);
  await expect(page).toHaveURL("/");
  await page.screenshot({
    path: test.info().outputPath("falha-inicializacao.png"),
    fullPage: true,
  });
});
