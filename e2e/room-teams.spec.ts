import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import type { PublicLocalRoomState } from "../src/domain/local-room";

test("participante escolhe equipe e anfitrião move com arraste ou botão", async ({
  browser,
}, testInfo) => {
  const states = new Map<string, PublicLocalRoomState>();
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(),
    publish: async (code, state) => {
      if ((state.revision ?? 0) >= (states.get(code)?.revision ?? 0)) states.set(code, state);
    },
    streamUrl: (code) => `${testInfo.project.use.baseURL}/test-room/${code}`,
  });
  const mobile = testInfo.project.name === "mobile";
  const contexts = await Promise.all([
    browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    }),
    browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
  ]);
  try {
    for (const context of contexts) {
      await context.route("**/api/local-room?*", async (route) => {
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
      await context.route("**/test-room/*", (route) =>
        route.fulfill({
          json: { path: "/", data: states.get(route.request().url().split("/").at(-1)!) },
        }),
      );
      await context.addInitScript(() => {
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
    }
    const host = await contexts[0]!.newPage();
    await host.goto("/sala");
    await host.getByRole("radio", { name: /Escuta coletiva/ }).click();
    await host.getByRole("button", { name: "Inglês", exact: true }).click();
    await host.getByRole("searchbox").fill("school");
    await host.getByRole("checkbox", { name: /school/ }).click();
    await host.getByRole("button", { name: "Responder em equipes" }).click();
    await expect(host.getByRole("button", { name: "Responder em equipes" })).toHaveCSS(
      "border-color",
      "rgb(250, 204, 21)",
    );
    await host.getByRole("button", { name: "Criar sala", exact: true }).click();
    const code = await host.getByLabel("Código da sala", { exact: true }).innerText();
    const player = await contexts[1]!.newPage();
    await player.addInitScript(() =>
      localStorage.setItem(
        "helena.profile.v1",
        JSON.stringify({ name: "Ana", photoUrl: "/profile-avatars/oliver.webp" }),
      ),
    );
    await player.goto(`/?sala=${code}`);
    await player.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(player.getByRole("heading", { name: "Escolha sua equipe" })).toBeVisible();
    await player.getByRole("button", { name: "Entrar no Lado Solar" }).click();
    await expect(host.getByRole("button", { name: "Mover Ana para Lado Lunar" })).toBeVisible();
    await expect(host.getByLabel("Placar por equipe")).toHaveCount(0);
    if (mobile) {
      await host.getByRole("button", { name: "Mover Ana para Lado Lunar" }).click();
    } else {
      const grip = host.getByRole("button", { name: "Arrastar Ana" });
      await grip.scrollIntoViewIfNeeded();
      const from = await grip.boundingBox();
      const to = await host.locator('[data-room-team="Roxo"]').boundingBox();
      await host.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
      await host.mouse.down();
      await host.mouse.move(to!.x + to!.width / 2, to!.y + 20, { steps: 8 });
      await host.mouse.up();
    }
    await expect(host.getByRole("button", { name: "Mover Ana para Lado Solar" })).toBeVisible();
    await expect(player.getByRole("button", { name: "Entrar no Lado Lunar" })).toBeDisabled();
    await host.locator(".room-team-board").screenshot({
      path: testInfo.outputPath("team-selection-light.png"),
      animations: "disabled",
    });
    await host.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await host.locator(".room-team-board").screenshot({
      path: testInfo.outputPath("team-selection-dark.png"),
      animations: "disabled",
    });
    expect(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await host.getByRole("button", { name: "Iniciar atividade" }).click();
    await expect.poll(() => states.get(code)?.phase).toBe("playing");
    expect(states.get(code)?.participants[0]?.team).toBe("Roxo");
    await expect(player.getByRole("heading", { name: "Escolha sua equipe" })).toHaveCount(0);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
