import { expect, test } from "@playwright/test";

test("Playwright usa Chromium e preserva toque no projeto móvel", async ({
  browser,
  page,
  isMobile,
}) => {
  expect(browser.browserType().name()).toBe("chromium");
  expect(await page.evaluate(() => navigator.maxTouchPoints > 0)).toBe(isMobile);
});
