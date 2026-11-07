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
  ])
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
      await page.goto(process.env["WIDGET_PREVIEW_ORIGIN"] ?? "http://127.0.0.1:4176/");
      for (const subject of ["Matemática", "Inglês"]) {
        if (subject === "Inglês")
          await page.getByRole("button", { name: "Mostrar Inglês", exact: true }).click();
        await page.getByRole("button", { name: `Explorar ${subject}`, exact: true }).waitFor();
        await page.locator(".math-hero-peek img").evaluate((img) => img.decode());
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.locator(".math-hero-carousel").screenshot({
          path: fileURLToPath(
            new URL(
              `${device}-${subject === "Inglês" ? "english" : "math"}-${theme}.png`,
              import.meta.url,
            ),
          ),
          animations: "disabled",
        });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
          throw Error("Horizontal overflow");
      }
      await page.close();
    }
} finally {
  await browser.close();
}
