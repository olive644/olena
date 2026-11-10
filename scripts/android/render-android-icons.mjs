import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const { createCanvas, loadImage } = createRequire(import.meta.url)("@napi-rs/canvas");
const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const source = await loadImage(root("android/store/play-store-icon-512.png"));

for (const [name, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
]) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  if (maskable) {
    context.drawImage(source, 0, 0, 1, 1, 0, 0, size, size);
    // 56% do lado mantém a arte dentro do círculo seguro de 80%.
    const inset = Math.round(size * 0.22);
    context.drawImage(source, inset, inset, size - 2 * inset, size - 2 * inset);
  } else {
    context.drawImage(source, 0, 0, size, size);
  }
  writeFileSync(root(`public/android/${name}`), canvas.toBuffer("image/png"));
}
