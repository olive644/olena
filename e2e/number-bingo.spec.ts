import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";

test("bingo solar entra pela modalidade, cria sala e confere a cartela", async ({
  page,
}, testInfo) => {
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(),
    publish: async () => {},
    streamUrl: () => "/test-stream",
  });
  await page.route("**/api/local-room?*", async (route) => {
    const response = await handler(
      new Request(route.request().url(), {
        method: "POST",
        body: route.request().postData() ?? "{}",
      }),
    );
    await route.fulfill({
      status: response.status,
      body: await response.text(),
      contentType: "application/json",
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    Object.defineProperty(window, "EventSource", {
      value: class extends EventTarget {
        onopen = null;
        onerror = null;
        close() {}
      },
    });
  });
  await page.goto("/sala");
  await page.getByRole("radio", { name: /^Bingo/ }).click();
  const modes = page.getByRole("group", { name: "Modo de partida" });
  await expect(modes.getByRole("button")).toHaveCount(5);
  for (const name of ["Linha", "Coluna", "Diagonal", "Quatro cantos", "Cartela cheia"]) {
    const button = modes.getByRole("button", { name: new RegExp("^" + name) });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await modes.getByRole("button", { name: /^Linha/ }).click();
  await expect(page.getByRole("slider", { name: "Tempo por pergunta" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Dificuldade" })).toHaveCount(0);
  await expect(page.locator(".main-content")).toHaveCSS(
    "background-image",
    /paper-sky-pattern-light/,
  );
  await expect(modes.getByRole("button", { name: /^Linha/ })).toHaveCSS(
    "background-color",
    "rgb(124, 58, 237)",
  );
  await expect(modes.getByRole("button", { name: /^Coluna/ })).toHaveCSS(
    "color",
    "rgb(15, 15, 20)",
  );
  await page.screenshot({
    path: testInfo.outputPath("bingo-modes-light.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Criar sala", exact: true }).click();
  await page.getByRole("button", { name: /Também quero participar/ }).click();
  await page.getByRole("button", { name: "Iniciar atividade", exact: true }).click();
  const card = page.getByRole("region", { name: "Minha cartela" });
  const globe = page.getByLabel("Globo Saturno com as bolinhas restantes");
  await expect(globe).toBeVisible();
  await expect(globe).toHaveAttribute("data-remaining", "74");
  await expect(page.locator(".bingo-rule")).toHaveCount(0);
  await expect(page.getByText("Complete sua constelação")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar sala", exact: true })).toHaveCount(0);
  await expect(card.locator(".bingo-card-grid button")).toHaveCount(25);
  await expect(card.locator(".bingo-planet")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: /Som ligado|Som desligado|Desativar sons/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sol, centro livre" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /Ouvir/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Bingo!", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Ainda não completou/ })).toBeVisible();
  await page.getByRole("button", { name: "Sortear próxima bolinha" }).click();
  await expect(page.getByRole("button", { name: "Girando…", exact: true })).toBeDisabled();
  const during = await globe.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await expect
    .poll(() => globe.evaluate((el) => (el as HTMLCanvasElement).toDataURL()))
    .not.toBe(during);
  await expect(page.getByRole("status").filter({ hasText: "A bolinha está saindo" })).toBeVisible();
  await page
    .locator(".bingo-saturn-panel")
    .screenshot({ path: testInfo.outputPath("approved-saturn-exit.png") });
  await expect(page.getByRole("status").filter({ hasText: /^Saiu / })).toBeVisible({
    timeout: 6000,
  });
  const flight = await page.locator(".bingo-flying").boundingBox();
  const stage = await globe.boundingBox();
  expect(flight).not.toBeNull();
  expect(stage).not.toBeNull();
  expect(flight!.x).toBeGreaterThanOrEqual(stage!.x - 1);
  expect(flight!.x + flight!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
  expect(flight!.y).toBeGreaterThanOrEqual(stage!.y - 1);
  expect(flight!.y + flight!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 1);
  await page
    .locator(".bingo-saturn-panel")
    .screenshot({ path: testInfo.outputPath("approved-saturn-reveal.png") });
  await expect(
    page.getByRole("list", { name: "Números sorteados" }).getByRole("listitem"),
  ).toHaveCount(2, { timeout: 12000 });
  await expect(page.getByRole("button", { name: "Sortear próxima bolinha" })).toBeEnabled();
  await expect(globe).toHaveAttribute("data-remaining", "73");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page
    .getByRole("region", { name: "Bingo de números" })
    .evaluate((el) => el.scrollIntoView());
  await page.screenshot({
    path: testInfo.outputPath("bingo-solar-light.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await expect(card.locator(".paper-digits").first()).toHaveCSS("--digit-face", "#292432");
  await page.screenshot({ path: testInfo.outputPath("bingo-solar-dark.png"), fullPage: true });
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await card.screenshot({
    path: testInfo.outputPath("bingo-card-dark.png"),
    animations: "disabled",
  });
});
