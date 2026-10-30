import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const mobile of [false, true])
    for (const theme of ["light", "dark"]) {
      const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
      const page = await browser.newPage({ viewport, colorScheme: theme, acceptDownloads: true });
      await page.route("https://**/*", (route) => route.abort());
      await page.addInitScript((value) => localStorage.setItem("helenastudy.theme", value), theme);
      await page.goto("http://127.0.0.1:4190/artifacts/profile-rewards-review/");
      await page.getByRole("button", { name: "Compartilhar", exact: true }).click();
      const share = page.locator(".social-share");
      await page
        .locator(".social-share-cards .arcana-paper:not(.arcana-paper--back)")
        .nth(2)
        .waitFor();
      const button = share.getByRole("button", { name: "Salvar cartão", exact: true });
      const available = await button.count();
      if (!available)
        throw Error(
          `Save label: ${await share.locator("button").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")))}`,
        );
      const event = page.waitForEvent("download");
      await button.click();
      const download = await event;
      const name = `share-${mobile ? "mobile" : "desktop"}-${theme}`;
      await download.saveAs(`artifacts/profile-rewards-review/${name}.png`);
      const bytes = await readFile(`artifacts/profile-rewards-review/${name}.png`);
      const width = bytes.readUInt32BE(16),
        height = bytes.readUInt32BE(20);
      if (width !== 720 || height !== 1160) throw Error(`Invalid PNG size ${width}x${height}`);
      results.push({
        name,
        viewport,
        theme,
        width,
        height,
        bytes: bytes.length,
        source:
          "Real local canvas export from component, fixture profile, no account/network delivery",
      });
      await page.close();
    }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/profile-rewards-review/share-check.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
