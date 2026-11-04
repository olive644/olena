import { copyFile, mkdir, rm } from "node:fs/promises";
const target = new URL("../public/speech-runtime/", import.meta.url);
await mkdir(target, { recursive: true });
for (const file of ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"])
  await copyFile(
    new URL(`../node_modules/onnxruntime-web/dist/${file}`, import.meta.url),
    new URL(file, target),
  );
for (const file of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"])
  await rm(new URL(file, target), { force: true });
console.log("Reconhecimento local: runtime ONNX copiado do pacote instalado.");
