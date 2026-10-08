import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import type { PublicLocalRoomState } from "../src/domain/local-room";

test("lobby mantém sala no Voltar, nível, presença e confirmação somente ao sair", async ({
  page,
}, testInfo) => {
  let latest: PublicLocalRoomState;
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(),
    publish: async (_code, state) => {
      latest = state;
    },
    streamUrl: () => `${testInfo.project.use.baseURL}/presence-stream`,
  });
  const post = async (action: string, body: object) => {
    const response = await handler(
      new Request(`https://test/api/local-room?action=${action}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    expect(response.ok).toBe(true);
    return response.json();
  };
  const room = (await post("create", {
    settings: { activity: "bingo", bingoMode: "line", bingoPhysical: true },
  })) as { code: string; hostToken: string };
  await post("join", { code: room.code, displayName: "Ana", level: 3 });
  await page.route("**/api/local-room?*", async (route) => {
    const request = route.request();
    const response = await handler(
      new Request(request.url(), { method: request.method(), body: request.postData() ?? "{}" }),
    );
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: await response.text(),
    });
  });
  await page.route("**/presence-stream", (route) =>
    route.fulfill({ json: { path: "/", data: latest } }),
  );
  await page.addInitScript(({ code, hostToken }) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    sessionStorage.setItem(
      "helena:local-room-session:v1",
      JSON.stringify({ code, role: "host", credential: hostToken }),
    );
    class Stream extends EventTarget {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      timer: ReturnType<typeof setInterval>;
      constructor(url: string) {
        super();
        this.timer = setInterval(
          () =>
            void fetch(url)
              .then((r) => r.text())
              .then((data) => {
                this.onopen?.();
                this.dispatchEvent(new MessageEvent("put", { data }));
              }),
          250,
        );
      }
      close() {
        clearInterval(this.timer);
      }
    }
    Object.defineProperty(window, "EventSource", { value: Stream });
  }, room);
  await page.goto("/sala");
  await expect(page.getByLabel("Nível 3", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remover Ana da sala" })).toBeVisible();
  await expect(page.getByText("Quem tem o código ainda pode entrar.")).toHaveCount(0);
  await page.getByRole("button", { name: "Fechar entrada", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reabrir entrada", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reabrir entrada", exact: true }).click();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: new RegExp(`Retomar sala ${room.code}`) }),
  ).toBeVisible();
  expect(latest!.phase).toBe("lobby");
  expect(latest!.participants).toHaveLength(1);
  await page.getByRole("button", { name: new RegExp(`Retomar sala ${room.code}`) }).click();
  const bia = await post("join", { code: room.code, displayName: "Bia", level: 2 });
  await expect(page.locator(".room-presence-reaction")).toContainText("Bia");
  await post("leave", { code: room.code, role: "participant", credential: bia.participantToken });
  await expect(page.locator(".room-presence-reaction")).toContainText("saiu da sala");
  await page.screenshot({ path: testInfo.outputPath("lobby-papel.png"), fullPage: true });
  await page.getByRole("button", { name: "Sair da sala", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Sair e encerrar a sala?", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancelar", exact: true })).toHaveCSS(
    "color",
    "rgb(41, 36, 50)",
  );
  await page.screenshot({ path: testInfo.outputPath("confirmacao-papel.png"), fullPage: true });
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(latest!.phase).toBe("lobby");
});
