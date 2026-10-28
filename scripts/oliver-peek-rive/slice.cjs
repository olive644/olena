// Fatia public/oliver-peeking-widget.webp (900 x 600, fundo transparente) nas camadas que o Rive anima:
// corpo, rosto (olhos e boca), as duas mãos, o sinal de mais, a divisão e o brilho de cada um.
// A arte é uma imagem só: cada peça sai por cor, por componente conexo ou por polígono medido na arte.
// Regras que evitam defeitos quando uma peça se mexe:
//  1. O que uma peça de cima escondia é refeito na de baixo (rosto sob olhos e boca, corpo sob as mãos).
//  2. As bordas suavizadas (alfa parcial) vão para a peça dona da borda, nunca soltas.
//  3. Os cortes entre corpo e mãos seguem arestas escuras da própria arte, onde uma sobreposição
//     de um ou dois pixels parece a sombra natural, e nunca uma linha reta no meio de uma faceta.
// No repouso a soma das camadas é a arte original (conferido ao fim).
// Uso: node scripts/oliver-peek-rive/slice.cjs
const fs = require("fs");
const path = require("path");
const T = require("../oliver-rive/image-tools.cjs");

const SOURCE = path.join(__dirname, "..", "..", "public", "oliver-peeking-widget.webp");
const LAYERS = path.join(__dirname, "layers");
const DEBUG = process.env["PEEK_DEBUG"];

// Polígonos (px da arte). O lado de fora da silhueta é folgado de propósito; o lado do corpo
// segue a aresta escura que separa a mão do corpo.
const HAND_POLY = {
  handL: [
    [0, 379],
    [212, 379],
    [216, 384],
    [226, 389],
    [238, 397],
    [241, 410],
    [244, 425],
    [247, 440],
    [252, 448],
    [262, 456],
    [268, 461],
    [280, 470],
    [292, 483],
    [298, 492],
    [298, 505],
    [292, 518],
    [280, 532],
    [270, 599],
    [0, 599],
  ],
  handR: [
    [899, 379],
    [647, 379],
    [647, 384],
    [646, 395],
    [646, 400],
    [640, 410],
    [633, 420],
    [626, 430],
    [619, 440],
    [612, 450],
    [605, 462],
    [612, 478],
    [613, 490],
    [612, 505],
    [615, 520],
    [630, 599],
    [899, 599],
  ],
};
const FACE_RING = 4;
const TAB = 8;
// A aba sob a mão é uma sombra de contato: a cor vizinha escurecida, sem gradiente à mostra.
const TAB_SHADE = 0.6;

(async () => {
  const { w, h, data } = await T.loadRGBA(SOURCE);
  const N = w * h;
  fs.mkdirSync(LAYERS, { recursive: true });
  for (const f of fs.readdirSync(LAYERS))
    if (f.endsWith(".png")) fs.unlinkSync(path.join(LAYERS, f));

  const opaque = new Uint8Array(N);
  const any = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const a = data[i * 4 + 3];
    if (a >= 250) opaque[i] = 1;
    if (a > 0) any[i] = 1;
  }

  // ---- componentes opacos: corpo com as mãos, mais, barra e pontos da divisão ----
  const oc = T.components(opaque, w, h);
  const big = [...oc.list].sort((a, b) => b.n - a.n);
  const main = T.maskOfLabel(oc.lab, big[0].id);
  const named = {};
  for (const c of big.slice(1)) {
    const cx = (c.x0 + c.x1) / 2;
    const cy = (c.y0 + c.y1) / 2;
    const m = T.maskOfLabel(oc.lab, c.id);
    let kind;
    if (c.n > 8000) kind = "plus";
    else if (c.n > 3000) kind = "divBar";
    else if (c.n > 1000) kind = cy < 290 ? "divDotTop" : "divDotBottom";
    else {
      // grãos soltos de 1 a 3 px: vão para a peça mais próxima
      let best = null;
      let bestD = Infinity;
      for (const [k, v] of Object.entries(named)) {
        const dx = Math.max(v.c.x0 - cx, 0, cx - v.c.x1);
        const dy = Math.max(v.c.y0 - cy, 0, cy - v.c.y1);
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      kind = best;
    }
    named[kind] = named[kind]
      ? { c: named[kind].c, mask: T.or(named[kind].mask, m) }
      : { c, mask: m };
  }
  for (const k of ["plus", "divBar", "divDotTop", "divDotBottom"])
    if (!named[k]) throw new Error("faltou " + k);

  // ---- mãos ----
  const hands = {};
  let handsAll = new Uint8Array(N);
  for (const k of Object.keys(HAND_POLY)) {
    hands[k] = T.and(main, T.polyMask(w, h, HAND_POLY[k]));
    handsAll = T.or(handsAll, hands[k]);
  }
  const bodyAndFace = T.minus(main, handsAll);

  // ---- rosto: as três manchas escuras dentro do corpo ----
  const dark = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!bodyAndFace[i]) continue;
    const [, , v] = T.hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (v < 0.25) dark[i] = 1;
  }
  const fc = T.components(dark, w, h);
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
  faceAll = T.and(faceAll, bodyAndFace);
  const bodyMask = T.minus(bodyAndFace, faceAll);

  // ---- donos dos pixels: opacos por classe, parciais pelo opaco mais próximo ----
  // 1 corpo, 2 mão esquerda, 3 mão direita, 4 mais, 5 barra, 6 ponto de cima, 7 ponto de baixo
  const owner = new Int32Array(N);
  const claim = (m, k) => {
    for (let i = 0; i < N; i++) if (m[i]) owner[i] = k;
  };
  claim(bodyAndFace, 1);
  claim(hands.handL, 2);
  claim(hands.handR, 3);
  claim(named.plus.mask, 4);
  claim(named.divBar.mask, 5);
  claim(named.divDotTop.mask, 6);
  claim(named.divDotBottom.mask, 7);
  let frontier = [];
  for (let i = 0; i < N; i++) if (owner[i]) frontier.push(i);
  const RADIUS = 200;
  for (let step = 0; step < RADIUS && frontier.length; step++) {
    const claims = new Map();
    for (const i of frontier) {
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (owner[q] || !any[q] || claims.has(q)) continue;
        claims.set(q, owner[i]);
      }
    }
    frontier = [];
    for (const [q, k] of claims) {
      owner[q] = k;
      frontier.push(q);
    }
  }
  let orphan = 0;
  for (let i = 0; i < N; i++) if (data[i * 4 + 3] > 2 && !owner[i]) orphan++; // alfa até 2 de 255 é ruído, invisível
  if (orphan) throw new Error("pixels sem dono: " + orphan);

  const fringeOf = (k) => {
    const m = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (owner[i] === k && !opaque[i]) m[i] = 1;
    return m;
  };
  // A borda suavizada de cada sinal (alfa parcial, até EDGE px) vai junto com o sinal, e não com o
  // brilho: se ficasse noutra camada, o Rive filtraria as duas separadamente quando o grupo
  // flutuasse em fração de pixel e a borda ficaria pontilhada.
  const EDGE = 2;
  const edgeOf = (k, symbol) => T.and(fringeOf(k), T.dilate(symbol, w, h, EDGE));
  const piece = {
    plus: [4, named.plus.mask],
    divBar: [5, named.divBar.mask],
    divDotTop: [6, named.divDotTop.mask],
    divDotBottom: [7, named.divDotBottom.mask],
  };
  const pieceMask = {};
  let edges = new Uint8Array(N);
  for (const [name, [k, mask]] of Object.entries(piece)) {
    const edge = edgeOf(k, mask);
    pieceMask[name] = T.or(mask, edge);
    edges = T.or(edges, edge);
  }
  // Brilho original: preso ao sinal, sem escala nem opacidade própria, para a borda e o halo não se
  // descolarem.
  const glowPlus = T.minus(fringeOf(4), edges);
  let glowDiv = new Uint8Array(N);
  for (const k of [5, 6, 7]) glowDiv = T.or(glowDiv, T.minus(fringeOf(k), edges));
  let divSymbols = new Uint8Array(N);
  for (const k of ["divBar", "divDotTop", "divDotBottom"])
    divSymbols = T.or(divSymbols, named[k].mask);
  // Brilho de pulso: o mesmo halo sem a borda do sinal (EDGE px para fora e GLOW_DEPTH para dentro
  // são refeitos por difusão, só com o brilho vizinho). Fica por trás do original, invisível no
  // repouso, e o Rive o infla e o acende de leve: o halo respira sem arrastar a borda do sinal.
  const GLOW_DEPTH = 10;
  const pulseOf = (symbol, ring) => {
    const hole = T.minus(T.dilate(symbol, w, h, EDGE), T.erode(symbol, w, h, GLOW_DEPTH));
    const samples = T.minus(ring, hole);
    const color = T.inpaint(data, w, h, hole, 12, samples);
    const plane = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      plane[i * 4] = plane[i * 4 + 1] = plane[i * 4 + 2] = data[i * 4 + 3];
      plane[i * 4 + 3] = 255;
    }
    const alpha = T.inpaint(plane, w, h, hole, 12, samples);
    const rgba = Uint8ClampedArray.from(data);
    for (let i = 0; i < N; i++)
      if (hole[i]) {
        rgba[i * 4] = color[i * 4];
        rgba[i * 4 + 1] = color[i * 4 + 1];
        rgba[i * 4 + 2] = color[i * 4 + 2];
        rgba[i * 4 + 3] = alpha[i * 4];
      }
    return { rgba, mask: T.or(ring, hole) };
  };
  const pulsePlus = pulseOf(named.plus.mask, glowPlus);
  const pulseDiv = pulseOf(divSymbols, glowDiv);

  // ---- corpo por baixo do rosto e por baixo das mãos ----
  const faceHole = T.and(faceAll, bodyAndFace);
  let bodyRGBA = T.inpaint(data, w, h, faceHole, 40, bodyMask);
  // Sob cada mão, o corpo continua por uma aba de TAB px dentro da mão (só dentro da silhueta),
  // com a cor dos vizinhos por difusão: a mão, desenhada por cima, a esconde no repouso.
  const inner = T.erode(opaque, w, h, 2);
  let tabs = new Uint8Array(N);
  for (const k of ["handL", "handR"])
    tabs = T.or(
      tabs,
      T.minus(T.and(T.and(T.dilate(bodyAndFace, w, h, TAB), hands[k]), inner), bodyAndFace),
    );
  bodyRGBA = T.inpaint(bodyRGBA, w, h, tabs, 30, T.or(bodyMask, faceHole));
  const bodyLayerMask = T.or(bodyAndFace, T.or(fringeOf(1), tabs));
  const bodyOut = Uint8ClampedArray.from(bodyRGBA);
  for (let i = 0; i < N; i++) {
    if (!bodyLayerMask[i]) bodyOut[i * 4 + 3] = 0;
    else if (tabs[i]) {
      bodyOut[i * 4] *= TAB_SHADE;
      bodyOut[i * 4 + 1] *= TAB_SHADE;
      bodyOut[i * 4 + 2] *= TAB_SHADE;
      bodyOut[i * 4 + 3] = 255;
    } else if (!faceHole[i]) {
      // pixels originais do corpo e da borda mantêm cor e alfa da arte
      bodyOut[i * 4] = data[i * 4];
      bodyOut[i * 4 + 1] = data[i * 4 + 1];
      bodyOut[i * 4 + 2] = data[i * 4 + 2];
      bodyOut[i * 4 + 3] = data[i * 4 + 3];
    }
  }

  // ---- exporta ----
  const manifest = {
    source: "public/oliver-peeking-widget.webp",
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
  const centroid = (mask) => {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let i = 0; i < N; i++)
      if (mask[i]) {
        sx += i % w;
        sy += (i / w) | 0;
        n++;
      }
    return [Math.round(sx / n), Math.round(sy / n)];
  };
  const bbox = (mask) => {
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;
    for (let i = 0; i < N; i++)
      if (mask[i]) {
        const x = i % w;
        const y = (i / w) | 0;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    return { x0, y0, x1, y1 };
  };

  // de trás para a frente
  put("body", bodyOut, bodyLayerMask, { pivot: [450, 535] });
  put("mouth", data, faceMasks.mouth, { pivot: centroid(faceMasks.mouth) });
  put("eyeL", data, faceMasks.eyeL, { pivot: centroid(faceMasks.eyeL) });
  put("eyeR", data, faceMasks.eyeR, { pivot: centroid(faceMasks.eyeR) });
  for (const k of ["handL", "handR"]) {
    const mask = T.or(hands[k], fringeOf(k === "handL" ? 2 : 3));
    const b = bbox(mask);
    put(k, data, mask, { pivot: [Math.round((b.x0 + b.x1) / 2), b.y1] });
  }
  put("pulsePlus", pulsePlus.rgba, pulsePlus.mask, { pivot: centroid(named.plus.mask) });
  put("pulseDiv", pulseDiv.rgba, pulseDiv.mask, { pivot: centroid(named.divBar.mask) });
  put("glowPlus", data, glowPlus, { pivot: centroid(named.plus.mask) });
  put("glowDiv", data, glowDiv, { pivot: centroid(named.divBar.mask) });
  put("plus", data, pieceMask.plus, { pivot: centroid(named.plus.mask) });
  put("divDotTop", data, pieceMask.divDotTop, { pivot: centroid(named.divDotTop.mask) });
  put("divDotBottom", data, pieceMask.divDotBottom, { pivot: centroid(named.divDotBottom.mask) });
  put("divBar", data, pieceMask.divBar, { pivot: centroid(named.divBar.mask) });
  fs.writeFileSync(path.join(LAYERS, "layers.json"), JSON.stringify(manifest, null, 2) + "\n");

  // recomposição em repouso (ordem da pilha) contra a arte original
  const { createCanvas, loadImage } = require("@napi-rs/canvas");
  const c = createCanvas(w, h);
  const g = c.getContext("2d");
  for (const name of manifest.order) {
    if (name.startsWith("pulse")) continue; // nasce invisível: não faz parte do repouso
    const L = manifest.layers[name];
    g.drawImage(await loadImage(path.join(LAYERS, L.file)), L.x0, L.y0);
  }
  const re = g.getImageData(0, 0, w, h).data;
  let maxd = 0;
  let bad = 0;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const a0 = data[i * 4 + 3];
    const a1 = re[i * 4 + 3];
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
    "| diferença máxima:",
    maxd.toFixed(1),
    "| pixels > 8:",
    bad,
    "| média:",
    (sum / N).toFixed(4),
  );
  if (DEBUG) T.savePNG(path.join(DEBUG, "recomposed.png"), w, h, re);
})();
