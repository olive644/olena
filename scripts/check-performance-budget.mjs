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
// The editable handwriting asset flow adds about 1 KiB to the initial entry.
// Measured entry is 260.8 KiB; retain a small allowance for CI variance.
// Reliable retry and live account status add 1.1 KiB to the initial sync hook.
// Measured entry: 263.8 KiB; retain the existing small CI allowance.
// The OCR action adds a small local normalization path to the lazy notebook
// route, while bundler variance puts the measured entry at 267.2 KiB.
// Conflict-safe cloud sync adds a small guard in the initial hook; the merge
// algorithm itself stays lazy, keeping the measured entry below 269 KiB.
// Read-only notebook routing adds less than 1 KiB to the entry.
// Board preferences, page formats and notebook layout fixes bring the measured
// entry to 270.3 KiB on main. The privacy consent block and the brand footer
// share the onboarding but add no measurable weight to the entry, so the ceiling
// moves to 272 KiB to keep a small allowance for CI variance (Linux measures
// about 0.5 KiB above Windows). URL routing per tab (app-routes and useAppView) adds
// 0.8 KiB to the entry (272.6 KiB measured), so the ceiling moves to 274 KiB.
// Validated paper-tab persistence: measured 274.2 KiB, with a narrow CI allowance.
// The compact stroke storage format (read path in the initial workspace loader) adds 1.6 KiB
// (276.3 KiB measured); the ceiling moves to 278 KiB.
const MAX_INITIAL_JS_BYTES = 278 * 1024;
// Teto absoluto, separado do orçamento acima: o orçamento normal sobe a cada funcionalidade,
// com uma frase de justificativa por cima, e isso é esperado. Mas nada nesse processo avisa
// se a soma dessas subidas pequenas virar um problema grande sem ninguém perceber. Este teto
// não deveria precisar subir no dia a dia; se um PR legítimo precisar passar dele, é hora de
// uma conversa consciente sobre code-splitting ou lazy-loading, não de só editar o número.
const HARD_CEILING_INITIAL_JS_BYTES = 400 * 1024;
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
// The professional handwriting studio adds local stroke stabilization, paper
// templates, pressure-aware tools and history inside the existing lazy notes
// chunk. Measured total is 633.6 KiB; initial JavaScript remains unchanged.
// The edit and navigation tools bring the measured lazy-loaded total to
// 639.2 KiB without adding a dependency or a new initial route import.
// Draft recovery, stroke selection, sticky notes, the enlarged writing window
// and local export bring the measured total to 652.0 KiB. These tools remain
// inside the lazy notes route and add no dependency.
// Unified creation and movable annotation folders bring the measured total
// to 661 KiB. Notes UI stays lazy-loaded; no dependency was added and the
// initial entry remains below its existing 264 KiB budget.
// Pointer-based folder placement and editable text objects bring the total
// to 664.3 KiB. Both interfaces remain lazy and reuse existing state/history.
// Manual notebook page turns and local text review: measured 668.7 KiB.
// Initial entry is unchanged; these features remain in lazy-loaded chunks.
// Detailed paper instruments, live ruler and ink/width swatches add 4.3 KiB
// to the lazy editor; measured total 673.2 KiB, initial entry unchanged.
// Text erasure shares canvas coordinates and existing history; measured total
// 675.5 KiB. Allow CI variance while retaining the initial entry budget.
// Import UI and persistent page background add ~6 KiB; PDF.js is loaded only
// for PDF imports and tracked separately with its worker below.
// On-sheet image placement and complete sticky text layout add about 2.5 KiB
// in the lazy editor. Measured total: 686 KiB; initial entry stays below 264 KiB.
// Visible cloud state, retry handling and account controls add 3.4 KiB across
// the entry and lazy Profile route. Measured total: 689.4 KiB.
// Keyboard shortcuts, tablet pen detection and tilt-aware ink width live
// entirely inside the existing lazy handwriting studio chunk; no dependency
// was added and the initial entry is unchanged. Measured total: 693.5 KiB.
// Tesseract.js is loaded only after an explicit OCR action. Its optional
// engine and runtime add about 46 KiB to the lazy application total. The
// notebook collaboration client adds a small realtime transport and presence
// UI; keep its new ceiling explicit rather than silently dropping the guard.
// Optional notebook file menus, multi-page PDF and collaboration reconciliation.
// Measured application total: 774 KiB. No new runtime dependency.
// The professional stroke engine (single-fill variable-width outline, 1 Euro
// filter over a velocity predictor, live ink layer and stroke tip prediction)
// lives in the lazy handwriting studio chunk and adds about 7 KiB: 781.2 KiB
// measured, initial entry unchanged at 269.8 KiB. No new runtime dependency.
// Notebook board settings and page formats measure 789.3 KiB on main; the privacy
// consent block and the brand footer add 1.2 KiB (790.5 KiB). The ceiling moves
// to 795 KiB for CI variance. The resizable notebook text frame adds 1.9 KiB
// to the lazy editor chunk (796.9 KiB measured); keep a 800 KiB ceiling.
// The account deletion panel and flow add 4 KiB across the lazy profile and cloud chunks
// (801.1 KiB measured); the ceiling moves to 805 KiB.
// The listening consent notice, its storage helper and hook add 3.6 KiB across
// the lazy listening chunks (800.5 KiB measured); with account deletion the total is 804.4 KiB and the ceiling moves to 810 KiB.
// No new runtime dependency.
// Divisórias móveis, marcadores de folhas e controles de prévia acrescentam
// 1.9 KiB ao total medido (813.9 KiB), sem nova dependência ou rota inicial.
// Direct-manipulation notebook tools remain lazy: measured ~818 KiB, no new dependency.
// Selection tools (copy, paste, duplicate, rotate, lasso rule) live in the lazy handwriting
// studio chunk and add about 4 KiB (822.5 KiB measured); the ceiling moves to 830 KiB.
// Shape recognition (hold to snap) is lazy in the handwriting studio chunk: 828.6 KiB measured,
// ceiling 836 KiB for CI variance.
// Live cursor (hook channel, overlay) adds about 3 KiB to the lazy collaboration chunks:
// 834.4 KiB measured, ceiling 842 KiB for CI variance.
// The offline queue for shared notebooks adds about 2.5 KiB to the lazy collaboration chunk
// (839.2 KiB measured); the ceiling moves to 848 KiB.
// O caderno celeste adiciona ícones SVG e a viagem animada à rota lazy de cadernos.
// Linux CI mede 848.0 KiB; 851 KiB preserva margem estreita para variação do build.
// O snapshot de folhas e as transições nos dois sentidos elevam a medição Linux
// para 852.1 KiB. A extração dos gestos de seleção e pinça adiciona cerca de
// 1 KiB; a entrada animada na folha e a navegação da capa acrescentam cerca de
// 3 KiB à rota lazy de cadernos, sem nova dependência.
// Whole-notebook collaboration, per-page offline queues, shared thumbnails and
// papercraft folders add 14.2 KiB to lazy routes (873.6 KiB measured on Windows).
// No new dependency. Initial JavaScript stays 269.8 KiB; retain its existing limit.
// Ink prediction adds about 1 KiB to the lazy studio chunk; the ceiling is 880 KiB.
// Whole-stroke eraser mode and arrow/polygon shape recognition add under 1 KiB more;
// the ceiling moves to 882 KiB. Highlighter opacity and drag-to-reorder in the page
// index add about 1 KiB more; the ceiling moves to 884 KiB. Favoriting pages in the
// index (star toggle and filter) and the Cornell/sheet-music paper templates each add
// under 1 KiB more; the ceiling moves to 888 KiB. The pen hover preview and the
// twist-driven nib angle fit under that same ceiling with no bump needed. The IndexedDB
// mirror (stage 1 of the storage migration) adds about 1.6 KiB more (887.6 KiB measured);
// the ceiling moves to 891 KiB. Persisted-save confirmation and cover selection add about
// 1.5 KiB more; the ceiling moves to 893 KiB. Keyboard shape insertion and the
// accessibility live regions (selection count, page index announcements) add about 3 KiB
// more; the ceiling moves to 897 KiB. Text notes (notebook-folder and text-note
// components) and inserting a ruler/coordinate system without drawing add about 3 KiB
// more together (896.5 KiB measured). Shared paper object icons, visible shape placement
// and bounded shelves are also included; that combined build measured 902.8 KiB. Moving
// notebooks to a folder without dragging and the table sticky (rows/columns of editable
// text, an alternative to Samsung Notes-style tables) add more on top of that. Teacher
// recordings and the static Kokoro word catalog add the room playback client without a
// runtime dependency. The combined build measures 918.0 KiB on Windows. The 100-word
// picker, sliders and recorder recovery add about 4 KiB to the lazy room route:
// 922.1 KiB measured on Windows. Keep a narrow allowance for CI variance without
// changing the initial-route ceiling or adding a runtime dependency. The item-level
// workspace sync merge (fixes whole-blob conflicts discarding one device's changes
// on cross-device sync) adds about 4 KiB more: 926.3 KiB measured on Windows. No new
// dependency.
// Team selection, accessible drag controls and local focus-session recovery add
// about 6 KiB to lazy room/focus routes: 934.5 KiB measured on Windows. No new
// dependency or initial-route growth; retain a narrow allowance for Linux CI.
// Paper podium frames, shared bookmark symbols, speed-based points and the local
// idempotent XP receipt ledger bring the measured total to 940.4 KiB. All remain
// in lazy room/notebook chunks; initial entry stays at 273.8 KiB.
// Opt-in participant audio, host-player mode and deadline-aware recovery add
// 3.7 KiB to lazy room code: measured 947.2 KiB, initial entry still 273.8 KiB.
// No new dependency; retain a narrow allowance for Linux CI.
// Local cross-browser QR decoding is lazy and downloaded only when opening the
// camera. Measured total: 1079.4 KiB (decoder 128.8 KiB); initial entry unchanged.
// Approved Saturn: 3D ball collisions, gate/chute motion, reveal/history flight
// and local sound synthesis replace the static SVG. All stay inside lazy bingo.
// Measured total: 1102.1 KiB; initial entry unchanged at 274.2 KiB. No dependency.
// Bingo ball journey on the engine clock (lift, hover, gate drop, chute), halo and landing
// confetti, optimistic card marks with a request queue, and the guest nickname in the room:
// measured total 1107.8 KiB, initial entry 274.6 KiB. Nearly all of it stays in lazy bingo
// code. No dependency; keep a narrow allowance for Linux CI.
// Shared faceted paper-ball mesh and five solar card illustrations add about 3.2 KiB
// to lazy bingo, with no dependency. Measured total 1111.0 KiB; entry stays 274.6 KiB.
// Solar cell illustrations, folded Saturn braces and card/history composition add
// 1.1 KiB to lazy bingo. Measured total 1112.1 KiB, entry unchanged at 274.6 KiB.
// Host-reviewed bingo claims, the account-name announcement and a read-only solar
// card add 5.0 KiB, all in lazy room/bingo chunks. Measured total 1117.8 KiB,
// initial entry 274.7 KiB. Retain only a narrow allowance for CI variance.
// Physical bingo, the lightweight guest animation and equal-XP winner celebration add
// 5.7 KiB to lazy room/bingo chunks. Measured total 1123.6 KiB, entry unchanged
// at 274.7 KiB. No dependency; retain only a small cross-platform allowance.
// General accessibility preferences, shared motion guards and the compact latest-ball
// badge add 3.5 KiB. Measured total: 1129.5 KiB, entry 275.7 KiB (below 278).
// No runtime dependency; retain a narrow cross-platform allowance.
// Main also includes the answer retry from PR #359 (0.4 KiB), within this allowance.
const MAX_TOTAL_JS_BYTES = 1131 * 1024;
// Mesma ideia do teto acima, para o total da aplicação: a soma de pequenas subidas
// justificadas comentário por comentário não deveria crescer sem limite, sozinha.
const HARD_CEILING_TOTAL_JS_BYTES = 1500 * 1024;
const MAX_PDF_JS_BYTES = 1800 * 1024;
const MAX_TTS_WORKER_BYTES = 2.25 * 1024 * 1024;
const MAX_TTS_WASM_BYTES = 22 * 1024 * 1024;
// Checagem da configuração, não do build: garante que ninguém suba o orçamento normal além
// do teto absoluto sem antes subir o teto conscientemente (uma mudança própria, não um bump
// de rotina), o que é exatamente o atrito que este teto existe para impor.
if (MAX_INITIAL_JS_BYTES > HARD_CEILING_INITIAL_JS_BYTES) {
  throw new Error(
    `O orçamento da entrada inicial (${MAX_INITIAL_JS_BYTES / 1024} KiB) passou do teto absoluto ` +
      `de ${HARD_CEILING_INITIAL_JS_BYTES / 1024} KiB. Isso não é um bump de rotina: revise se dá ` +
      `para carregar menos coisa de início (code-splitting, lazy-loading) antes de subir o teto.`,
  );
}
if (MAX_TOTAL_JS_BYTES > HARD_CEILING_TOTAL_JS_BYTES) {
  throw new Error(
    `O orçamento total da aplicação (${MAX_TOTAL_JS_BYTES / 1024} KiB) passou do teto absoluto ` +
      `de ${HARD_CEILING_TOTAL_JS_BYTES / 1024} KiB. Isso não é um bump de rotina: revise se dá ` +
      `para carregar menos coisa (code-splitting, lazy-loading) antes de subir o teto.`,
  );
}
const manifest = JSON.parse(await readFile(new URL(".vite/manifest.json", distDirectory), "utf8"));
const entry = Object.values(manifest).find((item) => item.isEntry === true);
if (!entry?.file) throw new Error("Entrada principal ausente do manifesto do build.");

const initialBytes = (await stat(join(fileURLToPath(distDirectory), entry.file))).size;
const files = await readdir(assetsDirectory);
const javascriptFiles = files.filter((file) => /\.m?js$/.test(file));
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
  .filter((item) => item !== ttsWorker && !/^pdf[-.]/.test(item.file))
  .reduce((sum, item) => sum + item.bytes, 0);
const pdfBytes = sizes
  .filter((item) => /^pdf[-.]/.test(item.file))
  .reduce((sum, item) => sum + item.bytes, 0);
const wasmFiles = files.filter((file) => file.endsWith(".wasm"));
const wasmBytes = (
  await Promise.all(wasmFiles.map((file) => stat(join(fileURLToPath(assetsDirectory), file))))
).reduce((sum, item) => sum + item.size, 0);

console.log(`JavaScript inicial: ${(initialBytes / 1024).toFixed(1)} KiB`);
console.log(`JavaScript da aplicação: ${(applicationTotal / 1024).toFixed(1)} KiB`);
console.log(`Leitor PDF opcional e worker: ${(pdfBytes / 1024).toFixed(1)} KiB`);
if (pdfBytes > MAX_PDF_JS_BYTES) throw new Error("Leitor PDF excedeu o orçamento de 1800 KiB.");
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
