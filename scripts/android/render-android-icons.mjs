// Gera os ícones do app Android a partir da Olena aprovada (public/olena-favicon.png).
// Saída: public/android/icon-192.png, icon-512.png (fundo transparente), icon-maskable-512.png
// (sobre o creme da marca, com o desenho dentro da zona segura de 80 %) e o ícone da loja,
// android/store/play-store-icon-512.png (sem transparência, como a Play pede).
// Usa só @napi-rs/canvas, que já chega como dependência transitiva.
// Uso: node scripts/android/render-android-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const CREAM = "#fff9ef";
// O desenho ocupa quase toda a imagem de origem (36 a 1233 de 1254 px); estas são as bordas dele.
const ART = { x: 36, y: 32, width: 1202, height: 1150 };

const source = await loadImage(root("public/olena-favicon.png"));

function render(size, { background, fill }) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);
  }
  // fill = fração do lado que o desenho ocupa; o desenho é centralizado pelas bordas dele
  const scale = (size * fill) / Math.max(ART.width, ART.height);
  const width = ART.width * scale;
  const height = ART.height * scale;
  context.drawImage(
    source,
    ART.x,
    ART.y,
    ART.width,
    ART.height,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );
  return canvas.toBuffer("image/png");
}

mkdirSync(root("public/android"), { recursive: true });
mkdirSync(root("android/store"), { recursive: true });
const outputs = [
  ["public/android/icon-192.png", render(192, { fill: 0.92 })],
  ["public/android/icon-512.png", render(512, { fill: 0.92 })],
  // Zona segura da máscara adaptável: círculo de 80 % do lado. O desenho é quase redondo, então
  // 66 % do lado cabe com folga em qualquer máscara (círculo, gota, quadrado arredondado).
  ["public/android/icon-maskable-512.png", render(512, { background: CREAM, fill: 0.66 })],
  ["android/store/play-store-icon-512.png", render(512, { background: CREAM, fill: 0.8 })],
];
for (const [path, data] of outputs) {
  writeFileSync(root(path), data);
  console.log(path, data.length, "bytes");
}
