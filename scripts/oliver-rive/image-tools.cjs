// Ferramentas de pixel para fatiar a arte do Oliver em camadas. Só usa @napi-rs/canvas, que já
// chega como dependência transitiva e é usada também pelo fatiador da Helena.
const fs = require("fs");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

async function loadRGBA(file) {
  const img = await loadImage(file);
  const c = createCanvas(img.width, img.height);
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, data: g.getImageData(0, 0, img.width, img.height).data };
}

function savePNG(file, w, h, data) {
  const c = createCanvas(w, h);
  const g = c.getContext("2d");
  const id = g.createImageData(w, h);
  id.data.set(data);
  g.putImageData(id, 0, 0);
  fs.writeFileSync(file, c.toBuffer("image/png"));
}

/** Máscara (0/1) de um polígono, desenhado com o mesmo motor da arte. */
function polyMask(w, h, points) {
  const c = createCanvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.beginPath();
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
  const d = g.getImageData(0, 0, w, h).data;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  return m;
}

function and(a, b) {
  const o = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) o[i] = a[i] & b[i];
  return o;
}
function or(a, b) {
  const o = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) o[i] = a[i] | b[i];
  return o;
}
function minus(a, b) {
  const o = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) o[i] = a[i] & (b[i] ^ 1);
  return o;
}
function count(m) {
  let n = 0;
  for (let i = 0; i < m.length; i++) n += m[i];
  return n;
}

/** Dilatação em disco de raio r (distância euclidiana aproximada por varredura em duas passadas). */
function dilate(m, w, h, r) {
  if (r <= 0) return Uint8Array.from(m);
  const INF = 1e9;
  const d = new Float32Array(w * h).fill(INF);
  for (let i = 0; i < w * h; i++) if (m[i]) d[i] = 0;
  const S2 = Math.SQRT2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 1);
        if (x > 0) v = Math.min(v, d[i - w - 1] + S2);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + S2);
      }
      d[i] = v;
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 1);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + S2);
        if (x > 0) v = Math.min(v, d[i + w - 1] + S2);
      }
      d[i] = v;
    }
  const o = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) o[i] = d[i] <= r ? 1 : 0;
  return o;
}
function erode(m, w, h, r) {
  const inv = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) inv[i] = m[i] ^ 1;
  const g = dilate(inv, w, h, r);
  const o = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) o[i] = g[i] ^ 1;
  return o;
}

/** Componentes conexos (8 vizinhos). Devolve rótulos e a lista ordenada por tamanho. */
function components(m, w, h) {
  const lab = new Int32Array(w * h).fill(-1);
  const list = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x] || lab[y * w + x] >= 0) continue;
      const id = list.length;
      const st = [y * w + x];
      lab[y * w + x] = id;
      let n = 0;
      let x0 = x,
        x1 = x,
        y0 = y,
        y1 = y;
      while (st.length) {
        const p = st.pop();
        const px = p % w;
        const py = (p / w) | 0;
        n++;
        if (px < x0) x0 = px;
        if (px > x1) x1 = px;
        if (py < y0) y0 = py;
        if (py > y1) y1 = py;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const q = ny * w + nx;
            if (!m[q] || lab[q] >= 0) continue;
            lab[q] = id;
            st.push(q);
          }
      }
      list.push({ id, n, x0, y0, x1, y1 });
    }
  return { lab, list };
}
function maskOfLabel(lab, id) {
  const o = new Uint8Array(lab.length);
  for (let i = 0; i < lab.length; i++) o[i] = lab[i] === id ? 1 : 0;
  return o;
}

/** Preenche os buracos de uma máscara (o que não é alcançável a partir da borda). */
function fillHoles(m, w, h) {
  const out = new Uint8Array(w * h);
  const st = [];
  const seen = new Uint8Array(w * h);
  const push = (x, y) => {
    const i = y * w + x;
    if (m[i] || seen[i]) return;
    seen[i] = 1;
    st.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (st.length) {
    const p = st.pop();
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  for (let i = 0; i < w * h; i++) out[i] = seen[i] ? 0 : 1;
  return out;
}

/**
 * Preenche os pixels de `hole` com a cor dos vizinhos conhecidos, de fora para dentro (casca de
 * cebola) e suaviza. Serve para a parte que uma peça móvel esconde: o que aparece quando ela sai.
 */
function inpaint(rgba, w, h, hole, smoothPasses = 24, valid = null) {
  const data = Uint8ClampedArray.from(rgba);
  const known = new Uint8Array(w * h);
  // só pixels válidos (por exemplo, da própria camada) servem de amostra
  for (let i = 0; i < w * h; i++) known[i] = !hole[i] && (!valid || valid[i]) ? 1 : 0;
  let frontier = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!hole[i]) continue;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && known[ny * w + nx]) {
          frontier.push(i);
          break;
        }
      }
    }
  const order = [];
  const done = new Uint8Array(w * h);
  while (frontier.length) {
    const next = [];
    const batch = [];
    for (const i of frontier) {
      if (done[i]) continue;
      const x = i % w;
      const y = (i / w) | 0;
      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (!known[q]) continue;
          r += data[q * 4];
          g += data[q * 4 + 1];
          b += data[q * 4 + 2];
          n++;
        }
      if (!n) continue;
      batch.push([i, r / n, g / n, b / n]);
      done[i] = 1;
    }
    for (const [i, r, g, b] of batch) {
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = 255;
      known[i] = 1;
      order.push(i);
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
          const q = ny * w + nx;
          if (hole[q] && !known[q] && !done[q]) next.push(q);
        }
      }
    }
    frontier = next;
  }
  for (let pass = 0; pass < smoothPasses; pass++)
    for (const i of order) {
      const x = i % w;
      const y = (i / w) | 0;
      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (!known[q]) continue;
        r += data[q * 4];
        g += data[q * 4 + 1];
        b += data[q * 4 + 2];
        n++;
      }
      if (n) {
        data[i * 4] = r / n;
        data[i * 4 + 1] = g / n;
        data[i * 4 + 2] = b / n;
      }
    }
  return data;
}

/** Recorta os pixels de `mask` (opacidade e cor da arte original) e acha a caixa. */
function cutLayer(src, w, h, mask) {
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x] && src[(y * w + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  const lw = x1 - x0 + 1;
  const lh = y1 - y0 + 1;
  const data = new Uint8ClampedArray(lw * lh * 4);
  for (let y = 0; y < lh; y++)
    for (let x = 0; x < lw; x++) {
      const si = ((y + y0) * w + (x + x0)) * 4;
      if (!mask[(y + y0) * w + (x + x0)]) continue;
      const di = (y * lw + x) * 4;
      data[di] = src[si];
      data[di + 1] = src[si + 1];
      data[di + 2] = src[si + 2];
      data[di + 3] = src[si + 3];
    }
  return { x0, y0, w: lw, h: lh, data };
}

function hsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const df = mx - mn;
  let hh = 0;
  if (df) hh = mx === r ? ((g - b) / df) % 6 : mx === g ? (b - r) / df + 2 : (r - g) / df + 4;
  return [(hh * 60 + 360) % 360, mx ? df / mx : 0, mx];
}

module.exports = {
  loadRGBA,
  savePNG,
  polyMask,
  and,
  or,
  minus,
  count,
  dilate,
  erode,
  components,
  maskOfLabel,
  fillHoles,
  inpaint,
  cutLayer,
  hsv,
};
