import { test, expect, type BrowserContext } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import type { PublicLocalRoomState } from "../src/domain/local-room";
test.afterEach(async ({ browser }) => {
  await Promise.all(browser.contexts().map((context) => context.close()));
});

for (const physical of [false, true])
  test(`três ganhadores em ordem e XP por esforço, presencial=${physical}`, async ({
    page,
    context,
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    let latest: PublicLocalRoomState;
    const handler = createLocalRoomHandler({
      store: createMemoryRoomStore(),
      publish: async (_code, state) => {
        latest = state;
      },
      streamUrl: () => `${testInfo.project.use.baseURL}/test-bingo-stream`,
    });
    const api = async (action: string, body: unknown) => {
      const response = await handler(
        new Request(`https://example.test/api/local-room?action=${action}`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      expect(response.ok).toBe(true);
      return response.json();
    };
    const room = (await api("create", {
      settings: {
        activity: "bingo",
        bingoMode: "corners",
        bingoPhysical: physical,
        difficulty: "mixed",
        questionCount: 5,
        roundSeconds: 5,
      },
    })) as { code: string; hostToken: string };
    const players = [];
    for (const displayName of ["Ana", "Bia", "Caio", "Duda"]) {
      const joined = (await api("join", { code: room.code, displayName })) as {
        participantId: string;
        participantToken: string;
      };
      players.push({ ...joined, displayName });
    }
    const configure = async (target: BrowserContext) => {
      await target.route("**/api/local-room?*", async (route) => {
        const r = route.request();
        const response = await handler(
          new Request(r.url(), { method: r.method(), body: r.postData() ?? "{}" }),
        );
        await route.fulfill({
          status: response.status,
          contentType: "application/json",
          body: await response.text(),
        });
      });
      await target.route("**/test-bingo-stream", (route) =>
        route.fulfill({ json: { path: "/", data: latest } }),
      );
    };
    await configure(context);
    const pages = [page];
    const guestContexts: BrowserContext[] = [];
    for (let i = 0; i < players.length; i++) {
      const guest = await browser.newContext({
        viewport: page.viewportSize()!,
        isMobile: testInfo.project.name === "mobile",
        hasTouch: testInfo.project.name === "mobile",
      });
      await configure(guest);
      guestContexts.push(guest);
      pages.push(await guest.newPage());
    }
    for (const [index, client] of pages.entries()) {
      await client.addInitScript(
        ({ code, role, credential }) => {
          localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
          sessionStorage.setItem(
            "helena:local-room-session:v1",
            JSON.stringify({ code, role, credential }),
          );
          class Stream extends EventTarget {
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
              }, 100);
            }
            close() {
              clearInterval(this.timer);
            }
          }
          Object.defineProperty(window, "EventSource", { value: Stream });
        },
        {
          code: room.code,
          role: index === 0 ? "host" : "participant",
          credential: index === 0 ? room.hostToken : players[index - 1]!.participantToken,
        },
      );
      await client.emulateMedia({ reducedMotion: "reduce" });
      await client.goto("/sala");
    }
    await page.getByRole("button", { name: "Iniciar atividade", exact: true }).click();
    await expect(page.locator(".local-room-countdown")).toBeVisible();
    await expect(page.locator(".local-room-countdown")).toHaveCount(0);
    if (physical)
      await expect(pages[1]!.getByRole("region", { name: "Minha cartela" })).toHaveCount(0);
    else await expect(pages[1]!.getByRole("region", { name: "Minha cartela" })).toBeVisible();
    for (const client of pages.slice(1))
      await expect(client.locator(".bingo-saturn canvas")).toHaveCount(0);
    expect(latest!.drawnIds).toEqual([]);
    const guest = pages[1]!;
    await expect(guest.locator(".bingo-participant-stage")).toBeVisible();
    await guest.emulateMedia({ reducedMotion: "no-preference" });
    await expect(guest.locator(".local-room-countdown")).toHaveCount(0);
    await api("next", room);
    await expect(guest.getByText("GLOBO RODANDO")).toBeVisible();
    await guest.screenshot({
      path: testInfo.outputPath("participante-globo-rodando.png"),
      fullPage: true,
    });
    await expect(guest.locator(".bingo-participant-reveal")).toBeVisible({ timeout: 8000 });
    await expect(guest.getByText("GLOBO RODANDO")).toHaveCount(0);
    await expect(guest.getByRole("listitem")).toHaveCount(1, { timeout: 8000 });
    expect(
      await guest
        .locator(".bingo-participant-ball polygon")
        .first()
        .evaluate((element) => getComputedStyle(element).fill),
    ).not.toBe("rgb(0, 0, 0)");
    await guest.screenshot({
      path: testInfo.outputPath("participante-primeira-bola.png"),
      fullPage: true,
    });
    await testInfo.attach("densidade-da-tela", {
      body: JSON.stringify(
        await guest.evaluate(() =>
          [".bingo-participant-stage", ".bingo-history", ".bingo-solar-card", ".bingo-claim"].map(
            (selector) => {
              const element = document.querySelector(selector);
              return { selector, box: element?.getBoundingClientRect().toJSON() };
            },
          ),
        ),
      ),
      contentType: "application/json",
    });
    await expect(guest.getByRole("button", { name: "Bingo!", exact: true })).toBeInViewport({
      ratio: 1,
    });
    if (!physical)
      await expect(
        guest.getByRole("region", { name: "Minha cartela" }).getByRole("button").last(),
      ).toBeInViewport();
    await guest.emulateMedia({ reducedMotion: "reduce" });
    // Percorre os sorteios reais, sem alterar baralho ou regra das cartelas independentes.
    for (let draw = 1; draw < 75; draw++) await api("next", room);
    for (const [index, player] of players.slice(0, 3).entries()) {
      const client = pages[index + 1]!;
      const card = latest!.participants.find((p) => p.id === player.participantId)!.bingoCard!;
      for (const i of physical ? [] : [0, 4, 20, 24]) {
        const id = card[i]!;
        const cell = client.getByRole("button", {
          name: ["B", "I", "N", "G", "O"][Math.floor((Number(id) - 1) / 15)] + " " + id,
          exact: true,
        });
        await expect(cell).toBeEnabled();
        await cell.click();
        if (index === 0 && i === 0) {
          const reaction = client.getByRole("status", { name: `Bola ${id}: WOW! +2 pontos!` });
          await expect(reaction).toBeVisible();
          const ballBox = await cell.boundingBox();
          const reactionBox = await reaction.boundingBox();
          expect(
            Math.abs(reactionBox!.x + reactionBox!.width / 2 - ballBox!.x - ballBox!.width / 2),
          ).toBeLessThan(65);
          expect(Math.abs(reactionBox!.y - ballBox!.y)).toBeLessThan(65);
          await reaction.screenshot({ path: testInfo.outputPath("reacao-pontos.png") });
          await expect(reaction).toHaveCount(0, { timeout: 3000 });
          await expect(client.locator(".bingo-points-meter")).toHaveCount(0);
        }
        await expect
          .poll(() =>
            latest!.participants
              .find((p) => p.id === player.participantId)!
              .bingoMarks?.includes(id),
          )
          .toBe(true);
      }
      expect(latest!.bingoClaim).toBeUndefined();
      await expect(page.locator(".bingo-review")).toHaveCount(0);
      await client.getByRole("button", { name: "Bingo!", exact: true }).click();
      const hostAnnouncement = page.getByRole("dialog", {
        name: `${player.displayName} FEZ BINGO!`,
      });
      await expect(hostAnnouncement).toBeVisible();
      for (const name of ["Foi engano!", "Continuar partida", "Recomeçar"])
        await expect(hostAnnouncement.getByRole("button", { name, exact: true })).toBeInViewport();
      if (!physical && testInfo.project.name === "desktop")
        await expect(
          hostAnnouncement
            .getByRole("region", { name: "Cartela para conferência" })
            .getByRole("button")
            .last(),
        ).toBeInViewport();
      await expect(client.getByText("Seu pedido de Bingo está em conferência.")).toBeVisible();
      await expect(client.locator(".bingo-review")).toHaveCount(0);
      await expect(
        client.getByRole("button", { name: "Continuar partida", exact: true }),
      ).toHaveCount(0);
      if (!physical)
        await expect(
          hostAnnouncement
            .getByRole("region", { name: "Cartela para conferência" })
            .getByRole("button", { pressed: true }),
        ).toHaveCount(5);
      await hostAnnouncement.screenshot({
        path: testInfo.outputPath(`anuncio-${player.displayName}.png`),
      });
      await hostAnnouncement
        .getByRole("button", {
          name: "Continuar partida",
          exact: true,
        })
        .click({ timeout: 10_000 });
      await expect(hostAnnouncement).toHaveCount(0);
      await expect(client.locator(".bingo-review")).toHaveCount(0);
      expect(latest!.phase).toBe(index === 2 ? "results" : "playing");
      expect(latest!.bingoWinnerIds).toContain(player.participantId);
      await expect(page.locator(".local-room-podium")).toHaveCount(index === 2 ? 1 : 0);
      await expect(client.locator(".local-room-podium")).toHaveCount(index === 2 ? 1 : 0);
    }
    expect(latest!.bingoWinnerIds).toEqual(players.slice(0, 3).map((p) => p.participantId));
    const expectedXp = physical ? 11 : 13;
    expect(latest!.participants.map((p) => p.reward?.xp)).toEqual([
      expectedXp,
      expectedXp,
      expectedXp,
      undefined,
    ]);
    expect(latest!.participants.map((p) => p.reward?.place)).toEqual([1, 2, 3, undefined]);
    await expect(page.locator(".local-room-podium__place")).toHaveCount(3);
    await expect(page.locator(".room-solar-trophy")).toHaveCount(3);
    await expect(page.locator(".bingo-winners-order .room-player-avatar")).toHaveCount(3);
    await expect(page.getByAltText("Poliana celebrando")).toHaveCount(0);
    await expect(page.locator(".room-eclipse-name")).toHaveText(["Saturno", "Júpiter", "Terra"]);
    await expect(page.getByRole("region", { name: "Ganhadores do bingo" })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`ganhadores-presencial-${physical}.png`),
      fullPage: true,
    });
    await expect
      .poll(() =>
        pages[1]!.evaluate(
          () => JSON.parse(localStorage.getItem("helena.room-xp.v1") ?? "{}").total,
        ),
      )
      .toBe(expectedXp);
    await pages[1]!.reload();
    await expect(pages[1]!.getByRole("region", { name: "Ganhadores do bingo" })).toBeVisible();
    await expect(pages[1]!.locator(".bingo-winners")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    expect(
      await pages[1]!.evaluate(
        () => JSON.parse(localStorage.getItem("helena.room-xp.v1") ?? "{}").total,
      ),
    ).toBe(expectedXp);
    for (const client of pages.slice(1, 4)) {
      await expect(client.getByRole("region", { name: "Ganhadores do bingo" })).toBeVisible();
      await expect
        .poll(() =>
          client.evaluate(
            () => JSON.parse(localStorage.getItem("helena.room-xp.v1") ?? "{}").total,
          ),
        )
        .toBe(expectedXp);
    }
    // Quem reconecta somente depois de Encerrar sala também recupera seu XP.
    await pages[2]!.evaluate(() => localStorage.removeItem("helena.room-xp.v1"));
    await page.getByRole("button", { name: "Encerrar sala", exact: true }).click();
    await expect(
      pages[2]!.getByRole("heading", { name: "Sala encerrada", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        pages[2]!.evaluate(
          () => JSON.parse(localStorage.getItem("helena.room-xp.v1") ?? "{}").total,
        ),
      )
      .toBe(expectedXp);
    await pages[2]!.reload();
    await expect(
      pages[2]!.getByRole("heading", { name: "Sala encerrada", exact: true }),
    ).toBeVisible();
    expect(
      await pages[2]!.evaluate(
        () => JSON.parse(localStorage.getItem("helena.room-xp.v1") ?? "{}").total,
      ),
    ).toBe(expectedXp);
    for (const guest of guestContexts) await guest.close();
  });
