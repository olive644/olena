import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { advanceFocusClock } from "./focus-clock";

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const policy = config.headers[0]!.headers.find(
  (header) => header.key === "Content-Security-Policy",
)!.value;

test("widget do Espaço usa o tomate Rive atual, sem som", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ studentResume: { focus: { mode: "pomodoro", at: Date.now() } } }),
    );
    const sounds: string[] = [];
    Object.assign(window, { widgetSounds: sounds });
    HTMLMediaElement.prototype.play = function () {
      sounds.push(this.src);
      return Promise.resolve();
    };
  });
  await page.goto("/");
  const tomato = page.locator(".student-focus-art .pomodoro-tomato-live");
  await expect(tomato).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await expect(tomato.locator("canvas")).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { widgetSounds: string[] }).widgetSounds),
  ).toEqual([]);
});

async function openPomodoro(page: Page, requests: string[] = [], errors: string[] = []) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/pomodoro-tomato\/tomato\.riv/.test(request.url())) requests.push(request.url());
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
    // registra os sons tocados sem depender do dispositivo de áudio
    const plays: string[] = [];
    Object.assign(window, { plays });
    HTMLMediaElement.prototype.play = function () {
      plays.push(this.src);
      return Promise.resolve();
    };
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ studentResume: { focus: { mode: "pomodoro", at: Date.now() } } }),
    );
  });
  // relógio falso que continua correndo: dá para avançar minutos sem esperar e o Rive segue animando
  await page.clock.install({ time: new Date("2026-10-19T12:00:00") });
  await page.clock.resume();
  await page.goto("/foco");
}

test("o tomate é comido em oito mordidas sincronizadas com o tempo e brota de novo", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  await openPomodoro(page, requests, errors);
  const tomato = page.getByRole("img", { name: "Tomate Pomodoro em papel recortado" });
  await expect(tomato).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
  await expect(tomato.locator("canvas")).toBeVisible();
  // a minhoca do canvas (que ondula parada) substitui o quadro estático
  await expect(page.locator(".pomodoro-worm")).toHaveCSS("opacity", "0");
  expect(requests.length).toBeGreaterThan(0);
  await expect(tomato).toHaveAttribute("data-stage", "0");

  await page.getByRole("button", { name: "Começar" }).click();
  // 25 minutos: a primeira mordida chega em 3 min 7,5 s
  await advanceFocusClock(page, 180_000);
  await expect(tomato).toHaveAttribute("data-stage", "0");
  await page.clock.fastForward("00:12");
  await expect(tomato).toHaveAttribute("data-stage", "1");
  // a primeira mordida toca o som da mordida, uma vez, sob a CSP de produção
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { plays: string[] }).plays))
    .toEqual([
      expect.stringContaining("/pomodoro-tomato/comecar.wav"),
      expect.stringContaining("/pomodoro-tomato/mordida.wav"),
    ]);
  await advanceFocusClock(page, 570_000);
  await expect(tomato).toHaveAttribute("data-stage", "4");
  await advanceFocusClock(page, 710_000);
  await expect(tomato).toHaveAttribute("data-stage", "7");

  // o canvas desenha o tomate comido: sobram pixels opacos
  const painted = await tomato.locator("canvas").evaluate((element) => {
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

  // reiniciar o contador faz o tomate voltar inteiro
  await page.getByRole("button", { name: "Pausar" }).click();
  await page.getByRole("button", { name: "Reiniciar contador" }).click();
  await expect(tomato).toHaveAttribute("data-stage", "0");
  // cada botão tem o seu som
  const plays = await page.evaluate(() => (window as unknown as { plays: string[] }).plays);
  expect(plays.slice(-2).map((src) => src.split("/").pop())).toEqual([
    "pausar.wav",
    "reiniciar.wav",
  ]);
  expect(errors).toEqual([]);
});

test("com movimento reduzido o tomate é a imagem da etapa e nada de Rive é baixado", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPomodoro(page, requests);
  const tomato = page.getByRole("img", { name: "Tomate Pomodoro em papel recortado" });
  await expect(tomato).toHaveAttribute("data-stage", "0");
  await expect(tomato.locator("canvas")).toHaveCount(0);
  await expect(page.locator(".pomodoro-worm")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Começar" }).click();
  await advanceFocusClock(page, 760_000);
  await expect(tomato).toHaveAttribute("data-stage", "4");
  await expect(tomato.locator("img")).toHaveAttribute("src", "/pomodoro-tomato/estagio-4.webp");
  expect(requests).toEqual([]);
});
