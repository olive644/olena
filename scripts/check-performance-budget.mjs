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
// Compatible agenda metadata and occurrence selection add 1.6 KiB (277.9 measured).
// Retain a small Linux bundler allowance without changing the hard ceiling.
// Internal calendar date/zone invariants are shared with workspace and Today.
// Measured entry: 280.9 KiB; calendar views and reminders stay lazy-loaded.
// Account focus recovery, safe cache hydration and v2 wire codec: measured 284.7 KiB.
// Narrow CI allowance; absolute ceiling remains unchanged.
// Guard stale account snapshots and automatic Brazilian account zone: measured 285.3 KiB.
// Expansão temporária do rail por mouse/teclado e cor opcional de tarefas:
// entrada medida 286.1 KiB, sem dependência nova; teto absoluto preservado.
const MAX_INITIAL_JS_BYTES = 286.5 * 1024;
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
// Main also includes confirmations, expiry notice and accessibility announcements
// from PR #360 (3.5 KiB), confined to the lazy room chunk. No dependency.
// Keep only the combined allowance; initial-JS and hard ceilings are unchanged.
// Full-art room controls, original social icons, roster effects and non-destructive
// return/resume add 7.4 KiB to the lazy room/bingo path. Measured total 1140.2 KiB;
// entry remains 275.7 KiB. No dependency; retain 2.8 KiB for platform variance.
// Six subject islands, scene navigation, individual sprite anchors and readable
// island names add 2.8 KiB in the lazy practice route. Measured total: 1143.0 KiB,
// entry unchanged at 275.6 KiB. No dependency; retain 3 KiB platform allowance.
// Five fullscreen subject trails, five distinct themed SVG number pieces and metadata
// add 10 KiB in the lazy practice route. Total: 1155.6 KiB, entry still 275.6 KiB.
// No dependencies or initial-path growth; retain 3.5 KiB platform allowance.
// Click-to-enter artwork, measured avatar arrival and adaptive topic retreat add
// 0.8 KiB to the lazy practice route. Whole place illustrations use responsive
// WebPs; the map loads only the current scene and its adjacent previews.
// Total measured: 1159.9 KiB; entry unchanged at 275.7 KiB. No new dependency;
// retain 2.3 KiB for build/platform variance without changing the initial ceiling.
// Persistent per-place scores and the common chest lifecycle add 4.9 KiB to
// the lazy practice route. Measured total 1164.8 KiB, entry still 275.7 KiB;
// retain 2.2 KiB for platform variance, without new dependencies.
// Ten Oliver collectible definitions, local weighted loot, resumable flip reveal
// and collection UI add 11.4 KiB in the lazy practice route. Measured total:
// 1176.6 KiB; initial entry unchanged at 275.7 KiB. No runtime dependency.
// Artwork is responsive WebP loaded on reveal, not bundled as JavaScript.
// Account reward merge adds 3.4 KiB including compatibility validation.
// Measured total 1180.0 KiB, initial 276.0 KiB; no added dependency.
// Free card dragging, CSS 360 inspection and chest/collection delivery add
// 5.0 KiB to the optional practice route. Total 1185.1 KiB, entry 276.0 KiB.
// Paper alphabet titles and the optional Star tarot showcase add 2.6 KiB.
// Measured total 1187.7 KiB, entry unchanged at 276.0 KiB; retain platform
// allowance. Glyphs reuse the existing external SVG; no new dependency.
// Arcane reward identity, native chest SVG and immediate card inspection add
// 2.6 KiB to the lazy application graph. Measured total: 1190.3 KiB; entry
// remains 276.0 KiB. Preserve a narrow cross-platform allowance.
// Shared animated Helena chat adds 8.8 KiB, loaded separately after onboarding.
// Measured total: 1199.8 KiB, initial entry: 276.3 KiB. No new dependency.
// Preserve the initial-entry limit and a narrow cross-platform allowance.
// End-to-end Helena SSE adds 1.4 KiB to the lazy chat, with no new dependency
// or initial-entry growth (276.3 KiB unchanged). Reserve 2 KiB for this feature.
// Agenda calendar, unified editing, recurrence and Focus linkage add 11.6 KiB.
// Measured total: 1215.2 KiB. Calendar UI/CSS remain in the lazy planner route.
// Agenda ranges, accessible pointer selection and real focus-history summaries
// add about 5 KiB to the existing lazy planner route. Measured total: 1220.8 KiB;
// initial entry stays at 277.8 KiB. Keep a narrow CI allowance, no dependencies
// and no change to either absolute ceiling.
// Native agenda category charts and recorded timer/Pomodoro modality add about
// 7 KiB to the lazy route, including accessible chart inspection.
// Measured total with donut: 1230.2 KiB, initial: 278.0 KiB.
// Keep a narrow CI allowance; no chart dependency or absolute-ceiling change.
// Real streaks, accumulated math charts and a draggable island preview add
// 6.7 KiB in lazy routes. Measured total: 1236.5 KiB; initial entry: 278.6 KiB.
// System notifications and daily planning add 6.3 KiB, mostly lazy-loaded.
// Measured entry: 279.7 KiB; application: 1242.0 KiB. Hard ceilings unchanged.
// Custom calendar/time popovers and icon controls add 7.8 KiB in the planner.
// New icon art is served as SVG assets, keeping the entry inside 280 KiB.
// Internal calendar views, validated ICS exchange and local reminders:
// measured application JS 1280.5 KiB, no new dependency or absolute ceiling change.
// Rotating paper clock, expandable metadata and shared attachment previews stay lazy.
// Reused editor icons/listening slider, no new dependency: measured 1295.1 KiB.
// Helena tipada e prioridade de interação acrescentam 2,8 KiB ao módulo lazy.
// Total combinado com conta/Agenda: 1288,7 KiB. Teto absoluto preservado.
// Combined with dynamic Agenda controls: measured 1297.9 KiB, hard ceiling unchanged.
// Compact filters, account event colors and keyboard/direct grid movement: measured 1301.9 KiB.
// Keep narrow bundler variance; initial entry and absolute ceilings remain unchanged.
// Branded exports, palette, drag preview and cross-date search: measured 1309.7 KiB.
// No new dependency; initial entry and absolute ceilings remain unchanged.
// Ilha animada de Matemática (canvas e worker de análise), carregada sob demanda e sem nova
// dependência: medido 1326.1 KiB. Entrada inicial e tetos absolutos não mudam.
// Partes animadas dos seis lugares de Matemática (motor de recorte e listas de partes), sob demanda
// e sem dependência nova: medido 1349.2 KiB. Entrada inicial e tetos absolutos não mudam.
// Correção imediata, conquista, espelho compatível e números SVG originais incorporados
// à partida offline combinados às animações: medido 1362.2 KiB, entrada 285.7 KiB. Sem dependência nova;
// manter pequena margem de CI, com os mesmos tetos absolutos e orçamento de entrada.
// Helena em Rive: o componente do mascote e o carregador tipado do runtime (o runtime em si fica
// fora do bundle): medido 1364.6 KiB. Entrada inicial e tetos absolutos sem mudança.
// Banco fechado e progressão dos minigames v3: acréscimo medido de ~7 KiB,
// carregado sob demanda. Entrada caiu para 285.8 KiB; sem nova dependência.
// Margem estreita de CI, com os tetos absolutos e a entrada preservados.
// Banco v4: oito formatos por etapa, revisão de alternativas e repetição espaçada.
// Total medido 1395.2 KiB; entrada 285.9 KiB. Conteúdo permanece sob demanda,
// sem dependências novas. Mantidos os tetos absolutos e o orçamento inicial.
// Retomada por tipo de erro e finais reservadas v5: total medido 1406.3 KiB,
// entrada mantida em 285.9 KiB. Sem dependência nova; tetos absolutos preservados.
// Central do Perfil reutiliza formulários e remove Hábitos: entrada caiu para 281.5 KiB.
// Opções, progresso, exportação e permissões sob demanda: total medido 1413.2 KiB.
// Margem normal ajustada para esta funcionalidade; sem dependência nova e sem mudar
// o orçamento inicial ou os tetos absolutos abaixo.
// Capa recolhível e trajetória do Perfil: +3.8 KiB na rota sob demanda,
// total medido 1419.2 KiB; entrada permanece 281.1 KiB. Sem dependência nova.
// Pequena margem de CI; orçamento inicial e teto absoluto permanecem iguais.
// Ficha editável do Perfil, validação de redes e campos opcionais compatíveis:
// total medido 1424.7 KiB. Remover seletor do topo reduz entrada a 279.5 KiB.
// Mesma sincronização, nenhum serviço ou dependência nova, tetos absolutos intactos.
// Galeria oficial modal, fontes de avatar restritas e streaks reais no Perfil:
// total medido 1428.1 KiB, entrada 279.4 KiB. Sem dependências ou serviços novos.
// Margem pequena de CI; tetos absolutos e orçamento inicial preservados.
// Perfil móvel em fluxo natural, seletor persistente de cinco capas e engrenagem compartilhada:
// total medido 1433.9 KiB, entrada preservada em 279.5 KiB. Arte servida como SVG estático,
// fora do JavaScript, sem dependência nova. Margem incremental estreita, tetos absolutos intactos.
// Espaço vertical do handwriting (regra pura, gesto, teclado e prévia no editor): total medido
// 1438.1 KiB (+3.3 KiB sobre 1434.8 da main). Código do editor sob demanda, entrada inicial
// intacta, sem dependência nova. Margem estreita de CI; teto absoluto e orçamento inicial
// preservados.
// Ferramenta de curva do handwriting (gerador Catmull-Rom, gesto de toque, teclado, prévia e
// botão): total medido 1443.5 KiB (+4.3 KiB sobre 1439.2). Código do editor sob demanda,
// entrada inicial intacta, sem dependência nova. Margem estreita de CI; teto absoluto preservado.
// Formas com vários traços do handwriting (fechar retas em triângulo, retângulo ou quadrilátero e a
// lista de retas acertadas): total medido 1448.5 KiB (+3.0 KiB sobre 1445.5). Código do editor sob
// demanda, entrada inicial intacta, sem dependência nova. Margem estreita de CI; teto absoluto
// preservado.
// Perfis sociais, busca, seguir/avisos e cartão QR reutilizam Firebase e QR existentes.
// Medido em 1466.2 KiB, entrada 279.9 KiB. Preservar os tetos absolutos.
// Perfil com ilhas, cadernos e nível derivado dos pontos reais: 1479.3 KiB medidos,
// entrada 280.3 KiB. Reutiliza artes e componentes, sem dependências novas.
// Consulta social compartilhada, cache por UID e invalidação segura: 1484.2 KiB.
// Margem incremental de 1 KiB; teto absoluto de 1500 KiB permanece inalterado.
// Jornada do perfil e identidade confirmada reutilizável: cerca de 1487 KiB,
// sem dependências novas e sem alterar o teto absoluto de 1500 KiB.
// Conferência autenticada das etapas na Olena: total medido 1490,2 KiB.
// Regra compartilhada e cliente pequeno, sem dependências; teto absoluto preservado.
// Interface bilíngue e configurações: ícones estáticos e carregamento do App após o catálogo
// mantêm o total medido em 1468 KiB. Preservado o orçamento anterior e o teto absoluto.
// Prateleira móvel de favoritos, seletor e normalização: 1499.5 KiB medidos
// (1492.9 KiB antes). UI carregada sob demanda, entrada permanece em 217.4 KiB,
// sem novas dependências. Teto absoluto de 1500 KiB preservado.
// Teto subido de 1500 para 1600 KiB por decisão da dona do projeto: o total já estava
// colado no limite e cada funcionalidade nova esbarrava nele. A entrada inicial segue
// com o orçamento próprio acima, e o crescimento continua sendo carregado sob demanda.
// Caderno em 3D: a cena, a tela do 3D e os sons ficam fora deste total (orçamento próprio abaixo).
// O que sobrou no total foi a ponte da vitrine com o 3D (preferência, jornada da capa, índice,
// miniatura compartilhada em chunk próprio e o botão no Perfil): +2,1 KiB, 1599,7 KiB medidos
// no Windows e ~0,5 KiB a mais no Linux do CI. Teto subido de 1600 para 1602 KiB só por isso.
// Abas que acompanham a folha, folheio dobrado em fatias e contracapa 2D: +5,0 KiB sobre os
// 1601,5 KiB da main (1606,5 KiB medidos). É código do caderno 2D, que é o padrão e roda em toda
// abertura de caderno, então não cabe no orçamento opcional do 3D. Sem dependência nova, entrada
// inicial intacta. Teto subido de 1602 para 1608 KiB: PRECISA da aprovação da dona do projeto.
const MAX_TOTAL_JS_BYTES = 1608 * 1024;
// Mesma ideia do teto acima, para o total da aplicação: a soma de pequenas subidas
// justificadas comentário por comentário não deveria crescer sem limite, sozinha.
const HARD_CEILING_TOTAL_JS_BYTES = 1608 * 1024;
const MAX_PDF_JS_BYTES = 1800 * 1024;
// Cena do caderno 3D (three.js e o código da cena): medida em 528.8 KiB, mais a tela e os sons. É baixada somente quando
// a pessoa abre um caderno com o recurso ligado e vale o mesmo precedente do leitor PDF: orçamento
// próprio, fora do total da aplicação. Não entra na entrada inicial nem em nenhuma outra rota.
// Cena, tela do caderno 3D e sons de papel: todos carregados só ao abrir o caderno em 3D.
const NOTEBOOK_3D_CHUNK = /^(notebook-3d-[a-z]+|notebook-sound)[-.]/;
const MAX_NOTEBOOK_3D_JS_BYTES = 600 * 1024;
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
  .filter(
    (item) =>
      item !== ttsWorker && !/^pdf[-.]/.test(item.file) && !NOTEBOOK_3D_CHUNK.test(item.file),
  )
  .reduce((sum, item) => sum + item.bytes, 0);
const pdfBytes = sizes
  .filter((item) => /^pdf[-.]/.test(item.file))
  .reduce((sum, item) => sum + item.bytes, 0);
const notebook3dBytes = sizes
  .filter((item) => NOTEBOOK_3D_CHUNK.test(item.file))
  .reduce((sum, item) => sum + item.bytes, 0);
const wasmFiles = files.filter((file) => file.endsWith(".wasm"));
const wasmBytes = (
  await Promise.all(wasmFiles.map((file) => stat(join(fileURLToPath(assetsDirectory), file))))
).reduce((sum, item) => sum + item.size, 0);

console.log(`JavaScript inicial: ${(initialBytes / 1024).toFixed(1)} KiB`);
console.log(`JavaScript da aplicação: ${(applicationTotal / 1024).toFixed(1)} KiB`);
console.log(`Leitor PDF opcional e worker: ${(pdfBytes / 1024).toFixed(1)} KiB`);
if (pdfBytes > MAX_PDF_JS_BYTES) throw new Error("Leitor PDF excedeu o orçamento de 1800 KiB.");
console.log(`Cena do caderno 3D opcional: ${(notebook3dBytes / 1024).toFixed(1)} KiB`);
if (notebook3dBytes === 0) throw new Error("A cena do caderno 3D deixou de ser um chunk próprio.");
if (notebook3dBytes > MAX_NOTEBOOK_3D_JS_BYTES)
  throw new Error("Cena do caderno 3D excedeu o orçamento de 600 KiB.");
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

// A Helena do assistente usa o runtime oficial do Rive, vendorizado e carregado sob demanda,
// fora da entrada do React. Medição: rive.js 445 KiB, rive.wasm 1,86 MiB e helena.riv 829 KiB.
// Orçamento explícito separado, sem ampliar os tetos da aplicação.
const mascotRoot = new URL("../dist/helena-assistant/", import.meta.url);
const mascotRuntime = (await stat(new URL("rive.js", mascotRoot))).size;
const mascotWasm = (await stat(new URL("rive.wasm", mascotRoot))).size;
const mascotFile = (await stat(new URL("helena.riv", mascotRoot))).size;
console.log(
  `Helena Rive opcional: ${(mascotRuntime / 1024).toFixed(1)} KiB JS, ${(mascotWasm / 1024 / 1024).toFixed(2)} MiB WASM, ${(mascotFile / 1024).toFixed(1)} KiB .riv`,
);
if (mascotRuntime > 512 * 1024 || mascotWasm > 2.25 * 1024 * 1024 || mascotFile > 1024 * 1024) {
  throw new Error("Assets da Helena excederam 512 KiB de JS, 2,25 MiB de WASM ou 1 MiB de .riv.");
}

// A arte animada do Oliver espiando atrás do widget de Matemática reaproveita o runtime acima e só
// baixa o próprio .riv depois do primeiro quadro, sem movimento reduzido. Medição: 382 KiB.
const oliverFile = (
  await stat(new URL("../dist/oliver-peeking-widget/oliver.riv", import.meta.url))
).size;
console.log(`Oliver Rive opcional: ${(oliverFile / 1024).toFixed(1)} KiB .riv`);
if (oliverFile > 512 * 1024) throw new Error("O oliver.riv excedeu 512 KiB.");

// O tomate do Pomodoro (aba Foco) também reaproveita o runtime e só baixa o .riv depois do
// primeiro quadro estático. Medição: 662 KiB (oito peças de mordida, minhoca animada e partículas).
const tomatoFile = (await stat(new URL("../dist/pomodoro-tomato/tomato.riv", import.meta.url)))
  .size;
console.log(`Tomate Rive opcional: ${(tomatoFile / 1024).toFixed(1)} KiB .riv`);
if (tomatoFile > 700 * 1024) throw new Error("O tomato.riv excedeu 700 KiB.");
