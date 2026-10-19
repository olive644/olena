// Gera a arte do tomate do Pomodoro em camadas de papel recortado, por codigo (sem imagem de
// origem): o corpo inteiro, um estagio por mordida (cada um com a polpa e as sementes expostas
// na borda da mordida), a peca que cada mordida arranca, a folha e as particulas.
// Saida: scripts/tomato-rive/layers/*.png + layers.json e public/pomodoro-tomato/estagio-N.webp
// (o quadro estatico usado com movimento reduzido e no cartao do Espaco do aluno).
// Uso: node scripts/tomato-rive/art.cjs
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");

const LAYERS = path.join(__dirname, "layers");
const PUBLIC = path.join(__dirname, "..", "..", "public", "pomodoro-tomato");
const W = 560;
const H = 640;
const S = 2; // fator sobre a arte original (280 x 290)
const OY = 70; // deslocamento vertical: espaco para a folha
const BITES = 8;

// contorno original do tomate (em unidades da arte de 280 x 290)
const OUTLINE_REL = [
  [-32, -11],
  [-35, 9],
  [-29, 23],
  [-17, 34],
  [1, 41],
  [17, 36],
  [30, 29],
  [65, 15],
  [65, -15],
  [30, -29],
  [17, -36],
  [1, -41],
  [-17, -34],
  [-29, -23],
  [-35, -9],
];
const outline = [];
{
  let x = 140,
    y = 78;
  outline.push([x, y]);
  for (const [dx, dy] of OUTLINE_REL) {
    x += dx;
    y += dy;
    outline.push([x, y]);
  }
  outline.pop();
}
const P = ([x, y]) => [x * S, y * S + OY];
const OUT = outline.map(P);
const CENTER = [W / 2, 175 * S + OY - 20];

// pseudo-aleatorio deterministico
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const reset = (s) => {
  seed = s;
};

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const RED = {
  dark: hex("#b3342a"),
  mid: hex("#ed4938"),
  light: hex("#ff6a52"),
  hi: hex("#ff8c70"),
};
const FLESH = {
  dark: hex("#f58e76"),
  mid: hex("#ffab92"),
  light: hex("#ffc2ae"),
  hi: hex("#ffd6c7"),
};

function poly(g, pts, fill, stroke) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 1;
    g.stroke();
  }
}

// triangulacao de papel recortado do corpo: anel externo, anel interno e centro
function body(g, pal, shift = [0, 0]) {
  reset(11);
  const c = [CENTER[0] + shift[0], CENTER[1] + shift[1]];
  const out = OUT.map(([x, y]) => [x + shift[0], y + shift[1]]);
  const inner = out.map(([x, y]) => {
    const k = 0.52 + (rnd() - 0.5) * 0.14;
    return [c[0] + (x - c[0]) * k + (rnd() - 0.5) * 10, c[1] + (y - c[1]) * k + (rnd() - 0.5) * 10];
  });
  const n = out.length;
  const light = Math.atan2(-1, -0.7);
  const tone = (pts) => {
    const mx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3 - c[0];
    const my = (pts[0][1] + pts[1][1] + pts[2][1]) / 3 - c[1];
    const a = Math.atan2(my, mx);
    let v = (Math.cos(a - light) + 1) / 2; // 1 voltado para a luz
    v += (rnd() - 0.5) * 0.28;
    v = Math.max(0, Math.min(1, v));
    return v < 0.3
      ? mix(pal.dark, pal.mid, v / 0.3)
      : v < 0.7
        ? mix(pal.mid, pal.light, (v - 0.3) / 0.4)
        : mix(pal.light, pal.hi, (v - 0.7) / 0.3);
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    for (const tri of [
      [inner[i], inner[j], out[i]],
      [inner[j], out[j], out[i]],
      [c, inner[i], inner[j]],
    ]) {
      poly(g, tri, css(tone(tri)), css(tone(tri)));
    }
  }
}

function silhouette(g, color, shift = [0, 0]) {
  poly(
    g,
    OUT.map(([x, y]) => [x + shift[0], y + shift[1]]),
    color,
  );
}

// mordidas: cada uma e a uniao de tres circulos (marcas de dentes) centrada numa linha que sai do
// meio do tomate, e o tamanho de cada uma e ajustado para o tomate perder uma fracao certa da
// area, de modo que as oito mordidas o comam por inteiro ao longo do tempo.
function rayHit(angle) {
  const dx = Math.cos(angle),
    dy = Math.sin(angle);
  let best = 0;
  for (let i = 0; i < OUT.length; i++) {
    const [x1, y1] = OUT[i],
      [x2, y2] = OUT[(i + 1) % OUT.length];
    const ex = x2 - x1,
      ey = y2 - y1;
    const det = dx * ey - dy * ex;
    if (Math.abs(det) < 1e-9) continue;
    const t = ((x1 - CENTER[0]) * ey - (y1 - CENTER[1]) * ex) / det;
    const u = ((x1 - CENTER[0]) * dy - (y1 - CENTER[1]) * dx) / det;
    if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
  }
  return best;
}
// angulo (graus, horario a partir de leste), fracao do raio onde fica o centro da mordida e a
// area restante desejada depois dela
const BITE_PLAN = [
  { a: -22, f: 1.0, left: 0.88 },
  { a: 32, f: 1.0, left: 0.77 },
  { a: 86, f: 1.0, left: 0.66 },
  { a: 140, f: 1.0, left: 0.55 },
  { a: 194, f: 1.0, left: 0.44 },
  { a: 240, f: 0.88, left: 0.32 },
  { a: 330, f: 0.66, left: 0.18 },
  { a: 70, f: 0.5, left: 0.06 },
];
const GEOM = [];
function circlesFor(k, scale) {
  const plan = BITE_PLAN[k];
  const rad = (plan.a * Math.PI) / 180;
  const dist = rayHit(rad) * plan.f;
  const cx = CENTER[0] + Math.cos(rad) * dist;
  const cy = CENTER[1] + Math.sin(rad) * dist;
  const tx = -Math.sin(rad),
    ty = Math.cos(rad);
  const r = 64 * scale;
  return {
    dir: [Math.cos(rad), Math.sin(rad)],
    center: [cx, cy],
    scale,
    circles: [
      [cx + tx * r * 0.95, cy + ty * r * 0.95, r * 0.8],
      [cx, cy, r],
      [cx - tx * r * 0.95, cy - ty * r * 0.95, r * 0.8],
    ],
  };
}
function biteCircles(k) {
  return GEOM[k];
}
function cut(g, k, grow) {
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "#000";
  for (let i = 0; i < k; i++) {
    for (const [x, y, r] of biteCircles(i).circles) {
      g.beginPath();
      g.arc(x, y, r + grow, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalCompositeOperation = "source-over";
}
// ajusta o tamanho de cada mordida para atingir a area restante planejada
function planBites() {
  const total = (() => {
    const cv = createCanvas(W, H),
      g = cv.getContext("2d");
    silhouette(g, "#000");
    return areaOf(cv);
  })();
  for (let k = 0; k < BITES; k++) {
    let lo = 0.4,
      hi = 6;
    for (let it = 0; it < 16; it++) {
      const mid = (lo + hi) / 2;
      GEOM[k] = circlesFor(k, mid);
      const cv = createCanvas(W, H),
        g = cv.getContext("2d");
      silhouette(g, "#000");
      cut(g, k + 1, 0);
      const left = areaOf(cv) / total;
      if (left > BITE_PLAN[k].left) lo = mid;
      else hi = mid;
    }
    GEOM[k] = circlesFor(k, (lo + hi) / 2);
  }
}

const SEEDS = [];
function seeds(g, k) {
  // sementes na borda de cada mordida (so as ja dadas), do lado voltado para dentro do tomate
  for (let i = 0; i < k; i++) {
    const { circles, center } = biteCircles(i);
    reset(100 + i);
    const inward = Math.atan2(CENTER[1] - center[1], CENTER[0] - center[0]);
    for (let s = 0; s < 9; s++) {
      const [x, y, r] = circles[s % 3];
      const a = inward + (rnd() - 0.5) * 2.2;
      const px = x + Math.cos(a) * (r - 9 - rnd() * 5);
      const py = y + Math.sin(a) * (r - 9 - rnd() * 5);
      g.save();
      g.translate(px, py);
      g.rotate(a + Math.PI / 2 + (rnd() - 0.5));
      g.beginPath();
      g.ellipse(0, 0, 5.4, 9.5, 0, 0, Math.PI * 2);
      g.fillStyle = "#fff0bf";
      g.fill();
      g.strokeStyle = "#e0a95e";
      g.lineWidth = 1.8;
      g.stroke();
      g.restore();
    }
  }
}

function renderStage(k) {
  const cv = createCanvas(W, H);
  const g = cv.getContext("2d");
  // espessura do papel
  const depth = createCanvas(W, H);
  const dg = depth.getContext("2d");
  silhouette(dg, "#a52c29", [0, 14]);
  cut(dg, k, -2);
  g.drawImage(depth, 0, 0);
  // polpa exposta (corte menor que o da casca)
  const flesh = createCanvas(W, H);
  const fg = flesh.getContext("2d");
  body(fg, FLESH);
  cut(fg, k, -20);
  // sementes so dentro da faixa de polpa
  const seedLayer = createCanvas(W, H);
  seeds(seedLayer.getContext("2d"), k);
  const sg2 = seedLayer.getContext("2d");
  sg2.globalCompositeOperation = "destination-in";
  sg2.drawImage(flesh, 0, 0);
  fg.drawImage(seedLayer, 0, 0);
  g.drawImage(flesh, 0, 0);
  // casca
  const skin = createCanvas(W, H);
  const sg = skin.getContext("2d");
  body(sg, RED);
  cut(sg, k, 0);
  g.drawImage(skin, 0, 0);
  return cv;
}

function areaOf(cv) {
  const d = cv.getContext("2d").getImageData(0, 0, W, H).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++;
  return n;
}

function renderLeaf() {
  const cv = createCanvas(W, H);
  const g = cv.getContext("2d");
  const leaf = "m140 66-35-20 9 25-43 9 42 13-15 25 42-24 39 24-13-26 44-12-42-9 8-25Z";
  const fold = "m140 78-42 40 42-24 39 24-13-26 44-12-48 3 14-37Z";
  g.save();
  g.translate(0, OY);
  g.scale(S, S);
  const draw = (d, color) => {
    g.fillStyle = color;
    g.fill(new (require("@napi-rs/canvas").Path2D)(d));
  };
  draw(leaf, "#62bd67");
  draw(fold, "#287543");
  g.restore();
  return cv;
}

function renderBits() {
  const out = {};
  // migalha (triangulo vermelho), semente, gota e brilho
  let cv = createCanvas(40, 40),
    g = cv.getContext("2d");
  poly(
    g,
    [
      [6, 30],
      [20, 6],
      [34, 28],
    ],
    "#ed4938",
  );
  poly(
    g,
    [
      [20, 6],
      [34, 28],
      [22, 22],
    ],
    "#b3342a",
  );
  out.migalha = cv;
  cv = createCanvas(36, 24);
  g = cv.getContext("2d");
  g.beginPath();
  g.ellipse(18, 12, 14, 8, 0, 0, Math.PI * 2);
  g.fillStyle = "#fff0bf";
  g.fill();
  g.strokeStyle = "#e0a95e";
  g.lineWidth = 2.5;
  g.stroke();
  out.semente = cv;
  cv = createCanvas(32, 44);
  g = cv.getContext("2d");
  g.beginPath();
  g.moveTo(16, 4);
  g.bezierCurveTo(30, 22, 28, 40, 16, 40);
  g.bezierCurveTo(4, 40, 2, 22, 16, 4);
  g.fillStyle = "#ff6a52";
  g.fill();
  g.beginPath();
  g.ellipse(11, 28, 3.5, 6, 0.3, 0, Math.PI * 2);
  g.fillStyle = "#ffb9a8";
  g.fill();
  out.gota = cv;
  cv = createCanvas(48, 48);
  g = cv.getContext("2d");
  poly(
    g,
    [
      [24, 2],
      [29, 19],
      [46, 24],
      [29, 29],
      [24, 46],
      [19, 29],
      [2, 24],
      [19, 19],
    ],
    "#ffd54a",
  );
  poly(
    g,
    [
      [24, 2],
      [29, 19],
      [24, 24],
    ],
    "#fff2a8",
  );
  out.brilho = cv;
  return out;
}

function crop(cv) {
  const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width,
    y0 = cv.height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < cv.height; y++)
    for (let x = 0; x < cv.width; x++)
      if (d[(y * cv.width + x) * 4 + 3] > 8) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1,
    h = y1 - y0 + 1;
  const out = createCanvas(w, h);
  out.getContext("2d").drawImage(cv, x0, y0, w, h, 0, 0, w, h);
  return { cv: out, x0, y0, w, h };
}

fs.mkdirSync(LAYERS, { recursive: true });
fs.mkdirSync(PUBLIC, { recursive: true });
for (const f of fs.readdirSync(LAYERS)) fs.unlinkSync(path.join(LAYERS, f));
for (const f of fs.readdirSync(PUBLIC)) fs.unlinkSync(path.join(PUBLIC, f));

const manifest = { width: W, height: H, bites: BITES, center: CENTER, layers: {}, biteInfo: [] };
planBites();
const stages = [];
for (let k = 0; k <= BITES; k++) stages.push(renderStage(k));
const areas = stages.map(areaOf);
console.log("area restante:", areas.map((a) => (a / areas[0]).toFixed(2)).join(" "));
const put = (name, cv, extra = {}) => {
  const c = crop(cv);
  if (!c) return;
  fs.writeFileSync(path.join(LAYERS, name + ".png"), c.cv.toBuffer("image/png"));
  manifest.layers[name] = { file: name + ".png", x0: c.x0, y0: c.y0, w: c.w, h: c.h, ...extra };
};
stages.forEach((cv, k) => put("estagio" + k, cv));
// peca arrancada por cada mordida: o que existe no estagio k e some no k+1
for (let k = 0; k < BITES; k++) {
  const cv = createCanvas(W, H);
  const g = cv.getContext("2d");
  g.drawImage(stages[k], 0, 0);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(stages[k + 1], 0, 0);
  g.globalCompositeOperation = "source-over";
  {
    // residuos de borda suavizada da subtracao viram uma silhueta fantasma: zera o alfa baixo
    const img = g.getImageData(0, 0, W, H);
    for (let i = 3; i < img.data.length; i += 4) if (img.data[i] < 70) img.data[i] = 0;
    g.putImageData(img, 0, 0);
  }
  put("peca" + k, cv);
  const b = biteCircles(k);
  manifest.biteInfo.push({ center: b.center, dir: b.dir });
}
put("folha", renderLeaf());
const bits = renderBits();
for (const [name, cv] of Object.entries(bits)) put(name, cv);
manifest.order = [
  ...Array.from({ length: BITES + 1 }, (_, k) => "estagio" + k),
  ...Array.from({ length: BITES }, (_, k) => "peca" + k),
  "folha",
  "migalha",
  "semente",
  "gota",
  "brilho",
];
fs.writeFileSync(path.join(LAYERS, "layers.json"), JSON.stringify(manifest, null, 2) + "\n");

// quadros estaticos (corpo + folha) para movimento reduzido e para o cartao do Espaco, todos com
// o mesmo recorte (o do tomate inteiro) para o tamanho nao pular de uma etapa para outra
const leaf = renderLeaf();
const composites = [];
for (let k = 0; k <= BITES; k++) {
  const cv = createCanvas(W, H);
  const g = cv.getContext("2d");
  g.drawImage(stages[k], 0, 0);
  g.drawImage(leaf, 0, 0);
  composites.push(cv);
}
const box = crop(composites[0]);
manifest.static = { x0: box.x0, y0: box.y0, w: box.w, h: box.h };
fs.writeFileSync(path.join(LAYERS, "layers.json"), JSON.stringify(manifest, null, 2) + "\n");
for (let k = 0; k <= BITES; k++) {
  const out = createCanvas(box.w, box.h);
  out.getContext("2d").drawImage(composites[k], box.x0, box.y0, box.w, box.h, 0, 0, box.w, box.h);
  fs.writeFileSync(path.join(PUBLIC, `estagio-${k}.webp`), out.toBuffer("image/webp", 88));
}
const total = fs
  .readdirSync(LAYERS)
  .reduce((n, f) => n + fs.statSync(path.join(LAYERS, f)).size, 0);
console.log(
  "camadas:",
  Object.keys(manifest.layers).length,
  "| png:",
  (total / 1024).toFixed(0),
  "KiB",
);
