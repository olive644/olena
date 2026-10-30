import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const folder = "artifacts/profile-rewards-review";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const evidence = [];
try {
  for (const mobile of [false, true])
    for (const theme of ["light", "dark"]) {
      const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
      const page = await browser.newPage({ viewport, colorScheme: theme });
      await page.route("https://**/*", (route) => route.abort());
      await page.addInitScript((theme) => localStorage.setItem("helenastudy.theme", theme), theme);
      await page.goto(`http://127.0.0.1:4190/${folder}/`);
      for (const [label, surface] of [
        ["Outro perfil", "public"],
        ["Atividades", "activity"],
        ["Compartilhar", "share"],
      ]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.querySelectorAll(".review-shell img")].map((img) =>
              img.decode().catch(() => {}),
            ),
          );
        });
        if (surface === "activity") await page.locator(".social-reward").nth(2).waitFor();
        if (surface === "share")
          await page
            .locator(".social-share-cards .arcana-paper:not(.arcana-paper--back)")
            .nth(2)
            .waitFor();
        const name = `${mobile ? "mobile" : "desktop"}-${theme}-${surface}`;
        await page.screenshot({ path: `${folder}/${name}.png`, fullPage: true });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
          throw Error(`Overflow ${name}`);
        evidence.push({
          name,
          viewport,
          theme,
          url: page.url(),
          surface: "real components with local fixture, no auth or production sync",
        });
        if (surface === "activity") {
          const button = page.locator(".social-reward").nth(2).getByRole("button").first();
          await button.click();
          const dialog = page.locator(".achievement-inspection[open]");
          await dialog.waitFor();
          if (
            (await page.locator(".social-reward").nth(2).locator(".achievement-tile").count()) !== 0
          )
            throw Error("Duplicate badge under inspection");
          await page.waitForTimeout(500);
          const inspect = `${mobile ? "mobile" : "desktop"}-${theme}-badge-inspection`;
          await page.screenshot({ path: `${folder}/${inspect}.png` });
          evidence.push({
            name: inspect,
            viewport,
            theme,
            url: page.url(),
            surface: "static badge, real component with fixture",
          });
          await page.keyboard.press("Escape");
        }
      }
      await page.close();
    }
} finally {
  await browser.close();
}
const manifest = JSON.parse(await readFile(`${folder}/manifest.json`, "utf8"));
manifest.evidence.push(...evidence);
await writeFile(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ additionalCaptures: evidence.length }));
