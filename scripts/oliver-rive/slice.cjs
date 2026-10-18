// Fatia public/oliver-math-islands.png (720 x 791, fundo transparente) nas camadas que o Rive anima.
// A arte é uma imagem só, então cada peça móvel é recortada por cor (Oliver, ilha, adereços) e por
// polígonos (braços, pernas). Duas regras evitam defeitos quando uma peça se mexe:
//  1. Faixa de sobreposição: a peça de baixo mantém uns pixels sob a de cima (a junta), então um
//     giro pequeno nunca abre buraco.
//  2. O que uma peça escondia (ilha sob os pés, rosto sob olhos e boca) é preenchido na peça de baixo.
// No repouso, a soma das camadas é a arte original (conferido por verify.mjs).
// Uso: node scripts/oliver-rive/slice.cjs
const fs = require("fs");
const path = require("path");
const T = require("./image-tools.cjs");

const SOURCE = path.join(__dirname, "..", "..", "public", "oliver-math-islands.png");
const LAYERS = path.join(__dirname, "layers");

// Polígonos de recorte, em pixels da arte. Cada um fica sobre a peça inteira, sem tocar o resto.
const POLY = {
  armR: [
    [472, 296],
    [520, 244],
    [560, 236],
    [582, 262],
    [620, 282],
    [620, 332],
    [592, 352],
    [540, 358],
    [492, 378],
    [472, 386],
  ],
  // só o punho: o lobo escuro do corpo acima e à direita dele fica no corpo
  armL: [
    [60, 392],
    [150, 392],
    [158, 398],
    [172, 418],
    [166, 440],
    [178, 458],
    [178, 512],
    [60, 512],
  ],
  legL: [
    [140, 466],
    [200, 466],
    [305, 518],
    [332, 522],
    [332, 640],
    [140, 640],
  ],
  legR: [
    [372, 472],
    [404, 452],
    [562, 452],
    [562, 640],
    [372, 640],
  ],
};
// Quanto cada peça de cima penetra na de baixo, em pixels (faixa de sobreposição).
// Anel (px) em volta de olhos e boca que vai junto com eles: cobre a borda suavizada e some no fundo.
const FACE_RING = 4;
const BAND = { armR: 12, armL: 10, legL: 14, legR: 14 };

(async () => {
  const { w, h, data } = await T.loadRGBA(SOURCE);
  const N = w * h;
  fs.mkdirSync(LAYERS, { recursive: true });
  for (const f of fs.readdirSync(LAYERS))
    if (f.endsWith(".png")) fs.unlinkSync(path.join(LAYERS, f));

  const alpha = new Uint8Array(N);
  const cyan = new Uint8Array(N);
  const dark = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (data[i * 4 + 3] < 24) continue;
    alpha[i] = 1;
    const [hh, s, v] = T.hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (v < 0.25) dark[i] = 1;
    else if (hh > 160 && hh < 210 && s > 0.06) cyan[i] = 1;
  }

  // ---- objetos soltos (componentes separados por transparência) ----
  const all = T.components(alpha, w, h);
  const bySize = [...all.list].sort((a, b) => b.n - a.n);
  const mainId = bySize[0].id; // ilha + Oliver
  const loose = all.list.filter((c) => c.id !== mainId);

  // ---- Oliver: maior componente ciano, com os buracos (olhos e boca) preenchidos ----
  const cy = T.components(cyan, w, h);
  const cyBig = [...cy.list].sort((a, b) => b.n - a.n)[0];
  const oliver = T.fillHoles(T.maskOfLabel(cy.lab, cyBig.id), w, h);

  // olhos e boca: as três manchas escuras dentro do Oliver
  const faceDark = T.and(dark, oliver);
  const fc = T.components(faceDark, w, h);
  const faceParts = [...fc.list].sort((a, b) => b.n - a.n).slice(0, 3);
  const mouthInfo = faceParts[0];
  const eyes = faceParts.slice(1).sort((a, b) => a.x0 - b.x0);
  const faceMasks = {
    mouth: T.dilate(T.maskOfLabel(fc.lab, mouthInfo.id), w, h, FACE_RING),
    eyeL: T.dilate(T.maskOfLabel(fc.lab, eyes[0].id), w, h, FACE_RING),
    eyeR: T.dilate(T.maskOfLabel(fc.lab, eyes[1].id), w, h, FACE_RING),
  };
  let faceAll = new Uint8Array(N);
  for (const m of Object.values(faceMasks)) faceAll = T.or(faceAll, m);
  faceAll = T.and(faceAll, oliver);

  // ---- partes do Oliver ----
  const exclusive = {};
  let taken = new Uint8Array(N);
  for (const k of Object.keys(POLY)) {
    // máscaras disjuntas: o que um membro já tomou não entra em outro
    exclusive[k] = T.minus(T.and(oliver, T.polyMask(w, h, POLY[k])), taken);
    taken = T.or(taken, exclusive[k]);
  }
  // pernas e braços não se sobrepõem entre si; o corpo é o resto
  let limbs = new Uint8Array(N);
  for (const m of Object.values(exclusive)) limbs = T.or(limbs, m);
  const bodyExcl = T.minus(oliver, limbs);
  // a faixa só entra no corpo (a peça "pai"), nunca em outro membro nem fora da silhueta
  // Na faixa, só entram pixels opacos (alfa >= 250: o interior da arte tem 252 a 254, nunca 255):
  // a borda suavizada (alfa parcial) fica só no corpo, senão seria desenhada duas vezes e
  // engrossaria o contorno.
  const opaque = new Uint8Array(N);
  for (let i = 0; i < N; i++) opaque[i] = data[i * 4 + 3] >= 250 ? 1 : 0;
  const withBand = (k) =>
    T.or(exclusive[k], T.and(opaque, T.and(bodyExcl, T.dilate(exclusive[k], w, h, BAND[k]))));

  // corpo sem olhos e boca, com o rosto claro preenchido por baixo
  const bodyMask = bodyExcl;
  const faceHole = T.and(faceAll, bodyMask);
  const bodyRGBA = T.inpaint(data, w, h, faceHole, 40, bodyMask);
  const bodyFilled = Uint8ClampedArray.from(bodyRGBA);
  for (let i = 0; i < N; i++) if (!bodyMask[i]) bodyFilled[i * 4 + 3] = 0;

  // ---- ilha: componente principal sem o Oliver, com o chão sob os pés preenchido ----
  const mainMask = T.maskOfLabel(all.lab, mainId);
  const islandMask = T.minus(mainMask, oliver);
  // Só o pé esquerdo cobre a grama: a borda de trás do plano de grama passa por baixo dele, de
  // (172, 568) a (278, 562) (medido na arte). O pé direito termina onde o plano da frente começa,
  // então não esconde nada da ilha e atrás dele só há céu.
  const footHole = new Uint8Array(N);
  {
    const [fx0, fx1] = [180, 270];
    const [xa, ya, xb, yb] = [172, 568, 278, 562];
    for (let x = fx0; x <= fx1; x++) {
      const edge = Math.round(ya + ((yb - ya) * (x - xa)) / (xb - xa)) + 2;
      for (let y = edge; y < h; y++) {
        const i = y * w + x;
        if (exclusive.legL[i]) footHole[i] = 1;
      }
    }
  }
  // Atrás do pé direito fica a ponta do plano de trás da grama: um triângulo entre a borda do
  // plano da frente e a crista, que some no canto da ilha (518, 568). Só aparece quando o
  // personagem pula, então vale preencher com facetas chapadas, no estilo de papel recortado.
  const rightHole = T.minus(
    T.polyMask(w, h, [
      [398, 562],
      [520, 568],
      [398, 586],
    ]),
    islandMask,
  );
  const islandHole = T.or(footHole, rightHole);
  const sample = (x0, y0, x1, y1) => {
    const ch = [[], [], []];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if (!islandMask[i]) continue;
        for (let k = 0; k < 3; k++) ch[k].push(data[i * 4 + k]);
      }
    return ch.map((a) => (a.sort((p, q) => p - q), a[a.length >> 1]));
  };
  const islandRGBA = Uint8ClampedArray.from(data);
  const paint = (mask, [r, g, b]) => {
    for (let i = 0; i < N; i++)
      if (mask[i]) {
        islandRGBA[i * 4] = r;
        islandRGBA[i * 4 + 1] = g;
        islandRGBA[i * 4 + 2] = b;
      }
  };
  // direita: crista clara no topo e faceta escura por baixo, cores medidas ao lado do corte
  const strip = T.polyMask(w, h, [
    [398, 562],
    [520, 568],
    [520, 570],
    [398, 567],
  ]);
  paint(T.minus(rightHole, strip), sample(384, 570, 394, 580));
  paint(T.and(rightHole, strip), sample(384, 561, 394, 564));
  // esquerda: duas facetas, a clara a esquerda e a escura (como a do lado direito do pé)
  const splitDark = T.polyMask(w, h, [
    [262, 540],
    [330, 540],
    [330, 600],
    [240, 600],
  ]);
  paint(T.minus(footHole, splitDark), sample(176, 578, 186, 586));
  paint(T.and(footHole, splitDark), sample(274, 568, 284, 576));
  const islandOut = T.or(islandMask, islandHole);
  for (let i = 0; i < N; i++) if (!islandOut[i]) islandRGBA[i * 4 + 3] = 0;
  // pixels preenchidos ficam opacos; os originais da ilha mantêm a opacidade
  for (let i = 0; i < N; i++) if (islandHole[i] && !islandMask[i]) islandRGBA[i * 4 + 3] = 255;

  // ---- exporta ----
  const manifest = {
    source: "public/oliver-math-islands.png",
    width: w,
    height: h,
    order: [],
    layers: {},
  };
  function put(name, rgba, mask, extra = {}) {
    const cut = T.cutLayer(rgba, w, h, mask);
    if (!cut) throw new Error("camada vazia: " + name);
    const file = name + ".png";
    T.savePNG(path.join(LAYERS, file), cut.w, cut.h, cut.data);
    manifest.layers[name] = { file, x0: cut.x0, y0: cut.y0, w: cut.w, h: cut.h, ...extra };
    manifest.order.push(name);
  }
  const labelMask = (id) => T.maskOfLabel(all.lab, id);
  const centroid = (c) => {
    let sx = 0,
      sy = 0,
      n = 0;
    const m = labelMask(c.id);
    for (let y = c.y0; y <= c.y1; y++)
      for (let x = c.x0; x <= c.x1; x++)
        if (m[y * w + x]) {
          sx += x;
          sy += y;
          n++;
        }
    return [Math.round(sx / n), Math.round(sy / n)];
  };
  // objetos soltos pelo tamanho e posição (ordem de baixo para cima na pilha)
  const named = {};
  for (const c of loose) {
    const [cx, cy2] = centroid(c);
    const col = [0, 1, 2].map(
      (k) => data[(Math.round((c.y0 + c.y1) / 2) * w + Math.round((c.x0 + c.x1) / 2)) * 4 + k],
    );
    let name;
    if (c.x1 < 200 && c.y1 < 290)
      name = c.n > 3000 ? "flame" : "flameSpark" + (c.x0 < 80 ? "A" : c.y0 < 150 ? "B" : "C");
    else if (c.y0 > 520 && c.x1 < 200) name = c.n > 3000 ? "rockL" : "chipL";
    else if (c.y0 > 520) name = c.n > 2000 ? "rockR" : "chipR";
    else if (c.x0 > 400 && c.y1 < 270 && col[0] > 200 && col[2] < 100 && c.n > 10000) name = "plus";
    else if (c.n > 8000 && c.x0 > 560) name = "ruler";
    else if (col[0] < 140 && col[2] > 150 && c.n > 4000) name = "divBar";
    else if (col[0] < 140 && col[2] > 150) name = c.y0 < 200 ? "divDotTop" : "divDotBottom";
    else name = "shard" + (c.x0 < 450 ? "A" : c.y0 < 100 ? "B" : "C");
    if (named[name]) throw new Error("nome repetido: " + name + " " + JSON.stringify(c));
    named[name] = { c, mask: labelMask(c.id), centroid: [cx, cy2] };
  }
  const looseOrder = [
    "rockL",
    "chipL",
    "rockR",
    "chipR",
    "flameSparkA",
    "flameSparkB",
    "flameSparkC",
    "flame",
    "shardA",
    "shardB",
    "shardC",
    "plus",
    "divDotTop",
    "divDotBottom",
    "divBar",
    "ruler",
  ];
  for (const k of Object.keys(named))
    if (!looseOrder.includes(k)) throw new Error("sem ordem: " + k);
  for (const k of looseOrder) {
    if (!named[k])
      throw new Error("faltou: " + k + " (achados: " + Object.keys(named).join(",") + ")");
  }
  for (const k of [
    "rockL",
    "chipL",
    "rockR",
    "chipR",
    "flameSparkA",
    "flameSparkB",
    "flameSparkC",
    "flame",
    "shardA",
    "shardB",
    "shardC",
    "plus",
    "divDotTop",
    "divDotBottom",
    "divBar",
    "ruler",
  ]) {
    put(k, data, named[k].mask, { pivot: named[k].centroid });
  }
  put("island", islandRGBA, islandOut, { pivot: [330, 640] });
  put("legL", data, withBand("legL"), { pivot: [262, 508] });
  put("legR", data, withBand("legR"), { pivot: [425, 478] });
  // Braços: ficam ATRÁS do corpo, cada um com uma aba (continuação do próprio braço, por
  // difusão) enfiada sob o corpo. Ao girar, a aba se move escondida e a borda de corte do braço
  // nunca aparece; uma faixa por cima do corpo, como nas pernas, girava junto, virava uma placa
  // rígida com emenda e uma lasca solta na junta, e parecia quebrar o braço.
  const TAB = 34;
  for (const [name, pivot] of [
    ["armR", [472, 342]],
    ["armL", [184, 414]],
  ]) {
    const tab = T.minus(
      T.and(T.and(T.dilate(exclusive[name], w, h, TAB), bodyExcl), T.erode(opaque, w, h, 2)),
      exclusive[name],
    );
    const filled = T.inpaint(data, w, h, tab, 30, exclusive[name]);
    const rgba = Uint8ClampedArray.from(filled);
    for (let i = 0; i < N; i++) if (tab[i]) rgba[i * 4 + 3] = 255;
    put(name, rgba, T.or(exclusive[name], tab), { pivot });
  }
  put("body", bodyFilled, bodyMask, { pivot: [320, 500] });
  const eyeCenter = (info) => [
    Math.round((info.x0 + info.x1) / 2),
    Math.round((info.y0 + info.y1) / 2),
  ];
  put("mouth", data, faceMasks.mouth, { pivot: eyeCenter(mouthInfo) });
  put("eyeL", data, faceMasks.eyeL, { pivot: eyeCenter(eyes[0]) });
  put("eyeR", data, faceMasks.eyeR, { pivot: eyeCenter(eyes[1]) });
  fs.writeFileSync(path.join(LAYERS, "layers.json"), JSON.stringify(manifest, null, 2) + "\n");

  // recomposição em repouso (ordem da pilha) para conferir contra a arte original
  const { createCanvas, loadImage } = require("@napi-rs/canvas");
  const c = createCanvas(w, h);
  const g = c.getContext("2d");
  for (const name of manifest.order) {
    const L = manifest.layers[name];
    const img = await loadImage(path.join(LAYERS, L.file));
    g.drawImage(img, L.x0, L.y0);
  }
  const re = g.getImageData(0, 0, w, h).data;
  let maxd = 0,
    bad = 0,
    sum = 0;
  for (let i = 0; i < N; i++) {
    const a0 = data[i * 4 + 3],
      a1 = re[i * 4 + 3];
    const d = Math.max(
      Math.abs(data[i * 4] * a0 - re[i * 4] * a1) / 255,
      Math.abs(data[i * 4 + 1] * a0 - re[i * 4 + 1] * a1) / 255,
      Math.abs(data[i * 4 + 2] * a0 - re[i * 4 + 2] * a1) / 255,
      Math.abs(a0 - a1),
    );
    if (d > 8) bad++;
    maxd = Math.max(maxd, d);
    sum += d;
  }
  console.log(
    "camadas:",
    manifest.order.length,
    "| diferença máxima contra a original:",
    maxd.toFixed(1),
    "| pixels com diferença > 8:",
    bad,
    "| média:",
    (sum / N).toFixed(4),
  );
  T.savePNG("/tmp/claude-0/oliver/recomposed.png", w, h, re);
})();
