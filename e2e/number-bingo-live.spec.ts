import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import type { PublicLocalRoomState } from "../src/domain/local-room";

// Com o canal em tempo real ligado (como na produção), o estado que chega por ele precisa
// manter os números sorteados. Antes, o globo reiniciava e o histórico zerava logo após cada
// bolinha, porque o canal descartava `drawnIds` no bingo de números.
test("o sorteio do bingo continua na tela depois de o canal em tempo real repetir o estado", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const states = new Map<string, PublicLocalRoomState>();
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(),
    publish: async (code, state) => {
      if ((state.revision ?? 0) >= (states.get(code)?.revision ?? 0)) states.set(code, state);
    },
    streamUrl: (code) => `${testInfo.project.use.baseURL}/test-room/${code}`,
  });
  await page.route("**/api/local-room?*", async (route) => {
    const request = route.request();
    const response = await handler(
      new Request(request.url(), {
        method: request.method(),
        headers: request.headers(),
        body: request.postData() ?? "{}",
      }),
    );
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: await response.text(),
    });
  });
  await page.route("**/test-room/*", (route) =>
    route.fulfill({
      json: { path: "/", data: states.get(route.request().url().split("/").at(-1)!) },
    }),
  );
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    class TestStream extends EventTarget {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      timer: ReturnType<typeof setInterval>;
      constructor(url: string) {
        super();
        this.timer = setInterval(() => {
          void fetch(url)
            .then((r) => r.text())
            .then((data) => {
              this.onopen?.();
              this.dispatchEvent(new MessageEvent("put", { data }));
            })
            .catch(() => this.onerror?.());
        }, 150);
      }
      close() {
        clearInterval(this.timer);
      }
    }
    Object.defineProperty(window, "EventSource", { value: TestStream });
  });

  await page.goto("/sala");
  await page.getByRole("radio", { name: /^Bingo/ }).click();
  await page.getByRole("button", { name: "Criar sala", exact: true }).click();
  await page.getByRole("button", { name: /Também quero participar/ }).click();
  await page.getByRole("button", { name: "Iniciar atividade", exact: true }).click();
  const globe = page.getByLabel("Globo Saturno com as bolinhas restantes");
  const history = page.getByRole("list", { name: "Números sorteados" }).getByRole("listitem");
  await expect(globe).toHaveAttribute("data-remaining", "75");
  await expect(history).toHaveCount(0);
  // Deixa o canal repetir o estado algumas vezes antes de sortear.
  await page.waitForTimeout(600);
  await expect(history).toHaveCount(0);
  await expect(globe).toHaveAttribute("data-remaining", "75");

  await page.getByRole("button", { name: "Sortear próxima bolinha" }).click();
  await expect(page.getByRole("button", { name: "Girando…" })).toBeDisabled();
  await expect(history).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Sortear próxima bolinha" })).toBeEnabled({
    timeout: 15_000,
  });
  // O estado do canal continua chegando: o sorteio não pode sumir nem voltar ao início.
  await page.waitForTimeout(1500);
  await expect(history).toHaveCount(1);
  await expect(globe).toHaveAttribute("data-remaining", "74");
});
