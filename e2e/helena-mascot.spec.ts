import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const policy = config.headers[0]!.headers.find(
  (header) => header.key === "Content-Security-Policy",
)!.value;

test("approved mascot loads under production CSP and reduced motion keeps chat usable", async ({
  page,
}) => {
  const graphics: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/helena-assistant\/(runtime\.js|helena\.glb)/.test(request.url()))
      graphics.push(request.url());
  });
  await page.route("**/*", async (route) => {
    if (route.request().isNavigationRequest()) {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), "content-security-policy": policy },
      });
    } else await route.continue();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/aprender");
  const launcher = page.getByRole("button", { name: "Conversar com Helena" });
  const mascot = page.locator(".helena-virtual-mascot");
  await expect(launcher).toBeVisible();
  await expect(mascot).toHaveAttribute("data-reduced", "true");
  await expect(mascot.locator("iframe")).toHaveCount(0);
  expect(graphics).toEqual([]);
  await launcher.focus();
  await launcher.press("Enter");
  await expect(page.getByRole("dialog", { name: "Helena" })).toBeVisible();
  await expect(mascot.locator("img")).toHaveAttribute("src", "/helena-assistant/helena.png");
  await page.getByRole("button", { name: "Recolher conversa", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(mascot.locator("iframe")).toHaveCount(1);
  const frame = page.frameLocator(".helena-virtual-mascot iframe");
  await expect(frame.locator("#scene")).toHaveCount(1);
  const capable = await frame
    .locator("#scene")
    .evaluate((element) => !!(element as HTMLCanvasElement).getContext("webgl2"));
  if (capable) await expect(mascot).toHaveAttribute("data-ready", "true", { timeout: 15000 });
  else await expect(mascot.locator("img")).toBeVisible();
  await launcher.click();
  await expect(page.getByRole("dialog", { name: "Helena" })).toBeVisible();
  expect(errors).toEqual([]);
});
