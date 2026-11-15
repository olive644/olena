// Fatia public/olena-shelf-sleeping.webp (480 x 240) nas peças da Olena dormindo e escreve
// layers-olena/*.png e layers-olena/layers.json. Depois confere que a soma das peças no repouso
// é a arte original (falha se passar de 2/255 em qualquer canal).
//
// Regra das peças que se mexem (orelha esquerda e cauda): o corpo guarda todos os pixels do
// interior da peça e perde só a faixa de WIDTH px junto da silhueta. A peça leva a região inteira.
// Assim, ao girar um pouco, nunca aparece buraco no corpo (o interior continua lá embaixo) e nunca
// sobra um contorno velho para fora da peça (a faixa da borda saiu do corpo).
// Olhos: cor âmbar, com preenchimento do fundo no corpo. Estrela: cópia por cima, o corpo fica com
// a original (a estrela só cresce e gira pouco, então não aparece buraco nem sombra).
// As estrelinhas de brilho e os "z" são desenhados aqui no mesmo estilo de papel recortado.
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const SOURCE = path.join(__dirname, "..", "..", "public", "olena-shelf-sleeping.webp");
const OUT = path.join(__dirname, "layers-olena");

const BAND = 7;
const EAR_L = [
  [92, 14],
  [118, 25],
  [147, 45],
  [160, 60],
  [166, 73],
  [131, 71],
  [100, 77],
  [49, 116],
  [43, 123],
  [42, 110],
  [46, 100],
  [56, 76],
  [71, 48],
  [82, 27],
];
const TAIL = [
  [310, 114],
  [358, 96],
  [399, 107],
  [428, 129],
  [447, 158],
  [455, 190],
  [451, 216],
  [435, 230],
  [415, 233],
  [333, 233],
  [331, 205],
  [345, 197],
  [385, 198],
  [410, 185],
  [425, 168],
  [418, 150],
  [402, 135],
  [375, 123],
  [340, 122],
  [318, 116],
];
const EYE_BOXES = { eyeL: [70, 145, 140, 185], eyeR: [165, 145, 235, 185] };
const STAR_BOX = [240, 55, 328, 138];

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

async function main() {
  const img = await loadImage(SOURCE);
  const W = img.width;
  const H = img.height;
  const base = createCanvas(W, H);
  base.getContext("2d").drawImage(img, 0, 0);
  const orig = base.getContext("2d").getImageData(0, 0, W, H).data;
  const at = (x, y) => (y * W + x) * 4;

  // distância até o pixel transparente mais próximo (fora do quadro também conta como vazio)
  const dist = new Float32Array(W * H).fill(1e9);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (orig[at(x, y) + 3] < 40) dist[y * W + x] = 0;
  const relax = (x, y, dx, dy, cost) => {
    const nx = x + dx;
    const ny = y + dy;
    const here = dist[y * W + x];
    const there = nx < 0 || ny < 0 || nx >= W || ny >= H ? 0 : dist[ny * W + nx];
    if (there + cost < here) dist[y * W + x] = there + cost;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      relax(x, y, -1, 0, 1);
      relax(x, y, 0, -1, 1);
      relax(x, y, -1, -1, 1.414);
      relax(x, y, 1, -1, 1.414);
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      relax(x, y, 1, 0, 1);
      relax(x, y, 0, 1, 1);
      relax(x, y, 1, 1, 1.414);
      relax(x, y, -1, 1, 1.414);
    }

  const body = new Uint8ClampedArray(orig);
  const layers = {};
  const order = []; // da frente para trás

  const savePng = (name, rgba, pivot, extra = {}) => {
    let x0 = W,
      y0 = H,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (rgba[at(x, y) + 3] > 0) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const c = createCanvas(w, h);
    const ctx = c.getContext("2d");
    const data = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const s = at(x0 + x, y0 + y);
        const d = (y * w + x) * 4;
        data.data[d] = rgba[s];
        data.data[d + 1] = rgba[s + 1];
        data.data[d + 2] = rgba[s + 2];
        data.data[d + 3] = rgba[s + 3];
      }
    ctx.putImageData(data, 0, 0);
    fs.writeFileSync(path.join(OUT, name + ".png"), c.toBuffer("image/png"));
    layers[name] = { file: name + ".png", x0, y0, w, h, pivot, ...extra };
  };
  const empty = () => new Uint8ClampedArray(W * H * 4);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // ---- peças com faixa de borda: orelha esquerda e cauda ----
  const rigid = (name, poly, pivot) => {
    const layer = empty();
    let moved = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (orig[at(x, y) + 3] === 0 || !inPolygon(x + 0.5, y + 0.5, poly)) continue;
        for (let k = 0; k < 4; k++) layer[at(x, y) + k] = orig[at(x, y) + k];
        if (dist[y * W + x] <= BAND) {
          for (let k = 0; k < 4; k++) body[at(x, y) + k] = 0;
          moved++;
        }
      }
    savePng(name, layer, pivot, { bandPixels: moved });
  };
  rigid("earL", EAR_L, [108, 84]);
  rigid("tail", TAIL, [320, 118]);

  // ---- olhos: âmbar, com o fundo preenchido no corpo ----
  const amber = (x, y) => {
    const i = at(x, y);
    return orig[i] > 130 && orig[i] - orig[i + 2] > 70 && orig[i + 3] > 200;
  };
  for (const [name, [bx0, by0, bx1, by1]] of Object.entries(EYE_BOXES)) {
    const core = new Uint8Array(W * H);
    const sums = [0, 0, 0, 0];
    for (let y = by0; y < by1; y++)
      for (let x = bx0; x < bx1; x++)
        if (amber(x, y)) {
          core[y * W + x] = 1;
          if (orig[at(x, y)] > 235) {
            sums[0] += orig[at(x, y)];
            sums[1] += orig[at(x, y) + 1];
            sums[2] += orig[at(x, y) + 2];
            sums[3]++;
          }
        }
    const color = sums.slice(0, 3).map((s) => Math.round(s / sums[3]));
    // o âmbar tem um halo marrom de 1 a 2 px: a máscara leva tudo isso
    const mask = new Uint8Array(W * H);
    for (let y = by0; y < by1; y++)
      for (let x = bx0; x < bx1; x++)
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++)
            if (Math.hypot(dx, dy) <= 2.3 && core[(y + dy) * W + x + dx]) mask[y * W + x] = 1;
    // preenche o fundo do corpo: descasca de fora para dentro com a média dos vizinhos conhecidos
    const known = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) known[i] = mask[i] ? 0 : 1;
    let pending = [];
    for (let y = by0; y < by1; y++)
      for (let x = bx0; x < bx1; x++) if (mask[y * W + x]) pending.push([x, y]);
    const filled = new Uint8ClampedArray(body);
    while (pending.length) {
      const next = [];
      const writes = [];
      for (const [x, y] of pending) {
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const k = (y + dy) * W + x + dx;
            if (known[k]) {
              r += filled[k * 4];
              g += filled[k * 4 + 1];
              b += filled[k * 4 + 2];
              n++;
            }
          }
        if (n) writes.push([x, y, r / n, g / n, b / n]);
        else next.push([x, y]);
      }
      if (!writes.length) break;
      for (const [x, y, r, g, b] of writes) {
        const k = y * W + x;
        filled[k * 4] = r;
        filled[k * 4 + 1] = g;
        filled[k * 4 + 2] = b;
        filled[k * 4 + 3] = 255;
        known[k] = 1;
      }
      pending = next;
    }
    const layer = empty();
    for (let y = by0; y < by1; y++)
      for (let x = bx0; x < bx1; x++) {
        if (!mask[y * W + x]) continue;
        for (let k = 0; k < 4; k++) layer[at(x, y) + k] = orig[at(x, y) + k];
        for (let k = 0; k < 3; k++) body[at(x, y) + k] = filled[at(x, y) + k];
        body[at(x, y) + 3] = 255;
      }
    let sx = 0,
      sy = 0,
      sn = 0;
    for (let y = by0; y < by1; y++)
      for (let x = bx0; x < bx1; x++)
        if (core[y * W + x]) {
          sx += x;
          sy += y;
          sn++;
        }
    savePng(name, layer, [Math.round(sx / sn), Math.round(sy / sn)], { color });
  }

  // ---- estrela: cópia por cima (o corpo mantém a original) ----
  {
    const [bx0, by0, bx1, by1] = STAR_BOX;
    const yellow = new Uint8Array(W * H);
    let sx = 0,
      sy = 0,
      sn = 0;
    for (let y = by0; y < by1; y++)
      for (let x = bx0; x < bx1; x++) {
        const i = at(x, y);
        if (orig[i] > 170 && orig[i] - orig[i + 2] > 90 && orig[i + 3] > 200) {
          yellow[y * W + x] = 1;
          sx += x;
          sy += y;
          sn++;
        }
      }
    const layer = empty();
    for (let y = by0; y < by1; y++)
      for (let x = bx0; x < bx1; x++) {
        let near = false;
        for (let dy = -2; dy <= 2 && !near; dy++)
          for (let dx = -2; dx <= 2; dx++)
            if (Math.hypot(dx, dy) <= 2.3 && yellow[(y + dy) * W + x + dx]) {
              near = true;
              break;
            }
        if (!near) continue;
        for (let k = 0; k < 4; k++) layer[at(x, y) + k] = orig[at(x, y) + k];
        if (orig[at(x, y) + 3] < 250) for (let k = 0; k < 4; k++) body[at(x, y) + k] = 0;
      }
    savePng("star", layer, [Math.round(sx / sn), Math.round(sy / sn)]);
  }

  // ---- corpo (o que sobrou) ----
  savePng("body", body, [240, 228]);

  // ---- estrelinhas de brilho e "z" (arte nova, no estilo do papel recortado) ----
  const drawNew = (name, w, h, pivot, painter) => {
    const c = createCanvas(w, h);
    painter(c.getContext("2d"), w, h);
    const rgba = empty();
    // o PNG novo é salvo com o tamanho próprio (não passa pelo quadro de 480 x 240)
    const png = c.toBuffer("image/png");
    fs.writeFileSync(path.join(OUT, name + ".png"), png);
    layers[name] = { file: name + ".png", x0: 0, y0: 0, w, h, pivot, fresh: true };
    void rgba;
  };
  const sparkle = (ctx, w, h) => {
    const cx = w / 2,
      cy = h / 2,
      R = w / 2 - 1,
      r = R * 0.2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? R : r;
      ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#fff8cf");
    g.addColorStop(0.5, "#fff8cf");
    g.addColorStop(0.5, "#ffe066");
    g.addColorStop(1, "#ffe066");
    ctx.fillStyle = g;
    ctx.fill();
  };
  drawNew("sparkleA", 30, 30, [15, 15], sparkle);
  drawNew("sparkleB", 20, 20, [10, 10], sparkle);
  const zed = (ctx, w, h) => {
    const s = w - 2,
      k = s * 0.24;
    const pts = [
      [1, 1],
      [1 + s, 1],
      [1 + s, 1 + k],
      [1 + k * 1.15, 1 + s - k],
      [1 + s, 1 + s - k],
      [1 + s, 1 + s],
      [1, 1 + s],
      [1, 1 + s - k],
      [1 + s - k * 1.15, 1 + k],
      [1, 1 + k],
    ];
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#ffe9a0");
    g.addColorStop(0.5, "#ffe9a0");
    g.addColorStop(0.5, "#f5b800");
    g.addColorStop(1, "#f5b800");
    ctx.fillStyle = g;
    ctx.fill();
  };
  drawNew("zBig", 40, 40, [20, 20], zed);
  drawNew("zMid", 30, 30, [15, 15], zed);
  drawNew("zSmall", 22, 22, [11, 11], zed);

  // da frente para trás (o primeiro fica por cima)
  order.push(
    "sparkleA",
    "sparkleB",
    "zBig",
    "zMid",
    "zSmall",
    "star",
    "eyeL",
    "eyeR",
    "earL",
    "tail",
    "body",
  );

  // ---- confere o repouso: soma das peças contra a arte ----
  const check = createCanvas(W, H);
  const cx = check.getContext("2d");
  const slices = ["body", "tail", "earL", "eyeL", "eyeR", "star"];
  for (const name of slices) {
    const L = layers[name];
    cx.drawImage(await loadImage(path.join(OUT, L.file)), L.x0, L.y0);
  }
  const sum = cx.getImageData(0, 0, W, H).data;
  let worst = 0;

  for (let i = 0; i < W * H * 4; i += 4) {
    const a = orig[i + 3];
    // pixels quase transparentes têm cor sem significado: compara premultiplicado
    for (let k = 0; k < 3; k++)
      worst = Math.max(worst, Math.abs((sum[i + k] * sum[i + 3]) / 255 - (orig[i + k] * a) / 255));
    worst = Math.max(worst, Math.abs(sum[i + 3] - a));
  }
  console.log("pior diferença no repouso (premultiplicado):", worst.toFixed(2), "/ 255");
  if (worst > 2.5) throw new Error("a soma das peças não bate com a arte original");

  fs.writeFileSync(
    path.join(OUT, "layers.json"),
    JSON.stringify({ width: W, height: H, order, layers }, null, 2) + "\n",
  );
  for (const [name, L] of Object.entries(layers))
    console.log(name.padEnd(9), `${L.w}x${L.h}`, `@ ${L.x0},${L.y0}`, "pivô", L.pivot.join(","));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
