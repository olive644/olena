import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const policy = config.headers[0]!.headers.find(
  (header) => header.key === "Content-Security-Policy",
)!.value;
const ALT = "Oliver convidando você para explorar as ilhas de Matemática";

async function open(page: import("@playwright/test").Page, requests: string[], errors: string[]) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/oliver-math-islands\/|\/helena-assistant\/rive\./.test(request.url()))
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

test("Oliver anima em Rive sob a CSP de produção e a imagem segue como elemento acessível", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  await open(page, requests, errors);
  const stage = page.locator(".math-hero-oliver");
  await expect(stage).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
  const canvas = stage.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByAltText(ALT)).toHaveAttribute("src", "/oliver-math-islands.png");
  expect(requests.some((url) => url.includes("/oliver-math-islands/oliver.riv"))).toBe(true);
  // a arte não intercepta toques: o botão por baixo continua clicável
  await expect(
    page.getByRole("button", { name: "Explorar Matemática", exact: true }),
  ).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box!.width).toBeGreaterThan(100);
  // o canvas é desenhado: há pixels opacos
  const painted = await canvas.evaluate((element) => {
    const source = element as HTMLCanvasElement;
    const copy = document.createElement("canvas");
    copy.width = source.width;
    copy.height = source.height;
    const context = copy.getContext("2d")!;
    context.drawImage(source, 0, 0);
    const data = context.getImageData(0, 0, copy.width, copy.height).data;
    let opaque = 0;
    for (let index = 3; index < data.length; index += 4) if ((data[index] ?? 0) > 200) opaque++;
    return opaque;
  });
  expect(painted).toBeGreaterThan(1000);
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
  await page.waitForTimeout(2500);
  await expect(page.locator(".math-hero-oliver canvas")).toHaveCount(0);
  expect(requests.filter((url) => !url.includes("/helena-assistant/rive."))).toEqual([]);
  expect(requests.some((url) => url.includes("/oliver-math-islands/oliver.riv"))).toBe(false);
  expect(errors).toEqual([]);
});
