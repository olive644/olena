import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import { READY_LISTENING_DECK, READY_LISTENING_SOURCE } from "../src/domain/ready-listening-words";

test("organizador joga, contador centralizado e API recupera sala sem stream", async ({
  page,
}, testInfo) => {
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(),
    publish: async () => {},
    streamUrl: () => "https://example.invalid/stream",
  });
  async function api(action: string, body: object) {
    const response = await handler(
      new Request(`${testInfo.project.use.baseURL}/api/local-room?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    expect(response.ok).toBe(true);
    return response.json();
  }
  const { code, hostToken } = await api("create", {
    settings: {
      difficulty: "mixed",
      questionCount: "all",
      roundSeconds: 30,
      recordedAudioRequired: false,
      shuffle: false,
      subjectName: READY_LISTENING_SOURCE,
      readyWordIds: [READY_LISTENING_DECK[0]!.id],
    },
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
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  });
  await page.addInitScript(
    ({ code, hostToken }) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      sessionStorage.setItem(
        "helena:local-room-session:v1",
        JSON.stringify({ role: "host", code, credential: hostToken }),
      );
      class InterruptedStream {
        onopen: (() => void) | null = null;
        onerror: (() => void) | null = null;
        timer: ReturnType<typeof setTimeout>;
        constructor() {
          this.timer = setTimeout(() => this.onerror?.(), 0);
        }
        addEventListener() {}
        close() {
          clearTimeout(this.timer);
        }
      }
      Object.defineProperty(window, "EventSource", { value: InterruptedStream });
    },
    { code, hostToken },
  );
  if (testInfo.project.name === "desktop") await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/sala");
  await page.getByRole("button", { name: "Também quero participar" }).click();
  await expect(page.getByRole("button", { name: "Participando da atividade" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Iniciar atividade", exact: true }).click();
  const countdown = page.locator(".local-room-countdown");
  await expect(countdown).toBeVisible();
  await expect(page.getByRole("button", { name: "Ouvir novamente", exact: true })).toBeDisabled();
  const viewport = page.viewportSize()!;
  const overlay = await countdown.boundingBox();
  expect(overlay!.width).toBe(viewport.width);
  const connection = page.locator(".local-room-connection");
  if (await connection.count()) {
    expect((await connection.boundingBox())!.height).toBeLessThan(60);
  }
  await expect
    .poll(async () => {
      const bounds = await countdown.locator(".paper-digits svg").boundingBox();
      return bounds ? Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2) : 1000;
    })
    .toBeLessThan(3);
  const digit = await countdown.locator(".paper-digits svg").boundingBox();
  expect(digit!.height).toBeGreaterThan(50);
  expect(digit!.y).toBeGreaterThan(0);
  expect(digit!.y + digit!.height).toBeLessThan(viewport.height);
  await page.screenshot({ path: testInfo.outputPath("countdown-centered.png") });
  await expect(countdown).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ouvir novamente", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Digite a tradução")).toBeVisible();
  await expect(page.getByRole("button", { name: "Revelar palavra" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Modo Projetor" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Digite a tradução")).toBeVisible();
  await expect(page.getByText("Reconectando sala…", { exact: true })).toHaveCount(0);
  await page.getByLabel("Digite a tradução").fill(READY_LISTENING_DECK[0]!.back);
  await page.getByRole("button", { name: "Responder", exact: true }).click();
  await expect(page.locator(".local-room-answer-feedback")).toHaveClass(/is-correct/);
  await expect(page.locator(".room-confetti i")).toHaveCount(48);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => (document.documentElement.dataset["theme"] = value), theme);
    await page.screenshot({ path: testInfo.outputPath(`english-feedback-${theme}.png`) });
  }
  await expect(page.getByRole("button", { name: "Repetir", exact: true })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.locator(".local-room-podium__place--1")).toBeVisible();
  await expect(page.getByText("Reconectando sala…", { exact: true })).toHaveCount(0);
});
