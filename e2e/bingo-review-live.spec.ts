import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import type { PublicLocalRoomState } from "../src/domain/local-room";

test("dois participantes anunciam Bingo em telas separadas e o criador continua sem pódio", async ({
  page,
  context,
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
      difficulty: "mixed",
      questionCount: 5,
      roundSeconds: 5,
    },
  })) as { code: string; hostToken: string };
  const players = [];
  for (const displayName of ["Ana", "Bia"]) {
    const joined = (await api("join", { code: room.code, displayName })) as {
      participantId: string;
      participantToken: string;
    };
    players.push({ ...joined, displayName });
  }
  await context.route("**/api/local-room?*", async (route) => {
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
  await context.route("**/test-bingo-stream", (route) =>
    route.fulfill({ json: { path: "/", data: latest } }),
  );
  const pages = [page, await context.newPage(), await context.newPage()];
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
  await expect(pages[1]!.getByRole("region", { name: "Minha cartela" })).toBeVisible();
  expect(latest!.drawnIds).toEqual([]);
  // Percorre os sorteios reais, sem alterar o baralho, para as duas cartelas independentes.
  for (let draw = 0; draw < 75; draw++) await api("next", room);
  for (const [index, player] of players.entries()) {
    const client = pages[index + 1]!;
    const card = latest!.participants.find((p) => p.id === player.participantId)!.bingoCard!;
    for (const i of [0, 4, 20, 24]) {
      const id = card[i]!;
      const cell = client.getByRole("button", {
        name: ["B", "I", "N", "G", "O"][Math.floor((Number(id) - 1) / 15)] + " " + id,
        exact: true,
      });
      await expect(cell).toBeEnabled();
      await cell.click();
      await expect
        .poll(() =>
          latest!.participants.find((p) => p.id === player.participantId)!.bingoMarks?.includes(id),
        )
        .toBe(true);
    }
    expect(latest!.bingoClaim).toBeUndefined();
    await expect(page.locator(".bingo-review")).toHaveCount(0);
    await client.getByRole("button", { name: "Bingo!", exact: true }).click();
    const hostAnnouncement = page.getByRole("dialog", { name: `${player.displayName} FEZ BINGO!` });
    await expect(hostAnnouncement).toBeVisible();
    for (const name of ["Foi engano!", "Continuar partida", "Recomeçar"])
      await expect(hostAnnouncement.getByRole("button", { name, exact: true })).toBeInViewport();
    if (testInfo.project.name === "desktop")
      await expect(
        hostAnnouncement
          .getByRole("region", { name: "Cartela para conferência" })
          .getByRole("button")
          .last(),
      ).toBeInViewport();
    await expect(
      client.getByRole("dialog", { name: `${player.displayName} FEZ BINGO!` }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "Continuar partida", exact: true }),
    ).toHaveCount(0);
    await expect(
      hostAnnouncement
        .getByRole("region", { name: "Cartela para conferência" })
        .getByRole("button", { pressed: true }),
    ).toHaveCount(5);
    await hostAnnouncement.screenshot({
      path: testInfo.outputPath(`anuncio-${player.displayName}.png`),
    });
    await hostAnnouncement.getByRole("button", { name: "Continuar partida", exact: true }).click();
    await expect(hostAnnouncement).toHaveCount(0);
    await expect(client.locator(".bingo-review")).toHaveCount(0);
    expect(latest!.phase).toBe("playing");
    expect(latest!.bingoWinnerIds).toContain(player.participantId);
    await expect(page.locator(".local-room-podium")).toHaveCount(0);
    await expect(client.locator(".local-room-podium")).toHaveCount(0);
  }
  expect(latest!.bingoWinnerIds).toEqual(players.map((p) => p.participantId));
  for (const client of pages.slice(1)) await client.close();
});
