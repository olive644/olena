import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import type { PublicLocalRoomState } from "../src/domain/local-room";

test("lobby cabe no PC, pódio tem avatares e XP não duplica ao reabrir", async ({
  page,
}, testInfo) => {
  let now = Date.now();
  const states = new Map<string, PublicLocalRoomState>();
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(),
    now: () => now,
    publish: async (code, state) => {
      states.set(code, state);
    },
    streamUrl: (code) => `${testInfo.project.use.baseURL}/test-room/${code}`,
  });
  async function api(action: string, body: object) {
    const response = await handler(
      new Request(`${testInfo.project.use.baseURL}/api/local-room?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(action === "create" ? 201 : 200);
    return response.json();
  }
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
  const { code, hostToken } = await api("create", {
    settings: {
      difficulty: "mixed",
      questionCount: "all",
      roundSeconds: 30,
      teams: true,
      recordedAudioRequired: false,
      autoPlayAudio: false,
    },
  });
  await api("settings", {
    code,
    hostToken,
    settings: { shuffle: false },
    sourceDeck: [{ id: "manual-1", front: "book", back: "livro" }],
  });
  const credentials = [];
  for (let index = 0; index < 8; index++)
    credentials.push(
      await api("join", {
        code,
        displayName: `Estudante ${index + 1}`,
        avatarUrl: "/profile-avatars/oliver.webp",
      }),
    );
  await page.addInitScript(
    ({ code, hostToken }) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      if (!sessionStorage.getItem("helena:local-room-session:v1"))
        sessionStorage.setItem(
          "helena:local-room-session:v1",
          JSON.stringify({ role: "host", code, credential: hostToken }),
        );
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
    },
    { code, hostToken },
  );
  if (testInfo.project.name === "desktop") await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/sala");
  const start = page.getByRole("button", { name: "Iniciar atividade", exact: true });
  await expect(start).toBeVisible();
  await expect(page.locator(".helena-room-qr--holding img")).toHaveJSProperty("complete", true);
  await expect(page.getByRole("button", { name: "Voltar", exact: true })).toBeVisible();
  if (testInfo.project.name === "desktop") {
    const bounds = await start.boundingBox();
    expect(bounds!.y).toBeGreaterThan(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(720);
    expect(
      await page
        .locator(".local-room-fullscreen")
        .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
    ).toBe(true);
  }
  await expect(page.getByRole("heading", { name: "Lado Lunar 4" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("lobby-light.png"), fullPage: true });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.screenshot({ path: testInfo.outputPath("lobby-dark.png"), fullPage: true });
  await api("start", { code, hostToken });
  await expect(page.locator(".local-room-host-audio")).toBeVisible();
  await expect(page.locator(".local-room-scoreboard .room-player-avatar")).toHaveCount(8);
  await expect(page.locator(".local-room-countdown")).toHaveCount(0);
  await expect(page.locator(".room-clock-icon").first()).toHaveCSS("color", "rgb(38, 155, 165)");
  await page.screenshot({ path: testInfo.outputPath("round-dark.png"), fullPage: true });
  now += 3001;
  for (const credential of credentials) {
    await api("answer", {
      code,
      participantId: credential.participantId,
      participantToken: credential.participantToken,
      questionIndex: 0,
      answer: "livro",
      points: 9999,
      elapsedMs: 0,
    });
    now += 1000;
  }
  now += 3000;
  await api("next", { code, hostToken, questionIndex: 0 });
  await expect(page.locator(".local-room-podium__place")).toHaveCount(3);
  await expect(page.locator(".room-podium-standard[data-complete=true]")).toHaveCount(3);
  await expect(page.locator(".local-room-podium__place--1 .room-confetti")).toHaveCount(1);
  await expect(page.locator(".local-room-scoreboard li")).toHaveCount(8);
  await expect
    .poll(async () => {
      const header = await page.locator(".local-room-session__header").boundingBox();
      const scores = await page.locator(".room-team-scores").boundingBox();
      return scores!.y >= header!.y + header!.height;
    })
    .toBe(true);
  await expect(page.getByText("Ainda dá tempo", { exact: false })).toHaveCount(0);
  const first = await page.locator(".local-room-podium__place--1").boundingBox();
  const second = await page.locator(".local-room-podium__place--2").boundingBox();
  const third = await page.locator(".local-room-podium__place--3").boundingBox();
  expect(first!.x).toBeGreaterThan(second!.x);
  expect(first!.x).toBeLessThan(third!.x);
  expect(first!.height).toBeGreaterThan(second!.height);
  await page.screenshot({ path: testInfo.outputPath("podium-dark.png"), fullPage: true });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await expect(page.locator(".room-podium-score .room-points-icon").first()).toHaveCSS(
    "color",
    "rgb(250, 204, 21)",
  );
  await page.screenshot({ path: testInfo.outputPath("podium-light.png"), fullPage: true });
  await page.evaluate(
    ({ code, credential }) =>
      sessionStorage.setItem(
        "helena:local-room-session:v1",
        JSON.stringify({ role: "participant", code, credential }),
      ),
    { code, credential: credentials[0]!.participantToken },
  );
  await page.reload();
  await expect(page.locator(".room-reward-notice")).toContainText("+100 XP pelo 1º lugar!");
  const notice = await page.locator(".room-reward-notice").boundingBox();
  expect(notice!.y).toBeGreaterThanOrEqual(0);
  expect(notice!.y + notice!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(notice!.y).toBeLessThan(80);
  await expect(page.locator(".room-reward-notice")).toBeHidden({ timeout: 8000 });
  const ledger = await page.evaluate(() => localStorage.getItem("helena.room-xp.v1"));
  expect(JSON.parse(ledger!).total).toBe(100);
  await page.reload();
  await expect(page.locator(".local-room-podium__place")).toHaveCount(3);
  expect(await page.evaluate(() => localStorage.getItem("helena.room-xp.v1"))).toBe(ledger);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByRole("radiogroup", { name: "Atividades da sala" })).toBeVisible();
  await expect(page).toHaveURL(/\/sala$/);
});
