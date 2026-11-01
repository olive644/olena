import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const dir = "artifacts/math-oliver-review/motion-v5";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
for (const [device, viewport] of [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
])
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport,
      recordVideo: { dir, size: viewport },
      isMobile: device === "mobile",
      hasTouch: device === "mobile",
    });
    await context.route("https://**/*", (route) => route.abort());
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:4196/artifacts/math-oliver-review/?theme=${theme}&v=5`);
    await page.locator('.oliver-review-art[data-ready="true"]').waitFor();
    const speech = await page.evaluate(async () => {
      const samples = [];
      for (let i = 0; i < 14; i++) {
        await new Promise((r) => setTimeout(r, 130));
        const art = document.querySelector(".oliver-review-art"),
          c = art.querySelector("canvas"),
          g = c.getContext("2d");
        const p = g.getImageData(
          Math.floor(c.width * 0.41),
          Math.floor(c.height * 0.48),
          Math.floor(c.width * 0.27),
          Math.floor(c.height * 0.1),
        ).data;
        let dark = 0;
        for (let k = 0; k < p.length; k += 4)
          if (p[k + 3] > 100 && Math.max(p[k], p[k + 1], p[k + 2]) < 80) dark++;
        samples.push({ word: art.dataset.word, speaking: art.dataset.speaking, dark });
      }
      return samples;
    });
    assert(new Set(speech.map((s) => s.word)).size > 2, "Words must advance");
    assert(new Set(speech.map((s) => s.dark)).size > 3, "Rendered mouth must move");
    // Interrupt the running speech with consecutive reactions, then stop speech.
    for (let i = 0; i < 6; i++) {
      await page.getByRole("button", { name: "Ver outra reação" }).click();
      await page.waitForTimeout(220);
    }
    const skip = page.getByRole("button", { name: "Mostrar tudo", exact: true });
    if (await skip.isVisible()) await skip.click();
    await page.waitForTimeout(3000);
    await page
      .locator(".oliver-review-art")
      .screenshot({ path: `${dir}/${device}-${theme}-idle.png` });
    await page.getByRole("button", { name: "Agora é sua vez" }).click();
    const buttons = page.locator(".oliver-review__answers button");
    assert.equal(await buttons.count(), 4);
    const labels = await buttons.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("aria-label")),
    );
    const wrong = labels.findIndex((s) => s !== "Resposta 15");
    await buttons.nth(wrong).click();
    await page.waitForTimeout(900);
    await page
      .locator(".oliver-review__lesson")
      .screenshot({ path: `${dir}/${device}-${theme}-sad.png` });
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Resposta 15", exact: true }).click();
    await page.waitForTimeout(480);
    await page
      .locator(".oliver-review__lesson")
      .screenshot({ path: `${dir}/${device}-${theme}-jump.png` });
    await page.waitForTimeout(1800);
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      ready: document.querySelector(".oliver-review-art").dataset.ready,
      speaking: document.querySelector(".oliver-review-art").dataset.speaking,
    }));
    assert.equal(layout.overflow, false);
    assert.equal(layout.ready, "true");
    assert.deepEqual(errors, []);
    const video = page.video();
    await context.close();
    await video.saveAs(`${dir}/${device}-${theme}.webm`);
    results.push({ device, theme, speech, layout, errors });
    console.log(`${device} ${theme}: speech, interruption, sad, jump, idle checked`);
  }
await browser.close();
writeFileSync(`${dir}/ui-results.json`, JSON.stringify(results, null, 2));
