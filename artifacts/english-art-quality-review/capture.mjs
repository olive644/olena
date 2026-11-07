import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const [device, width, height] of [
    ["desktop", 1280, 900],
    ["mobile", 320, 568],
  ]) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(
        `http://127.0.0.1:4174/artifacts/english-art-quality-review/index.html?theme=${theme}`,
      );
      await page.getByRole("heading", { name: "Oito cenas da Olena" }).waitFor();
      await page.waitForLoadState("networkidle");
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        throw Error("Horizontal overflow");
      await page.locator(".quality-comparison").screenshot({
        path: fileURLToPath(new URL(`${device}-comparison-${theme}.png`, import.meta.url)),
        animations: "disabled",
      });
      await page.locator(".quality-cleanup").screenshot({
        path: fileURLToPath(new URL(`${device}-cleanup-${theme}.png`, import.meta.url)),
        animations: "disabled",
      });
      await page
        .locator(".quality-poses")
        .last()
        .screenshot({
          path: fileURLToPath(new URL(`${device}-poses-${theme}.png`, import.meta.url)),
          animations: "disabled",
        });
      await page.close();
      console.log(`${device} ${theme}: same-scale resolution and eight poses captured`);
    }
  }
} finally {
  await browser.close();
}
