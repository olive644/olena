import { expect, test } from "@playwright/test";

test("as letras vêm do próprio domínio, sem pedir nada ao Google", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/googleapis\.com|gstatic\.com/.test(url.hostname)) external.push(url.hostname);
  });
  const fontFiles: string[] = [];
  page.on("response", (response) => {
    if (response.url().endsWith(".woff2")) fontFiles.push(new URL(response.url()).pathname);
  });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((font) => font.status === "loaded").map((font) => font.family),
  );
  expect(loaded.some((family) => /Manrope|Nunito/.test(family))).toBe(true);
  expect(fontFiles.length).toBeGreaterThan(0);
  expect(fontFiles.every((path) => path.startsWith("/fonts/"))).toBe(true);
  expect(external).toEqual([]);
});
