import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const output = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const [device, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    for (const rank of ["05", "06", "08", "09", "10"]) {
      await page.goto(`http://127.0.0.1:4186/previews/arcana.html?card=wands-${rank}`);
      const art = page.locator(".arcana-showcase img");
      await art.waitFor();
      await art.evaluate((image) => image.decode());
      if (!(await art.getAttribute("src"))?.endsWith(`wands-${rank}-count-v3.webp`))
        throw Error(`Wrong art: ${rank}`);
      for (const theme of ["light", "dark"]) {
        if (theme === "dark") await page.locator("header button").click();
        await page.evaluate(() => window.scrollTo(0, 0));
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
          throw Error(`Overflow: ${rank} ${device}`);
        const filename =
          rank === "06" ? `sample-${device}-${theme}.png` : `wands-${rank}-${device}-${theme}.png`;
        await page.screenshot({ path: path.join(output, filename), animations: "disabled" });
        console.log(`${filename}: ${viewport.width}x${viewport.height}`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
