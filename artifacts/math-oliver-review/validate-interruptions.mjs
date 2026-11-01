import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
await page.goto("http://127.0.0.1:4196/artifacts/math-oliver-review/rig-lab.html");
await page.waitForFunction(() => window.ready);
const result = await page.evaluate(async () => {
  events.length = 0;
  const changes = [
      [0, 2, 1],
      [350, 3, 4],
      [700, 1, 5],
      [1050, 2, 2],
      [1400, 0, 0],
    ],
    start = performance.now(),
    samples = [];
  let index = 0;
  await new Promise((resolve) => {
    function frame(now) {
      const t = now - start;
      if (index < changes.length && t >= changes[index][0]) {
        setInput("clique", changes[index][1]);
        setInput("boca", changes[index][2]);
        index++;
      }
      const canvas = document.querySelector("canvas"),
        g = canvas.getContext("2d"),
        p = g.getImageData(245, 287, 167, 65).data;
      let dark = 0;
      for (let i = 0; i < p.length; i += 4)
        if (p[i + 3] > 100 && Math.max(p[i], p[i + 1], p[i + 2]) < 80) dark++;
      samples.push({ t, dark });
      if (t < 2300) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
  return {
    events,
    samples,
    inputs: rig.stateMachineInputs("Oliver").map((i) => ({ name: i.name, value: i.value })),
  };
});
const states = result.events.flatMap((e) => e.state);
for (const expected of [
  "falando",
  "tristeza-e-retomada",
  "acerto",
  "repouso",
  "boca-A",
  "boca-triste",
  "boca-feliz",
  "boca-O",
  "boca-repouso",
])
  assert(states.includes(expected), expected);
assert(
  new Set(result.samples.map((s) => s.dark)).size > 20,
  "The rendered transition must contain intermediate shapes",
);
assert.equal(result.inputs.find((i) => i.name === "boca").value, 0);
assert.equal(result.inputs.find((i) => i.name === "clique").value, 0);
writeFileSync(
  "artifacts/math-oliver-review/motion-v5/interruptions.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    states,
    samples: result.samples.length,
    distinctMouthAreas: new Set(result.samples.map((s) => s.dark)).size,
    inputs: result.inputs,
  }),
);
await browser.close();
