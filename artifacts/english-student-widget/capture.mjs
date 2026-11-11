import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const [device, width, height] of [
    ["desktop", 1280, 900],
    ["mobile", 320, 900],
  ])
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript((theme) => {
        localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helena.privacyNotice.v1", "2026-11-05");
        localStorage.setItem("helenastudy.theme", theme);
      }, theme);
      await page.goto(process.env["WIDGET_PREVIEW_ORIGIN"] ?? "http://127.0.0.1:4174/");
      await page.getByRole("button", { name: "Mostrar Inglês", exact: true }).click();
      await page.getByRole("button", { name: "Explorar Inglês", exact: true }).waitFor();
      await page
        .getByRole("img", { name: "Olena convida você a praticar Inglês" })
        .evaluate(async (img) => {
          await img.decode();
        });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator(".math-hero-carousel").screenshot({
        path: fileURLToPath(new URL(`${device}-${theme}.png`, import.meta.url)),
        animations: "disabled",
      });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        throw Error("horizontal overflow");
      await page.close();
    }
} finally {
  await browser.close();
}
