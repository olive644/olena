import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// The approved mascot stays intact; SVG alpha dilation supplies a crisp white edge.
const source = await readFile(new URL("../public/olena-favicon.png", import.meta.url));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs><filter id="outline" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
    <feMorphology in="SourceAlpha" operator="dilate" radius="1.3" result="edge"/>
    <feFlood flood-color="white"/><feComposite in2="edge" operator="in"/>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter></defs>
  <image x="2" y="2" width="60" height="60" filter="url(#outline)" href="data:image/png;base64,${source.toString("base64")}"/>
</svg>`;
await writeFile(new URL("../public/olena-icon-outlined.svg", import.meta.url), svg);
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const size of [16, 32, 48, 180]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`,
    );
    await page.evaluate(async () => {
      const element = document.querySelector("image");
      const image = new Image();
      image.src = element.getAttribute("href");
      await image.decode();
      await new Promise(requestAnimationFrame);
    });
    await page.screenshot({
      path: fileURLToPath(new URL(`../public/olena-icon-outlined-${size}.png`, import.meta.url)),
      omitBackground: true,
    });
  }
} finally {
  await browser.close();
}
