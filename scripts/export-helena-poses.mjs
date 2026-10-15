import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

// Exporta a própria arte do Rive, sem redesenhar a estrela ou a Helena.
const baseURL = process.argv[2] ?? "http://127.0.0.1:4225";
const browser = await chromium.launch({
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  headless: true,
});
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.route("**/mascot-export", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><canvas id="art" width="128" height="128"></canvas>',
    }),
  );
  await page.goto(`${baseURL}/mascot-export`);
  await page.addScriptTag({ url: `${baseURL}/helena-assistant/rive.js?v=2.43.0` });
  await page.evaluate(async () => {
    window.rive.RuntimeLoader.setWasmUrl("/helena-assistant/rive.wasm?v=2.43.0");
    await new Promise((resolve, reject) => {
      const instance = new window.rive.Rive({
        src: "/helena-assistant/helena.riv?v=1",
        canvas: document.querySelector("canvas"),
        stateMachines: "Helena",
        autoplay: true,
        layout: new window.rive.Layout({ fit: window.rive.Fit.Contain }),
        onLoad: () => {
          instance.resizeDrawingSurfaceToCanvas();
          instance.pause();
          instance.drawFrame();
          window.mascot = instance;
          resolve();
        },
        onLoadError: reject,
      });
    });
  });
  for (const pose of ["star", "helena"]) {
    if (pose === "helena") {
      await page.evaluate(() => {
        window.mascot.stateMachineInputs("Helena").find((input) => input.name === "aberta").value =
          true;
        window.mascot.play();
      });
      await page.waitForTimeout(1600);
      await page.evaluate(() => {
        window.mascot.pause();
        window.mascot.drawFrame();
      });
    }
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const dataURL = await page
      .locator("canvas")
      .evaluate((canvas) => canvas.toDataURL("image/png"));
    await writeFile(
      `public/helena-assistant/${pose}-rive.png`,
      Buffer.from(dataURL.split(",")[1], "base64"),
    );
    console.log(`Exportado ${pose}-rive.png do arquivo original`);
  }
} finally {
  await browser.close();
}
