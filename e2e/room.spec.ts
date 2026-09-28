import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import type { PublicLocalRoomState } from "../src/domain/local-room";

// Real room handler and optimistic transactions, with a deterministic transport
// adapter instead of production Firebase. Each participant has isolated storage.
for (const activity of ["listening", "bingo"] as const) {
  test(`dois dispositivos completam ${activity} e retomam a identidade`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    const states = new Map<string, PublicLocalRoomState>();
    const handler = createLocalRoomHandler({
      store: createMemoryRoomStore(),
      publish: async (code, state) => {
        if ((state.revision ?? 0) >= (states.get(code)?.revision ?? 0)) states.set(code, state);
      },
      streamUrl: (code) => `${testInfo.project.use.baseURL}/test-room/${code}`,
    });
    const hostViewport =
      testInfo.project.name === "mobile"
        ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
        : { viewport: { width: 1280, height: 900 }, isMobile: false };
    const contexts = await Promise.all([
      browser.newContext(hostViewport),
      browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
      browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
    ]);
    try {
      for (const context of contexts) {
        await context.route("**/api/local-room?*", async (route) => {
          const request = route.request();
          const body = request.postDataJSON() as { settings?: { activity?: string } };
          if (request.url().includes("action=settings") && body.settings?.activity) {
            await new Promise((resolve) => setTimeout(resolve, 700));
          }
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
      await host.addInitScript(() => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      });
      await host.goto("/");
      await host
        .getByRole("button", {
          name: "Praticar",
          exact: true,
        })
        .click();
      await expect(host.getByRole("heading", { name: "Pratique para lembrar." })).toBeVisible();
      await host.screenshot({ path: testInfo.outputPath("practice.png") });
      await host.getByRole("button", { name: "Abrir Modo Sala", exact: true }).click();
      await host.getByRole("button", { name: "Criar sala", exact: true }).click();
      await expect(host.getByRole("radiogroup", { name: "Atividades da sala" })).toBeVisible();
      await expect(host.getByRole("combobox", { name: "Material da sala" })).toHaveCount(0);
      await expect(
        host.getByRole("checkbox", { name: "Aceitar um pequeno erro de digitação" }),
      ).toHaveCount(0);
      const shuffleQuestions = host.getByRole("checkbox", { name: "Embaralhar questões" });
      await expect(shuffleQuestions).toHaveCSS("appearance", "none");
      await expect(shuffleQuestions).toHaveCSS("background-color", "rgb(250, 204, 21)");
      if (testInfo.project.name === "mobile") {
        const settingsColumns = await host
          .locator(".local-room-settings__panel")
          .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
        expect(settingsColumns).toBe(1);
        await host.locator(".local-room-settings").screenshot({
          path: testInfo.outputPath("room-mobile-settings.png"),
        });
      }
      const selectedActivity = host.locator('.local-room-activity[aria-checked="true"]');
      await selectedActivity.hover();
      await expect(selectedActivity).toHaveCSS("background-color", "rgb(116, 51, 224)");
      await expect(selectedActivity).toHaveCSS("color", "rgb(255, 249, 239)");
      await host.locator(".local-room-share img").evaluate(async (image) => {
        await (image as HTMLImageElement).decode();
      });
      const qrBounds = await host.locator(".local-room-share svg[aria-label]").boundingBox();
      expect(qrBounds?.width).toBeGreaterThanOrEqual(120);
      expect(Math.abs((qrBounds?.width ?? 0) - (qrBounds?.height ?? 0))).toBeLessThan(1);
      await expect(host.locator(".local-room-share [data-qr-finder]")).toHaveCount(3);
      await expect(host.locator(".local-room-share [data-qr-logo]")).toHaveAttribute(
        "href",
        "/favicon-star.svg",
      );
      await expect(host.locator(".helena-room-qr--holding svg")).toHaveAttribute(
        "data-qr-error-correction",
        "H",
      );
      await expect(host.locator(".helena-room-qr--holding svg rect")).toHaveCount(9);
      await host.locator(".local-room-share__code").scrollIntoViewIfNeeded();
      await host.screenshot({ path: testInfo.outputPath("room-paper.png") });
      await host.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await expect(shuffleQuestions).toHaveCSS("background-color", "rgb(250, 204, 21)");
      await host.screenshot({
        path: testInfo.outputPath("room-paper-dark.png"),
        animations: "disabled",
      });
      await host.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      if (activity === "bingo") {
        const bingo = host.getByRole("radio", { name: /^Bingo/ });
        await bingo.click();
        await expect(bingo).toHaveAttribute("aria-checked", "true");
        await expect(host.getByText("Preparando atividade…")).toBeVisible();
        await expect(host.getByText("Preparando atividade…")).toHaveCount(0);
      }
      if (activity === "listening") {
        await host
          .getByLabel(/Digite ou cole palavras e traduções/)
          .fill(
            "school = escola\nfriend = amigo\nbook = livro\nwindow = janela\nteacher = professor",
          );
        await host.getByRole("button", { name: "Aplicar palavras", exact: true }).click();
        await expect(host.getByText("5 palavras adicionadas à rodada ✓")).toBeVisible();
      } else {
        await host.getByRole("combobox", { name: "Perguntas", exact: true }).selectOption("5");
      }
      const code = await host.getByLabel("Código da sala", { exact: true }).innerText();
      const players = await Promise.all(contexts.slice(1).map((c) => c.newPage()));
      await Promise.all(
        players.map(async (page, index) => {
          await page.addInitScript((i) => {
            localStorage.setItem(
              "helena.profile.v1",
              JSON.stringify({ name: `Aluno ${i}`, photoUrl: "/profile-avatars/oliver.webp" }),
            );
          }, index);
          await page.goto(`/?sala=${code}`);
          await page.getByLabel("Nome de exibição").fill(`Aluno ${index}`);
          await page.getByRole("button", { name: "Entrar", exact: true }).click();
          await expect(page.getByText("Aguardando o início")).toBeVisible();
        }),
      );
      await expect(host.locator(".local-room-participant-list li")).toHaveCount(2);
      await expect(host.locator(".local-room-participant-list img").first()).toHaveAttribute(
        "src",
        "/profile-avatars/oliver.webp",
      );
      await expect(
        host.locator(".local-room-participant-list").getByText("Pronto", { exact: true }),
      ).toHaveCount(2);
      const startButton = host.getByRole("button", { name: "Iniciar atividade" });
      await expect(startButton).toHaveCSS("background-color", "rgb(116, 51, 224)");
      await expect(startButton).toHaveCSS("background-image", /linear-gradient/);
      await expect(host.locator(".local-room-session__header .theme-toggle")).toHaveCount(0);
      expect(
        await host
          .locator(".local-room-fullscreen")
          .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true);
      const projector =
        activity === "listening"
          ? await Promise.all([
              contexts[0]!.waitForEvent("page"),
              host.getByRole("button", { name: "Modo Projetor" }).click(),
            ]).then(([page]) => page)
          : undefined;
      if (projector) {
        await expect(projector).toHaveURL(new RegExp(`/sala/${code}/projetor$`));
        await expect(projector.getByRole("main").getByText(code, { exact: true })).toBeVisible();
        await expect(projector.getByText(code, { exact: true })).toHaveCount(1);
        await expect(projector.locator(".helena-room-qr--holding")).toBeVisible();
        await expect(projector.getByRole("button", { name: "Sair da sala" })).toHaveCount(0);
        await projector.screenshot({ path: testInfo.outputPath("projector-lobby.png") });
      }
      await host.screenshot({ path: testInfo.outputPath("lobby-desktop.png") });
      await host.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await host.screenshot({
        path: testInfo.outputPath("lobby-dark.png"),
        animations: "disabled",
      });
      await host.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      await expect(host.locator("#root")).toHaveAttribute("inert", "");
      await host.getByRole("button", { name: "Iniciar atividade" }).click();
      if (projector)
        await expect(projector.getByRole("heading", { name: "Ouça com atenção" })).toBeVisible();
      await players[0]!.reload();
      for (let question = 0; question < 5; question++) {
        await expect(
          host.getByText(`Pergunta ${question + 1} de 5`, { exact: true }),
        ).toBeVisible();
        await expect(host.locator(".local-room-round__host-question span")).toHaveText(
          "Áudio reproduzido",
        );
        const word = states.get(code)!.currentQuestion!.front;
        if (activity === "listening" && question === 0) {
          await host.getByRole("button", { name: "Revelar palavra" }).click();
          await expect(host.locator(".local-room-round__host-question span")).toHaveText(
            "Áudio reproduzido",
          );
          await host.getByRole("button", { name: "Confirmar revelação" }).click();
          await expect(host.locator(".local-room-round__host-question span")).toHaveText(word);
          await host.getByRole("button", { name: "Ocultar palavra" }).click();
        }
        await Promise.all(
          (activity === "bingo" && question === 4 ? players.slice(0, 1) : players).map(
            async (page) => {
              await expect(
                page.getByText(`Pergunta ${question + 1} de 5`, { exact: true }),
              ).toBeVisible();
              if (question === 0 && page === players[0])
                await page.screenshot({ path: testInfo.outputPath("round-mobile.png") });
              if (activity === "listening") {
                await page.getByLabel("Digite a tradução").fill(word);
                await page.getByRole("button", { name: "Responder", exact: true }).click();
              } else {
                const current = states.get(code)!;
                const label = current.bingoWords!.find(
                  (card) => card.id === current.currentQuestion!.id,
                )!.text;
                await page
                  .locator(".local-room-bingo-grid")
                  .getByRole("button", { name: label, exact: true })
                  .click();
              }
            },
          ),
        );
        if (activity === "listening")
          await expect(players[0]!.getByText("Próxima pergunta em 3 segundos.")).toBeVisible();
      }
      await expect(host.getByRole("heading", { name: "Atividade concluída" })).toBeVisible();
      await expect(host.getByRole("button", { name: "Repetir" })).toBeVisible();
      await expect(host.getByRole("button", { name: "Trocar atividade" })).toBeVisible();
      await expect(host.getByRole("button", { name: "Encerrar sala" })).toBeVisible();
      expect(states.get(code)!.participants).toHaveLength(2);
      if (activity === "listening")
        expect(states.get(code)!.participants.map((p) => p.score)).toEqual([50, 50]);
      else expect(Math.max(...states.get(code)!.participants.map((p) => p.score))).toBe(50);
      await host.getByRole("button", { name: "Trocar atividade", exact: true }).click();
      for (let index = 2; index < 7; index++) {
        await handler(
          new Request(`${testInfo.project.use.baseURL}/api/local-room?action=join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              displayName: `Aluno ${index}`,
              avatarUrl: "/profile-avatars/helena.webp",
            }),
          }),
        );
      }
      const participants = host.locator(".local-room-participant-list li");
      await expect(participants).toHaveCount(7);
      const positions = await participants.evaluateAll((items) =>
        items.map((item) => {
          const bounds = item.getBoundingClientRect();
          return { x: bounds.x, y: bounds.y };
        }),
      );
      expect(positions[5]!.x).toBeCloseTo(positions[0]!.x);
      expect(positions[5]!.y).toBeGreaterThan(positions[0]!.y);
      expect(positions[6]!.x).toBeGreaterThan(positions[0]!.x);
      expect(positions[6]!.y).toBeCloseTo(positions[0]!.y);
      await participants.first().scrollIntoViewIfNeeded();
      await host.screenshot({ path: testInfo.outputPath("participants.png") });
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}
