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
  await expect(card.locator(".bingo-card-grid button")).toHaveCount(25);
  await expect(page.getByRole("button", { name: "Sol, centro livre" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /Ouvir/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Bingo!", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Ainda não completou/ })).toBeVisible();
  await page.getByRole("button", { name: "Sortear próxima bolinha" }).click();
  await expect(
    page.getByRole("list", { name: "Números sorteados" }).getByRole("listitem"),
  ).toHaveCount(2);
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
  await page.screenshot({ path: testInfo.outputPath("bingo-solar-dark.png"), fullPage: true });
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await card.screenshot({
    path: testInfo.outputPath("bingo-card-dark.png"),
    animations: "disabled",
  });
});
