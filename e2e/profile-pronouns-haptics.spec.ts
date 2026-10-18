import { expect, test } from "@playwright/test";

test("saved preset pronouns follow the interface without rewriting the profile", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.language", "en-US");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ name: "Drey", pronouns: "Ela/dela" }),
    );
  });
  await page.goto("/perfil");
  await expect(page.locator(".profile-cover__handle")).toContainText("She/her");
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("helena.profile.v1")!).pronouns),
  ).toBe("Ela/dela");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Switch language to Portuguese" }).click();
  await page.getByRole("button", { name: "Voltar ao perfil", exact: true }).click();
  await expect(page.locator(".profile-cover__handle")).toContainText("Ela/dela");
});

test("settings pulse once for entry, selection, checkbox and back, never on load", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    const pulses: unknown[] = [];
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (pattern: unknown) => {
        pulses.push(pattern);
        return true;
      },
    });
    Object.defineProperty(window, "settingsTestPulses", { value: pulses });
  });
  const pulses = () => page.evaluate(() => Reflect.get(window, "settingsTestPulses") as number[]);
  await page.goto("/perfil");
  await expect(page.getByRole("button", { name: "Configurações", exact: true })).toBeVisible();
  expect(await pulses()).toEqual([]);
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  expect(await pulses()).toEqual([8]);
  await page
    .getByRole("navigation", { name: "Seções do Perfil" })
    .getByRole("button", { name: "Agenda e notificações", exact: true })
    .click();
  expect(await pulses()).toEqual([8, 8]);
  await page.getByRole("checkbox", { name: /Novos seguidores/ }).uncheck();
  expect(await pulses()).toEqual([8, 8, 8]);
  await page
    .getByRole("button", {
      name: page.viewportSize()!.width <= 760 ? "Voltar às configurações" : "Voltar ao perfil",
      exact: true,
    })
    .click();
  expect(await pulses()).toEqual([8, 8, 8, 8]);
});
