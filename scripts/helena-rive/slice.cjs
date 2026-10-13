// Fatia o favicon da Helena (512 px) em camadas animáveis.
// @napi-rs/canvas chega como dependencia transitiva; so e usado para refazer as camadas.
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const LAYERS = path.join(__dirname, "layers");
const SOURCE = path.join(__dirname, "..", "..", "public", "olena-favicon.png");
const fs = require("fs");
const S = 512;

(async () => {
  const img = await loadImage(SOURCE);
  const c = createCanvas(S, S);
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, S, S);
  const src = g.getImageData(0, 0, S, S).data;
  const at = (x, y) => (y * S + x) * 4;
  const alpha = (k) => src[k * 4 + 3];
  const isYellow = (k) => {
    const i = k * 4;
    return src[i + 3] > 120 && src[i] > 170 && src[i + 1] > 120 && src[i + 2] < 120;
  };

  // componentes amarelos: 2 olhos e a estrela
  function components(test) {
    const seen = new Uint8Array(S * S),
      out = [];
    for (let s = 0; s < S * S; s++) {
      if (seen[s] || !test(s)) continue;
      const st = [s],
        px = [];
      seen[s] = 1;
      while (st.length) {
        const p = st.pop();
        px.push(p);
        const x = p % S,
          y = (p - x) / S;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx,
              ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
            const n = ny * S + nx;
            if (!seen[n] && test(n)) {
              seen[n] = 1;
              st.push(n);
            }
          }
      }
      if (px.length > 150) out.push(px);
    }
    return out.sort((a, b) => b.length - a.length);
  }
  const ys = components(isYellow);
  const centerOf = (px) => {
    let sx = 0,
      sy = 0;
    for (const p of px) {
      sx += p % S;
      sy += Math.floor(p / S);
    }
    return [sx / px.length, sy / px.length];
  };
  const eyeComps = ys.slice(0, 2).sort((a, b) => centerOf(a)[0] - centerOf(b)[0]);
  const starComp = ys[2];

  function hull(px) {
    const pts = px
      .map((p) => [p % S, Math.floor(p / S)])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [],
      up = [];
    for (const p of pts) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function insidePoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, ay] = poly[i],
        [bx, by] = poly[j];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  }
  function maskFromPoly(poly, grow = 0) {
    const m = new Uint8Array(S * S);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) if (insidePoly(x + 0.5, y + 0.5, poly)) m[y * S + x] = 1;
    return dilate(m, grow);
  }
  function dilate(m, r) {
    let cur = m;
    for (let k = 0; k < r; k++) {
      const nx = cur.slice();
      for (let y = 1; y < S - 1; y++)
        for (let x = 1; x < S - 1; x++) {
          const p = y * S + x;
          if (cur[p]) continue;
          if (cur[p - 1] || cur[p + 1] || cur[p - S] || cur[p + S]) nx[p] = 1;
        }
      cur = nx;
    }
    return cur;
  }

  // olhos: casco do amarelo + 3 px (contorno suave) ; pupila = escuro ou branco dentro do casco
  const eyes = eyeComps.map((px) => {
    const h = hull(px);
    const region = maskFromPoly(h, 3);
    const inner = maskFromPoly(h, 0);
    // miolo do olho: o casco encolhido 7 px, longe do contorno escuro do octogono
    const outside = new Uint8Array(S * S);
    for (let p = 0; p < S * S; p++) outside[p] = inner[p] ? 0 : 1;
    const deep = dilate(outside, 7);
    const lumAt = (p) => {
      const i = p * 4;
      return 0.3 * src[i] + 0.59 * src[i + 1] + 0.11 * src[i + 2];
    };
    const isWhite = (p) => {
      const i = p * 4;
      return src[i] > 195 && src[i + 1] > 195 && src[i + 2] > 170;
    };
    const darkComps = components((p) => !deep[p] && lumAt(p) < 110);
    const whiteComps = components((p) => !deep[p] && isWhite(p)).filter((c) => c.length > 20);
    const pupil = new Uint8Array(S * S);
    if (darkComps[0]) for (const p of darkComps[0]) pupil[p] = 1;
    for (const comp of whiteComps) for (const p of comp) pupil[p] = 1;
    // a borda suave da fenda vai junto (pixels que nao sao amarelo puro, colados nela)
    let grown = pupil;
    for (let k = 0; k < 4; k++) {
      const nx = grown.slice();
      for (let p = S; p < S * S - S; p++) {
        if (grown[p] || deep[p]) continue;
        if (
          (grown[p - 1] || grown[p + 1] || grown[p - S] || grown[p + S]) &&
          (!isYellow(p) || lumAt(p) < 190)
        )
          nx[p] = 1;
      }
      grown = nx;
    }
    return { hull: h, region, pupil: grown, center: centerOf(px) };
  });

  // orelhas: tudo de um lado da linha da base (com uma faixa extra por baixo, escondida atras da cabeca)
  const side = (x, y, a, b) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const LEFT_BASE = [
    [42, 204],
    [224, 86],
  ]; // acima desta linha: orelha esquerda
  const RIGHT_BASE = [
    [332, 150],
    [470, 298],
  ]; // a direita desta linha: orelha direita
  const distToLine = (x, y, [a, b]) => side(x, y, a, b) / Math.hypot(b[0] - a[0], b[1] - a[1]);
  // miolo da arte: longe da silhueta, onde a base escondida da orelha nunca aparece por fora
  const empty = new Uint8Array(S * S);
  for (let p = 0; p < S * S; p++) empty[p] = alpha(p) < 120 ? 1 : 0;
  const nearEdge = dilate(empty, 12);
  const earL = new Uint8Array(S * S),
    earLband = new Uint8Array(S * S),
    earR = new Uint8Array(S * S),
    earRband = new Uint8Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const p = y * S + x;
      if (alpha(p) < 3) continue;
      const dl = distToLine(x, y, LEFT_BASE); // negativo = acima
      if (x < 260 && dl < 0) earL[p] = 1;
      else if (x < 260 && dl < 42 && !nearEdge[p]) earLband[p] = 1;
      const dr = distToLine(x, y, RIGHT_BASE); // negativo = a direita/acima
      if (x > 315 && dr < 0) earR[p] = 1;
      else if (x > 315 && dr < 42 && !nearEdge[p]) earRband[p] = 1;
    }
  // estrela da orelha
  const starMask = new Uint8Array(S * S);
  for (const p of starComp) starMask[p] = 1;
  const starRegion = dilate(starMask, 3);

  // ---------- montagem das camadas ----------
  const layers = {};
  function layer(name, pick, color) {
    let minX = S,
      minY = S,
      maxX = -1,
      maxY = -1;
    for (let p = 0; p < S * S; p++)
      if (pick(p)) {
        const x = p % S,
          y = (p - x) / S;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    const w = maxX - minX + 1,
      h = maxY - minY + 1;
    const cv = createCanvas(w, h),
      cg = cv.getContext("2d"),
      id = cg.createImageData(w, h);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const p = y * S + x;
        if (!pick(p)) continue;
        const col = color(p);
        const o = ((y - minY) * w + (x - minX)) * 4;
        id.data[o] = col[0];
        id.data[o + 1] = col[1];
        id.data[o + 2] = col[2];
        id.data[o + 3] = col[3];
      }
    cg.putImageData(id, 0, 0);
    const buf = cv.toBuffer("image/png");
    fs.writeFileSync(path.join(LAYERS, `layer-${name}.png`), buf);
    layers[name] = {
      x: minX,
      y: minY,
      w,
      h,
      cx: minX + w / 2,
      cy: minY + h / 2,
      file: `layer-${name}.png`,
    };
  }
  const orig = (p) => [src[p * 4], src[p * 4 + 1], src[p * 4 + 2], src[p * 4 + 3]];

  // preenchimento por vizinho mais proximo (BFS) dentro de uma regiao, a partir de pixels-fonte
  function nearestFill(region, isSource) {
    const color = new Int32Array(S * S).fill(-1);
    let frontier = [];
    for (let p = 0; p < S * S; p++)
      if (region[p]) {
        const x = p % S,
          y = (p - x) / S;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const n = (y + dy) * S + x + dx;
          if (n >= 0 && n < S * S && !region[n] && isSource(n)) {
            color[p] = n;
            frontier.push(p);
            break;
          }
        }
      }
    while (frontier.length) {
      const next = [];
      for (const p of frontier) {
        const x = p % S,
          y = (p - x) / S;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const n = (y + dy) * S + x + dx;
          if (n < 0 || n >= S * S || !region[n] || color[n] >= 0) continue;
          color[n] = color[p];
          next.push(n);
        }
      }
      frontier = next;
    }
    return color;
  }

  // iris: olho sem a pupila (pupila preenchida com o amarelo vizinho)
  eyes.forEach((eye, i) => {
    // a iris e facetada em raios a partir do centro: cada pixel escondido pela pupila recebe a cor
    // da faceta seguindo o raio para fora, e depois a emenda e suavizada so dentro do buraco
    const [ecx, ecy] = eye.center;
    const holeColor = new Map();
    for (let p = 0; p < S * S; p++) {
      if (!eye.pupil[p]) continue;
      const x = p % S,
        y = (p - x) / S;
      let dx = x - ecx,
        dy = y - ecy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const acc = [0, 0, 0];
      let n = 0;
      for (let s = 1; s < 120 && n < 4; s++) {
        const qx = Math.round(x + dx * s),
          qy = Math.round(y + dy * s);
        if (qx < 0 || qy < 0 || qx >= S || qy >= S) break;
        const q = qy * S + qx;
        if (eye.pupil[q]) continue;
        if (!isYellow(q)) break;
        if (n === 0) s += 2; // pula a borda suave da fenda
        const i4 = q * 4;
        acc[0] += src[i4];
        acc[1] += src[i4 + 1];
        acc[2] += src[i4 + 2];
        n++;
      }
      if (n)
        holeColor.set(
          p,
          acc.map((v) => v / n),
        );
    }
    for (let pass = 0; pass < 3; pass++) {
      const next = new Map();
      for (const [p, col] of holeColor) {
        const acc = [col[0] * 2, col[1] * 2, col[2] * 2];
        let w = 2;
        for (const d of [-1, 1, -S, S]) {
          const c2 = holeColor.get(p + d);
          if (c2) {
            acc[0] += c2[0];
            acc[1] += c2[1];
            acc[2] += c2[2];
            w++;
          }
        }
        next.set(
          p,
          acc.map((v) => v / w),
        );
      }
      for (const [p, col] of next) holeColor.set(p, col);
    }
    const fallback = nearestFill(eye.pupil, (n) => eye.region[n] && !eye.pupil[n] && isYellow(n));
    layer(
      i ? "irisR" : "irisL",
      (p) => eye.region[p] && alpha(p) > 3,
      (p) => {
        if (!eye.pupil[p]) return orig(p);
        const col = holeColor.get(p);
        if (col) return [Math.round(col[0]), Math.round(col[1]), Math.round(col[2]), 255];
        return fallback[p] >= 0 ? [...orig(fallback[p]).slice(0, 3), 255] : orig(p);
      },
    );
    // borda da pupila: preto com alfa (a mistura com o amarelo sai da conta), assim ela passa por
    // cima de qualquer faceta da iris sem levar amarelo junto
    const lumOf = (col) => 0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2];
    layer(
      i ? "pupilR" : "pupilL",
      (p) => eye.pupil[p] && alpha(p) > 3,
      (p) => {
        const o = orig(p),
          l = lumOf(o);
        const white = o[0] > 195 && o[1] > 195 && o[2] > 170;
        if (white || l < 60) return o;
        // perto do brilho branco: mistura de branco e preto, fica como esta
        if (o[2] > 120 && Math.abs(o[0] - o[2]) < 60) return o;
        const under = holeColor.get(p);
        const base = under ? lumOf(under) : 215;
        const a = Math.max(0, Math.min(1, (base - l) / Math.max(1, base - 14)));
        return [12, 10, 6, Math.round(255 * a)];
      },
    );
  });
  // a estrela da orelha
  // estrelinha: o amarelo inteiro, e a borda vira amarelo com alfa (sem levar pelo escuro junto)
  const starFill = nearestFill(starRegion, () => false);
  layer(
    "earStar",
    (p) => starRegion[p] && alpha(p) > 3,
    (p) => {
      const o = orig(p);
      if (starMask[p]) return o;
      const l = 0.3 * o[0] + 0.59 * o[1] + 0.11 * o[2];
      const a = Math.max(0, Math.min(1, (l - 30) / 160));
      // cor: o amarelo da estrela mais perto
      let best = null,
        bd = 1e9;
      const x = p % S,
        y = (p - x) / S;
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const q = (y + dy) * S + x + dx;
          if (q >= 0 && q < S * S && starMask[q]) {
            const d = dx * dx + dy * dy;
            if (d < bd) {
              bd = d;
              best = q;
            }
          }
        }
      const c = best !== null ? orig(best) : o;
      return [c[0], c[1], c[2], Math.round(255 * a * (o[3] / 255))];
    },
  );
  void starFill;
  // orelha direita sem a estrela: o buraco recebe a cor da orelha em volta
  const earRall = new Uint8Array(S * S);
  for (let p = 0; p < S * S; p++) earRall[p] = earR[p] || earRband[p];
  const earRpx = [];
  for (let p = 0; p < S * S; p++) if (earRall[p] && !starRegion[p]) earRpx.push(p);
  const earRhull = hull(earRpx);
  const holeR = new Uint8Array(S * S);
  for (let p = 0; p < S * S; p++)
    if (starRegion[p] && insidePoly((p % S) + 0.5, Math.floor(p / S) + 0.5, earRhull)) holeR[p] = 1;
  const earRfillRaw = nearestFill(holeR, (n) => earRall[n] && !starRegion[n] && alpha(n) > 200);
  const earRcol = new Map();
  for (let p = 0; p < S * S; p++)
    if (holeR[p] && earRfillRaw[p] >= 0) earRcol.set(p, orig(earRfillRaw[p]).slice(0, 3));
  for (let pass = 0; pass < 10; pass++) {
    const next = new Map();
    for (const [p, col] of earRcol) {
      const acc = [col[0] * 2, col[1] * 2, col[2] * 2];
      let w = 2;
      for (const d of [-1, 1, -S, S, -S - 1, -S + 1, S - 1, S + 1]) {
        const c2 =
          earRcol.get(p + d) ||
          (earRall[p + d] && !starRegion[p + d] && alpha(p + d) > 200 ? orig(p + d) : null);
        if (c2) {
          acc[0] += c2[0];
          acc[1] += c2[1];
          acc[2] += c2[2];
          w++;
        }
      }
      next.set(
        p,
        acc.map((v) => v / w),
      );
    }
    for (const [p, col] of next) earRcol.set(p, col);
  }
  const earRfill = earRfillRaw;
  const earRcolor = (p) => {
    const c = earRcol.get(p);
    return c ? [Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255] : SOCKET_FALLBACK;
  };
  const SOCKET_FALLBACK = [20, 17, 22, 255];
  layer("earL", (p) => (earL[p] || earLband[p]) && alpha(p) > 3, orig);
  layer(
    "earR",
    (p) => (earRall[p] && !starRegion[p] && alpha(p) > 3) || (holeR[p] && earRfill[p] >= 0),
    (p) => (holeR[p] && earRfill[p] >= 0 ? earRcolor(p) : orig(p)),
  );
  // cabeca: sem orelhas, sem estrela; olhos viram orbita escura
  const SOCKET = [20, 17, 22, 255];
  // orbita: cada pixel do olho recebe a pelagem que esta no mesmo raio, logo fora do olho,
  // escurecida um pouco; parece a palpebra fechada com as facetas da cabeca
  const socket = new Map();
  for (const eye of eyes) {
    const [ecx, ecy] = eye.center;
    for (let p = 0; p < S * S; p++) {
      if (!eye.region[p]) continue;
      const x = p % S,
        y = (p - x) / S;
      let dx = x - ecx,
        dy = y - ecy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const acc = [0, 0, 0];
      let n = 0;
      for (let s = 1; s < 160 && n < 5; s++) {
        const qx = Math.round(x + dx * s),
          qy = Math.round(y + dy * s);
        if (qx < 0 || qy < 0 || qx >= S || qy >= S) break;
        const q = qy * S + qx;
        if (eye.region[q]) continue;
        if (alpha(q) < 200) break;
        if (n === 0) s += 3;
        acc[0] += src[q * 4];
        acc[1] += src[q * 4 + 1];
        acc[2] += src[q * 4 + 2];
        n++;
      }
      if (n)
        socket.set(
          p,
          acc.map((v) => (v / n) * 0.82),
        );
    }
  }
  for (let pass = 0; pass < 6; pass++) {
    const next = new Map();
    for (const [p, col] of socket) {
      const acc = [col[0] * 2, col[1] * 2, col[2] * 2];
      let w = 2;
      for (const d of [-1, 1, -S, S]) {
        const c2 = socket.get(p + d);
        if (c2) {
          acc[0] += c2[0];
          acc[1] += c2[1];
          acc[2] += c2[2];
          w++;
        }
      }
      next.set(
        p,
        acc.map((v) => v / w),
      );
    }
    for (const [p, col] of next) socket.set(p, col);
  }
  const anyEye = (p) => eyes.some((e) => e.region[p]);
  layer(
    "head",
    (p) =>
      alpha(p) > 3 &&
      !earL[p] &&
      !earR[p] &&
      !(starRegion[p] && !insidePoly((p % S) + 0.5, Math.floor(p / S) + 0.5, earRhull)),
    (p) => {
      if (anyEye(p)) {
        const col = socket.get(p);
        return col ? [Math.round(col[0]), Math.round(col[1]), Math.round(col[2]), 255] : SOCKET;
      }
      if (starRegion[p]) return earRfill[p] >= 0 ? earRcolor(p) : SOCKET;
      return orig(p);
    },
  );
  // pivos
  const pivots = {
    earL: [(LEFT_BASE[0][0] + LEFT_BASE[1][0]) / 2, (LEFT_BASE[0][1] + LEFT_BASE[1][1]) / 2],
    earR: [(RIGHT_BASE[0][0] + RIGHT_BASE[1][0]) / 2, (RIGHT_BASE[0][1] + RIGHT_BASE[1][1]) / 2],
    earLBase: LEFT_BASE,
    earRBase: RIGHT_BASE,
    earLTip: [125, 18],
    earRTip: [470, 104],
    eyeL: eyes[0].center,
    eyeR: eyes[1].center,
  };
  fs.writeFileSync(path.join(LAYERS, "layers.json"), JSON.stringify({ layers, pivots }, null, 1));
  console.log(
    Object.entries(layers)
      .map(([k, v]) => `${k} ${v.w}x${v.h} @${v.x},${v.y}`)
      .join("\n"),
  );
})();
