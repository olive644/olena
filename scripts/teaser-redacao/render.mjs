// Renderiza quadros do teaser com o Chromium do Playwright (WebGL por software) e, opcionalmente,
// monta o MP4 com o ffmpeg. Uso:
//   node scripts/teaser-redacao/render.mjs --out <pasta> --times 2.5,12,20      (quadros-chave em PNG)
//   node scripts/teaser-redacao/render.mjs --out <pasta> --all                   (todos os quadros)
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args[at + 1];
};
const outDir = option("out");
if (!outDir) throw new Error("Informe --out <pasta>");
mkdirSync(outDir, { recursive: true });

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
// Serve public/ na raiz do site e, para o que não estiver lá, a raiz do repositório (scripts/).
const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidates = [join(root, "public", path), join(root, path)];
  const file = candidates.find((candidate) => existsSync(candidate) && !candidate.endsWith("\\") && extname(candidate));
  if (!file) {
    response.statusCode = 404;
    response.end();
    return;
  }
  response.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream");
  createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (error) => console.error("pageerror:", error.message));
  page.on("console", (message) => message.type() === "error" && console.error("console:", message.text()));
  await page.goto(`${base}/scripts/teaser-redacao/stage.html`);
  await page.waitForFunction(() => window.stageReady === true, undefined, { timeout: 60000 });
  const info = await page.evaluate(() => window.teaser);
  const demo = args.includes("--demo");
  const frames = demo && option("times")
    ? option("times").split(",").map((second) => Math.round(Number(second) * info.FPS))
    : demo
    ? Array.from({ length: Math.round(info.DEMO_SECONDS * info.FPS) }, (_, index) => index)
    : args.includes("--all")
    ? Array.from({ length: Math.round(info.SCENES.at(-1).to * info.FPS) }, (_, index) => index)
    : (option("times") ?? "0").split(",").map((second) => Math.round(Number(second) * info.FPS));
  for (const frame of frames) {
    const png = await page.evaluate(([index, demoMode]) => {
      (demoMode ? window.renderDemoFrame : window.renderFrame)(index);
      return document.getElementById("out").toDataURL("image/png");
    }, [frame, demo]);
    const file = join(outDir, `frame-${String(frame).padStart(5, "0")}.png`);
    writeFileSync(file, Buffer.from(png.split(",")[1], "base64"));
    if (!demo) console.log(file);
  }
  const mp4 = option("mp4");
  if (mp4) {
    const ffmpeg = option("ffmpeg") ?? "ffmpeg";
    execFileSync(ffmpeg, ["-y", "-framerate", String(info.FPS), "-i", join(outDir, "frame-%05d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", mp4], { stdio: "ignore" });
    console.log(mp4);
  }
} finally {
  await browser.close();
  server.close();
}
