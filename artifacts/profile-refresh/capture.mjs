import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const [device, width] of [
    ["desktop", 1280],
    ["mobile", 320],
  ]) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      await page.addInitScript((theme) => {
        localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helena.privacyNotice.v1", "2026-11-05");
        localStorage.setItem("helenastudy.theme", theme);
      }, theme);
      await page.goto("http://127.0.0.1:4176/");
      await page.getByRole("button", { name: "Mostrar Inglês", exact: true }).click();
      await page
        .getByRole("img", { name: "Olena convida você a praticar Inglês" })
        .evaluate((img) => img.decode());
      const main = page.locator("#main-content");
      await main.dispatchEvent("touchstart", {
        touches: [{ identifier: 0, clientX: 80, clientY: 180 }],
      });
      await main.dispatchEvent("touchmove", {
        cancelable: true,
        touches: [{ identifier: 0, clientX: 80, clientY: 430 }],
      });
      await page.locator(".helena-refresh-book").evaluate((img) => img.decode());
      await page.screenshot({
        path: fileURLToPath(new URL(`${device}-${theme}.png`, import.meta.url)),
        animations: "disabled",
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
}
