import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDirectory = new URL("../dist/", import.meta.url);
const assetsDirectory = new URL("../dist/assets/", import.meta.url);
// 222 KiB desde a troca de marca (fonte, paleta oficial e alternância de
// tema): o hook de tema e o botão adicionam ~1 KiB, já com os ícones
// otimizados para o menor path possível. Revisar se crescer de novo.
// Shared paper-pencil loader and onboarding route: measured 223.6 KiB.
// Linux CI resolves a slightly larger dependency graph than the Windows
// development build (251.9 KiB versus 223.2 KiB for the same source).
// The three-way appearance preference (claro/escuro/sistema) and its
// paper-cut picker sheet, replacing the mobile header's track toggle, add
// ~0.9 KiB: measured 253.8 KiB.
// The versioned notebook-to-page relationship and its v6 migration bring the
// measured initial entry to 259.8 KiB. Keep a small allowance for CI variance.
const MAX_INITIAL_JS_BYTES = 262 * 1024;
// 400 KiB: App Check oficial adiciona ~44 KiB de chunks carregados somente
// quando a proteção está configurada e a sala faz uma requisição. Bingo,
// presença, material próprio e o editor manual completam o crescimento. O
// Modo Sala também passou a reusar o mesmo cliente de voz natural do Quiz
// de Escuta (NaturalVoicePlayer) em vez de chamar a Web Speech API direto.
// Controles de áudio sincronizados, cooldown, feedback com a Helena e ações de
// resultado acrescentam menos de 5 KiB. Os mundos Solo interativos acrescentam
// menos de 7 KiB ao módulo Praticar carregado sob demanda. A entrada inicial mantém 222 KiB.
// Google Auth SDK is imported only after clicking login (~124 KiB raw).
// Onboarding art is WebP; UI adds ~12 KiB raw. The five-avatar profile picker
// adds 0.3 KiB after minification. Account sync adds 3.6 KiB without bundling
// the Realtime Database SDK. The draggable mobile profile drawer keeps the
// measured total at 564.9 KiB.
// The reusable paper action icon set adds 1.3 KiB across the planner, notes,
// habits and homework chunks; the planner itself remains loaded on demand.
// The paper rose, interactive duration picker and Pomodoro apple live in the
// lazy-loaded Focus route and add 3.4 KiB without growing the initial bundle.
// Synced Pomodoro preferences and the dependency-free paper calendar bring the
// measured total to 605.4 KiB. The accurate stopwatch, animated apple mask and
// Keep a narrow ceiling while allowing minor bundler variance across CI runners.
// The three-way appearance picker (see MAX_INITIAL_JS_BYTES above) brings the
// measured total to 611.1 KiB.
// The notebook showcase, page gallery and nested editor bring the measured
// application total to 626.0 KiB.
const MAX_TOTAL_JS_BYTES = 630 * 1024;
const MAX_TTS_WORKER_BYTES = 2.25 * 1024 * 1024;
const MAX_TTS_WASM_BYTES = 22 * 1024 * 1024;
const manifest = JSON.parse(await readFile(new URL(".vite/manifest.json", distDirectory), "utf8"));
const entry = Object.values(manifest).find((item) => item.isEntry === true);
if (!entry?.file) throw new Error("Entrada principal ausente do manifesto do build.");

const initialBytes = (await stat(join(fileURLToPath(distDirectory), entry.file))).size;
const files = await readdir(assetsDirectory);
const javascriptFiles = files.filter((file) => file.endsWith(".js"));
const sizes = await Promise.all(
  javascriptFiles.map(async (file) => ({
    file,
    bytes: (await stat(join(fileURLToPath(assetsDirectory), file))).size,
  })),
);
const ttsWorker = sizes.find(
  (item) => item.file.startsWith("piper-tts.worker-") || item.file.startsWith("kokoro-tts.worker-"),
);
const applicationTotal = sizes
  .filter((item) => item !== ttsWorker)
  .reduce((sum, item) => sum + item.bytes, 0);
const wasmFiles = files.filter((file) => file.endsWith(".wasm"));
const wasmBytes = (
  await Promise.all(wasmFiles.map((file) => stat(join(fileURLToPath(assetsDirectory), file))))
).reduce((sum, item) => sum + item.size, 0);

console.log(`JavaScript inicial: ${(initialBytes / 1024).toFixed(1)} KiB`);
console.log(`JavaScript da aplicação: ${(applicationTotal / 1024).toFixed(1)} KiB`);
console.log(`Worker TTS opcional: ${((ttsWorker?.bytes ?? 0) / 1024).toFixed(1)} KiB`);
console.log(`WASM TTS opcional: ${(wasmBytes / 1024 / 1024).toFixed(1)} MiB`);
if (initialBytes > MAX_INITIAL_JS_BYTES) {
  throw new Error(
    `Entrada inicial excedida: ${(initialBytes / 1024).toFixed(1)} KiB > ${MAX_INITIAL_JS_BYTES / 1024} KiB.`,
  );
}
if (applicationTotal > MAX_TOTAL_JS_BYTES) {
  throw new Error(
    `JavaScript da aplicação excedido: ${(applicationTotal / 1024).toFixed(1)} KiB > ${MAX_TOTAL_JS_BYTES / 1024} KiB.`,
  );
}
if ((ttsWorker?.bytes ?? 0) > MAX_TTS_WORKER_BYTES)
  throw new Error(`Worker TTS excedido: ${(ttsWorker?.bytes ?? 0) / 1024} KiB.`);
if (wasmBytes > MAX_TTS_WASM_BYTES)
  throw new Error(`WASM TTS excedido: ${(wasmBytes / 1024 / 1024).toFixed(1)} MiB.`);
