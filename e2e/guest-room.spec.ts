import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";

test("o convidado escolhe um apelido só na sala e o perfil continua como Guest", async ({
  page,
}) => {
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
    localStorage.setItem("helena.guest.v1", "1");
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
  await page.getByRole("button", { name: "Criar sala", exact: true }).click();
  const nickname = page.getByLabel("Seu apelido na sala");
  await expect(nickname).toHaveValue("Guest");
  await expect(page.getByText(/continua como Guest/)).toBeVisible();
  await nickname.fill("Poli");

  const hostPlayer = page.waitForRequest(
    (request) => request.url().includes("action=host-player") && request.method() === "POST",
  );
  await page.getByRole("button", { name: /Também quero participar/ }).click();
  expect((await hostPlayer).postDataJSON()).toMatchObject({ displayName: "Poli" });

  // O apelido vale só na sala: o Perfil continua mostrando Guest.
  await page.goto("/perfil");
  await expect(page.getByText("Guest (convidado)")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("helena.guest-nickname.v1"))).toBe("Poli");
});
