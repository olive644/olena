import { copyFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// O OCR local roda 100% no mesmo domínio: o worker, o núcleo WebAssembly e o
// idioma saem daqui em vez de um CDN. Assim o CSP de produção não precisa
// liberar nenhum host externo e o IP do aluno não vai para terceiros. Os
// arquivos vêm dos pacotes já instalados e não são versionados (public/ocr).
const modules = new URL("../node_modules/", import.meta.url);
const target = new URL("../public/ocr/", import.meta.url);

const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "lang/eng.traineddata.gz"],
];

async function copyIfChanged(from, to) {
  const source = await stat(from);
  const existing = await stat(to).catch(() => undefined);
  if (existing && existing.size === source.size && existing.mtimeMs >= source.mtimeMs) return;
  await mkdir(new URL("./", to), { recursive: true });
  await copyFile(from, to);
}

for (const [from, to] of files) {
  await copyIfChanged(new URL(from, modules), new URL(to, target)).catch((error) => {
    console.error(`Não foi possível copiar ${from} para public/ocr: ${error.message}`);
    process.exit(1);
  });
}
console.log(`OCR local: ${files.length} arquivos em ${fileURLToPath(target)}`);
