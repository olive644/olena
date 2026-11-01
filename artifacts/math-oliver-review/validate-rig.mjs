import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const dir = "artifacts/math-oliver-review/motion-v5";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 1000, height: 900 },
  recordVideo: { dir, width: 1000, height: 900 },
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4196/artifacts/math-oliver-review/rig-lab.html");
await page.waitForFunction(() => window.ready);
const results = { errors, reactions: [], mouth: [] };
for (const [name, value, duration] of [
  ["idle", 0, 600],
  ["jump", 1, 1800],
  ["sad", 3, 2200],
  ["wave", 4, 2200],
  ["think", 5, 2800],
  ["steps", 6, 2400],
  ["listen", 7, 2000],
]) {
  await page.evaluate((v) => {
    events.length = 0;
    setInput("clique", v);
    if (v) setTimeout(() => setInput("clique", 0), 90);
  }, value);
  const frames = await page.evaluate(async (duration) => {
    const canvas = document.querySelector("canvas"),
      ctx = canvas.getContext("2d"),
      start = performance.now(),
      samples = [],
      images = [];
    let nextImage = 0;
    await new Promise((resolve) => {
      function sample(now) {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let n = 0,
          sx = 0,
          sy = 0,
          minY = 9999,
          maxY = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 100) {
            const p = i / 4,
              x = p % canvas.width,
              y = Math.floor(p / canvas.width);
            n++;
            sx += x;
            sy += y;
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
        samples.push({ t: now - start, x: sx / n, y: sy / n, minY, maxY, n });
        if (now - start >= nextImage) {
          images.push({ t: now - start, png: canvas.toDataURL() });
          nextImage += 180;
        }
        if (now - start < duration) requestAnimationFrame(sample);
        else resolve();
      }
      requestAnimationFrame(sample);
    });
    return { samples, images, events };
  }, duration);
  for (let i = 0; i < frames.images.length; i++)
    writeFileSync(
      `${dir}/${name}-${String(i).padStart(2, "0")}.png`,
      Buffer.from(frames.images[i].png.split(",")[1], "base64"),
    );
  results.reactions.push({
    name,
    ...frames,
    images: frames.images.map(({ t }, i) => ({
      t,
      file: `${name}-${String(i).padStart(2, "0")}.png`,
    })),
  });
}
for (const value of [0, 1, 2, 3, 4, 5, 0]) {
  await page.evaluate((v) => setInput("boca", v), value);
  await page.waitForTimeout(300);
  await page
    .locator("canvas")
    .screenshot({ path: `${dir}/mouth-${results.mouth.length}-${value}.png` });
  results.mouth.push({ value, events: await page.evaluate(() => events.slice(-6)) });
}
await page.screenshot({ path: `${dir}/lab.png` });
writeFileSync(`${dir}/results.json`, JSON.stringify(results, null, 2));
console.log(
  JSON.stringify({
    errors,
    reactions: results.reactions.map((r) => ({
      name: r.name,
      samples: r.samples.length,
      events: r.events,
      maxFrameDisplacement: Math.max(
        ...r.samples.slice(1).map((p, i) => Math.hypot(p.x - r.samples[i].x, p.y - r.samples[i].y)),
      ),
    })),
    mouth: results.mouth,
  }),
);
await page.close();
await browser.close();
