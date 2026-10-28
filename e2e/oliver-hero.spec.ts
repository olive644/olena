import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const policy = config.headers[0]!.headers.find(
  (header) => header.key === "Content-Security-Policy",
)!.value;
const ALT = "Oliver aparece por trás do widget de Matemática";

async function open(page: import("@playwright/test").Page, requests: string[], errors: string[]) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/oliver-peeking-widget\/|\/helena-assistant\/rive\./.test(request.url()))
      requests.push(request.url());
  });
  await page.route("**/*", async (route) => {
    if (route.request().isNavigationRequest()) {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), "content-security-policy": policy },
      });
    } else await route.continue();
  });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
}

test("Oliver espreita por trás do widget sob CSP com imagem transparente e convite acessível", async ({
  page,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  await open(page, requests, errors);
  const art = page.getByAltText(ALT);
  await expect(art).toHaveAttribute("src", "/oliver-peeking-widget.webp");
  await expect.poll(() => art.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(900);
  await art.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
  const box = await art.boundingBox(),
    panel = await page.locator(".math-hero-slide").boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(panel!.y);
  expect(box!.y + box!.height).toBeLessThanOrEqual(panel!.y + panel!.height + 24);
  await expect(page.locator('.math-hero-slide img[src*="math-islands/places"]')).toHaveCount(0);
  const alpha = await art.evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, 1, 1).data[3];
  });
  expect(alpha).toBeLessThan(255);
  await expect(page.getByRole("searchbox", { name: "Buscar no Espaço", exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Explorar Matemática", exact: true }),
  ).toBeVisible();
  // Sem movimento reduzido, a animação entra sozinha depois do primeiro quadro, sob a CSP de produção.
  await expect(page.locator(".math-hero-peek")).toHaveAttribute("data-ready", "true", {
    timeout: 15000,
  });
  expect(requests.some((url) => url.includes("/oliver-peeking-widget/oliver.riv"))).toBe(true);
  expect(errors).toEqual([]);
});

test("com movimento reduzido Oliver continua só como imagem e nada de Rive é baixado", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, requests, errors);
  await expect(page.getByAltText(ALT)).toBeVisible();
  await expect(page.getByAltText(ALT)).toHaveCSS("animation-name", "none");
  await expect(page.locator(".math-hero-peek canvas")).toHaveCount(0);
  expect(requests.filter((url) => !url.includes("/helena-assistant/rive."))).toEqual([]);
  expect(requests.some((url) => url.includes("/oliver-peeking-widget/oliver.riv"))).toBe(false);
  expect(errors).toEqual([]);
});
