import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

// Exporta o repouso do próprio Rive para o primeiro quadro acessível, sem redesenhar Oliver.
const base = process.argv[2] ?? "http://127.0.0.1:4176";
const destination = process.argv[3] ?? "/tmp/oliver-widget-rest.png";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.route("**/widget-export", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><canvas width="900" height="600"></canvas>',
    }),
  );
  await page.goto(`${base}/widget-export`);
  await page.addScriptTag({ url: `${base}/helena-assistant/rive.js` });
  await page.evaluate(async () => {
    window.rive.RuntimeLoader.setWasmUrl("/helena-assistant/rive.wasm");
    await new Promise((resolve, reject) => {
      const instance = new window.rive.Rive({
        src: "/oliver-peeking-widget/oliver.riv?v=2",
        canvas: document.querySelector("canvas"),
        animations: "ambiente",
        autoplay: false,
        layout: new window.rive.Layout({ fit: window.rive.Fit.Contain }),
        onLoad: () => {
          instance.resizeDrawingSurfaceToCanvas();
          instance.scrub("ambiente", 0);
          instance.drawFrame();
          window.widgetExport = instance;
          resolve();
        },
        onLoadError: reject,
      });
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const data = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL("image/png").split(",")[1]);
  await writeFile(destination, Buffer.from(data, "base64"));
  console.log(destination);
} finally {
  await browser.close();
}
