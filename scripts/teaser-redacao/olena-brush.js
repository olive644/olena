// Olena desenhada com o p5.brush: cada parte é pintada com o pincel (preenchimento com sangria de
// aquarela, contorno a carvão/lápis), então o traço tem textura de desenho à mão. A animação vem de
// transformar os pontos a cada quadro (squash e stretch, orelhas, olhos, boca, pata com lápis).
// As sementes são fixas por parte, então o traço não "ferve" entre quadros.
const FUR = "#2a2430";
const FUR_LIGHT = "#4a4058";
const FUR_FACET = "#3a3246";
const EAR_INNER = "#7c5cc4";
const EYE = "#facc15";
const EYE_LIGHT = "#ffe88d";
const EYE_DARK = "#f0a500";
const PUPIL = "#15121a";
const OUTLINE = "#14111a";
const L1 = 150;
const L2 = 140;
const SHOULDER = { left: [-125, -330], right: [125, -330] };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Pilha de transformações 2D simples, para posicionar cada ponto antes de desenhar. */
class Tf {
  constructor() {
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
  }
  push() {
    this.stack.push(this.m.slice());
  }
  pop() {
    this.m = this.stack.pop();
  }
  mul(a, b, c, d, e, f) {
    const [A, B, C, D, E, F] = this.m;
    this.m = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F];
  }
  translate(x, y) {
    this.mul(1, 0, 0, 1, x, y);
  }
  rotate(r) {
    const c = Math.cos(r);
    const s = Math.sin(r);
    this.mul(c, s, -s, c, 0, 0);
  }
  scale(x, y = x) {
    this.mul(x, 0, 0, y, 0, 0);
  }
  pt([x, y]) {
    const [a, b, c, d, e, f] = this.m;
    return [a * x + c * y + e, b * x + d * y + f];
  }
  pts(list) {
    return list.map((p) => this.pt(p));
  }
}

const ellipse = (cx, cy, rx, ry, n = 22) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });

export function solveArm(side, target) {
  const [sx, sy] = SHOULDER[side];
  let dx = target[0] - sx;
  let dy = target[1] - sy;
  const reach = Math.hypot(dx, dy);
  const d = clamp(reach, Math.abs(L1 - L2) + 1, L1 + L2 - 1);
  dx = (dx / (reach || 1)) * d;
  dy = (dy / (reach || 1)) * d;
  const base = Math.atan2(dy, dx);
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const options = [base - a, base + a].map((angle) => [sx + L1 * Math.cos(angle), sy + L1 * Math.sin(angle)]);
  const elbow = options[0][1] > options[1][1] ? options[0] : options[1];
  return [elbow, [sx + dx, sy + dy]];
}

export function toLocal(pose, wx, wy) {
  const s = pose.s ?? 0.8;
  return [(wx - pose.x) / (s * (pose.sx ?? 1)), (wy - pose.y) / (s * (pose.sy ?? 1))];
}

/**
 * Desenha a Olena com o pincel. brush = instância do p5.brush; W e H = tamanho da tela.
 * Mesma pose do olena-toon: x, y, s, sx, sy, tilt, head, breath, blink, lookX, lookY, brow, mouth,
 * smile, earL, earR, star, tail, pupil, armL, armR, pencil, pencilAngle.
 */
export function drawOlenaBrush(brush, W, H, pose) {
  const p = {
    x: 330, y: 1700, s: 0.8, sx: 1, sy: 1, tilt: 0, head: 0, breath: 0, blink: 0, lookX: 0, lookY: 0,
    brow: 0, mouth: 0, smile: 0.5, earL: 0, earR: 0, star: 1, tail: 0, pupil: 0, shadow: 1,
    armL: [-185, -150], armR: [185, -150], pencil: false, pencilAngle: 0.55, ...pose,
  };
  const tf = new Tf();
  let seed = 900;

  brush.push();
  brush.translate(-W / 2, -H / 2);

  // forma pintada: sangria de aquarela no preenchimento e contorno de carvão
  const shape = (points, fill, outline = OUTLINE, weight = 1.1, opacity = 255, bleed = 0.06) => {
    seed += 7;
    for (let layer = 0; layer < (fill ? 3 : 1); layer++) {
    brush.seed(seed + layer * 3);
    if (fill) {
      brush.fill(fill, opacity);
      brush.fillBleed(bleed);
      brush.fillTexture(0.15, 0.2);
    } else {
      brush.noFill();
    }
    if (outline) brush.set("charcoal", outline, weight);
    else brush.noStroke();
    brush.polygon(points.map(([x, y]) => [x, y]));
    brush.noFill();
    }
  };
  const stroke = (points, color, weight, name = "2B") => {
    brush.seed((seed += 7));
    brush.set(name, color, weight);
    brush.spline(points, 0.5);
  };
  const capsule = (a, b, r, fill) => {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
    const ox = Math.cos(ang) * r;
    const oy = Math.sin(ang) * r;
    const quad = [[a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy], [b[0] - ox, b[1] - oy], [a[0] - ox, a[1] - oy]];
    shape(tf.pts(quad), fill, null);
    shape(tf.pts(ellipse(a[0], a[1], r, r, 14)), fill, null);
    shape(tf.pts(ellipse(b[0], b[1], r, r, 14)), fill, null);
  };

  // sombra no chão
  brush.seed(881);
  brush.fill("#292432", 40 * p.shadow);
  brush.fillBleed(0.3);
  brush.noStroke();
  brush.polygon(ellipse(p.x, p.y + 6, 230 * p.s, 32 * p.s, 24));
  brush.noFill();

  tf.translate(p.x, p.y);
  tf.rotate(p.tilt);
  tf.scale(p.s * p.sx, p.s * p.sy);

  // cauda
  const tail = [[110, -120], [230, -110], [310 + p.tail * 30, -200], [300 + p.tail * 50, -330 - p.tail * 20]];
  for (let i = 0; i < tail.length - 1; i++) capsule(tail[i], tail[i + 1], 28, FUR);

  // pés
  for (const fx of [-72, 72]) shape(tf.pts(ellipse(fx, -22, 66, 32)), FUR);

  // corpo e barriga
  const b = p.breath * 6;
  shape(
    tf.pts([[-118, -352 - b], [118, -352 - b], [150, -250], [172, -150], [150, -55], [60, -20], [-60, -20], [-150, -55], [-172, -150], [-150, -250]]),
    FUR,
  );
  shape(tf.pts(ellipse(0, -190, 96, 112)), FUR_LIGHT, null, 1, 200);

  const arm = (side, hand, holdPencil) => {
    const [sh] = [SHOULDER[side]];
    const [elbow, end] = solveArm(side, hand);
    capsule(sh, elbow, 34, FUR);
    capsule(elbow, end, 34, FUR);
    shape(tf.pts(ellipse(end[0], end[1], 42, 42, 16)), FUR_LIGHT);
    if (holdPencil) {
      tf.push();
      tf.translate(end[0], end[1]);
      tf.rotate(p.pencilAngle);
      shape(tf.pts([[-11, -92], [11, -92], [11, -66], [-11, -66]]), "#f08aa8", OUTLINE, 0.8);
      shape(tf.pts([[-11, -60], [11, -60], [11, 48], [-11, 48]]), "#facc15", OUTLINE, 0.8);
      shape(tf.pts([[-11, 48], [11, 48], [0, 82]]), "#f3dcb4", OUTLINE, 0.7);
      shape(tf.pts([[-4, 70], [4, 70], [0, 82]]), PUPIL, null);
      shape(tf.pts(ellipse(0, 0, 40, 40, 16)), FUR_LIGHT);
      tf.pop();
    }
  };
  brush.render();
  arm("left", p.armL, false);
  brush.render();

  // cabeça
  tf.push();
  tf.translate(0, -340 - b);
  tf.rotate(p.head);

  const ear = (side, angle) => {
    const m = side === "left" ? -1 : 1;
    tf.push();
    tf.translate(m * 175, -250);
    tf.rotate(angle);
    shape(tf.pts([[m * -115, 40], [m * 20, -210], [m * 110, 30]]), FUR);
    shape(tf.pts([[m * -62, 28], [m * 22, -150], [m * 70, 22]]), EAR_INNER, null, 1, 230);
    tf.pop();
  };
  ear("left", p.earL);
  ear("right", p.earR);

  brush.render();
  // cabeça redonda com facetas de papel recortado
  const head = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const rx = 292;
    const ry = a > 0 && a < Math.PI ? 200 : 170;
    head.push([Math.cos(a) * rx, -130 + Math.sin(a) * ry * (a > 0 && a < Math.PI ? 1 : 1.18)]);
  }
  shape(tf.pts(head), FUR, OUTLINE, 1.4);
  shape(tf.pts([[-92, -300], [92, -300], [0, -190]]), FUR_LIGHT, null, 1, 190);
  shape(tf.pts([[-270, -150], [-190, -40], [-110, -190]]), FUR_FACET, null, 1, 200);
  shape(tf.pts([[270, -150], [190, -40], [110, -190]]), FUR_FACET, null, 1, 200);

  brush.render();
  // sobrancelhas
  for (const m of [-1, 1]) {
    const lift = -262 - p.brow * 22;
    stroke(tf.pts([[m * 192, lift + 14], [m * 130, lift - p.brow * 6], [m * 66, lift + 6 - p.brow * 16]]), "#9a88b8", 5, "pen");
  }

  // olhos
  const eye = (cx, cy) => {
    if (p.blink > 0.75) {
      stroke(tf.pts([[cx - 50, cy + 4], [cx, cy + 20], [cx + 50, cy + 4]]), "#9a88b8", 6, "pen");
      return;
    }
    const k = 1 - p.blink * 0.85;
    const w = 74;
    const h = 86 * k;
    const oct = [[-w * 0.55, -h], [w * 0.55, -h], [w, -h * 0.45], [w, h * 0.45], [w * 0.55, h], [-w * 0.55, h], [-w, h * 0.45], [-w, -h * 0.45]].map(([x, y]) => [cx + x, cy + y]);
    shape(tf.pts(oct), EYE, OUTLINE, 1.0, 245, 0.08);
    shape(tf.pts([oct[0], oct[1], [cx, cy], oct[7]]), EYE_LIGHT, null, 1, 200);
    shape(tf.pts([oct[4], oct[5], oct[6], [cx, cy]]), EYE_DARK, null, 1, 200);
    const px = cx + clamp(p.lookX, -1, 1) * 22;
    const py = cy + clamp(p.lookY, -1, 1) * 18 * k;
    shape(tf.pts(ellipse(px, py, 24 * (1 + p.pupil * 0.3), 52 * k * (1 + p.pupil * 0.15), 18)), PUPIL, null, 1, 255, 0.04);
    shape(tf.pts(ellipse(px - 8, py - 24 * k, 10, 10, 10)), "#ffffff", null, 1, 255, 0);
  };
  eye(-122, -150);
  eye(122, -150);

  brush.render();
  // nariz e boca
  shape(tf.pts([[-20, -62], [20, -62], [0, -40]]), "#c9a6ff", null);
  const open = clamp(p.mouth, 0, 1);
  if (open > 0.04) {
    const mw = 44 + open * 22;
    const mh = 8 + open * 50;
    shape(tf.pts(ellipse(0, -8 + mh * 0.5, mw, mh, 18)), "#120f16", OUTLINE, 0.8, 255, 0.03);
    shape(tf.pts(ellipse(0, -8 + mh * 1.1, mw * 0.6, mh * 0.4, 12)), "#e8527f", null, 1, 255, 0.03);
  } else {
    const s = p.smile * 20;
    stroke(tf.pts([[-50, -26], [-25, -10 + s], [0, -24], [25, -10 + s], [50, -26]]), "#8b7aa8", 5, "pen");
  }
  tf.pop();

  brush.render();
  // estrelinha da orelha direita
  tf.push();
  tf.translate(0, -340 - b);
  tf.rotate(p.head);
  tf.translate(175, -250);
  tf.rotate(p.earR);
  tf.translate(85, -120);
  tf.scale(p.star);
  const starPts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 26 : 56;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  shape(tf.pts(starPts), "#facc15", OUTLINE, 1.0, 245, 0.08);
  shape(tf.pts([starPts[0], starPts[1], [0, 0], starPts[9]]), EYE_LIGHT, null, 1, 190);
  tf.pop();

  brush.render();
  // pata direita por cima de tudo, com o lápis
  arm("right", p.armR, p.pencil);

  brush.pop();
}
