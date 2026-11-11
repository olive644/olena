// Olena desenhada em 2D, no estilo dos personagens de animação de apps (formas simples, cabeça
// grande, movimento elástico). Tudo é desenhado por código, sem imagem: a identidade vem de
// cabeça de gata preta, olhos amarelos de pupila vertical e a estrelinha na orelha direita.
// Unidades locais: origem no chão, sob o centro do corpo; y negativo é para cima.
export const FUR = "#2a2430";
const FUR_LIGHT = "#3d3548";
const FUR_FACET = "#4b4258";
const EAR_INNER = "#6a4fa3";
const EYE = "#facc15";
const EYE_LIGHT = "#ffe88d";
const EYE_DARK = "#f0a500";
const PUPIL = "#15121a";
const STAR = "#facc15";
const STAR_LIGHT = "#ffe88d";

const L1 = 150;
const L2 = 140;
const SHOULDER = { left: [-125, -330], right: [125, -330] };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function poly(ctx, points, fill) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function star(ctx, cx, cy, radius, rotation, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? radius * 0.46 : radius;
    points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  poly(ctx, points, STAR);
  poly(ctx, [points[0], points[1], [0, 0], points[9]], STAR_LIGHT);
  poly(ctx, [points[4], points[5], [0, 0], points[3]], "#e8ad00");
  ctx.restore();
}

/** Cinemática inversa de dois ossos: devolve [cotovelo, mão], com o cotovelo para baixo. */
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

function drawArm(ctx, side, hand, holdPencil, pencilAngle) {
  const [sx, sy] = SHOULDER[side];
  const [elbow, end] = solveArm(side, hand);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = FUR;
  ctx.lineWidth = 76;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(elbow[0], elbow[1]);
  ctx.lineTo(end[0], end[1]);
  ctx.stroke();
  // pata mais clara
  ctx.fillStyle = FUR_LIGHT;
  ctx.beginPath();
  ctx.arc(end[0], end[1], 46, 0, Math.PI * 2);
  ctx.fill();
  if (holdPencil) {
    ctx.translate(end[0], end[1]);
    ctx.rotate(pencilAngle);
    // lápis: corpo amarelo, madeira e grafite na ponta (para baixo), borracha em cima
    ctx.fillStyle = "#f08aa8";
    ctx.beginPath();
    ctx.roundRect(-11, -92, 22, 26, 6);
    ctx.fill();
    ctx.fillStyle = "#c8c3d4";
    ctx.fillRect(-11, -68, 22, 8);
    ctx.fillStyle = STAR;
    ctx.fillRect(-11, -60, 22, 108);
    ctx.fillStyle = "#e8ad00";
    ctx.fillRect(2, -60, 9, 108);
    poly(ctx, [[-11, 48], [11, 48], [0, 82]], "#f3dcb4");
    poly(ctx, [[-4, 70], [4, 70], [0, 82]], PUPIL);
    // a pata segura o lápis por cima
    ctx.fillStyle = FUR_LIGHT;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function eye(ctx, cx, cy, p, side) {
  const closed = p.blink;
  ctx.save();
  ctx.translate(cx, cy);
  if (closed > 0.75) {
    // olho fechado: um arco, como nos desenhos animados
    ctx.strokeStyle = "#8b7aa8";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 8, 52, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.scale(1, 1 - closed * 0.85);
  const w = 74;
  const h = 86;
  const octagon = [
    [-w * 0.55, -h],
    [w * 0.55, -h],
    [w, -h * 0.45],
    [w, h * 0.45],
    [w * 0.55, h],
    [-w * 0.55, h],
    [-w, h * 0.45],
    [-w, -h * 0.45],
  ];
  poly(ctx, octagon, EYE);
  poly(ctx, [octagon[0], octagon[1], [0, 0], octagon[7]], EYE_LIGHT);
  poly(ctx, [octagon[4], octagon[5], octagon[6], [0, 0]], EYE_DARK);
  // pupila vertical; anda pelo olho e cresce quando ela está animada
  const px = clamp(p.lookX, -1, 1) * 22;
  const py = clamp(p.lookY, -1, 1) * 18;
  ctx.fillStyle = PUPIL;
  ctx.beginPath();
  ctx.ellipse(px, py, 24 * (1 + p.pupil * 0.3), 52 * (1 + p.pupil * 0.15), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(px - 8 * (side === "left" ? 1 : 1), py - 24, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Pose (tudo opcional): x, y (pés na tela), s (escala), sx, sy (amassar e esticar pelo chão),
 * tilt (corpo), head (inclinação da cabeça), breath, blink, lookX, lookY, brow (-1 preocupada a 1
 * animada), mouth (0 fechada a 1 aberta), smile (0 a 1), earL, earR, star, tail, pupil,
 * armL / armR: alvo da mão em coordenadas locais; pencil: se a pata direita segura o lápis.
 */
export function drawOlenaToon(ctx, pose) {
  const p = {
    x: 540, y: 1700, s: 0.8, sx: 1, sy: 1, tilt: 0, head: 0, breath: 0, blink: 0, lookX: 0, lookY: 0,
    brow: 0, mouth: 0, smile: 0.5, earL: 0, earR: 0, star: 1, tail: 0, pupil: 0, shadow: 1,
    armL: [-185, -150], armR: [185, -150], pencil: false, pencilAngle: 0.55, ...pose,
  };
  ctx.save();
  // sombra no chão: não amassa junto com o corpo
  ctx.fillStyle = `rgba(41,36,50,${0.16 * p.shadow})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 6, 230 * p.s * (1 + (1 - p.sy) * 0.6), 34 * p.s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt);
  ctx.scale(p.s * p.sx, p.s * p.sy);

  // cauda
  ctx.strokeStyle = FUR;
  ctx.lineWidth = 58;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(110, -120);
  ctx.bezierCurveTo(250, -90, 330 + p.tail * 30, -190, 300 + p.tail * 50, -330 - p.tail * 20);
  ctx.stroke();

  // pés
  ctx.fillStyle = FUR;
  for (const fx of [-72, 72]) {
    ctx.beginPath();
    ctx.ellipse(fx, -22, 66, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // corpo em formato de pera, com a barriga um tom mais clara
  const b = p.breath * 6;
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.moveTo(-160, -50);
  ctx.bezierCurveTo(-190, -170, -140, -300 - b, -118, -352 - b);
  ctx.lineTo(118, -352 - b);
  ctx.bezierCurveTo(140, -300 - b, 190, -170, 160, -50);
  ctx.bezierCurveTo(100, -10, -100, -10, -160, -50);
  ctx.fill();
  ctx.fillStyle = FUR_LIGHT;
  ctx.beginPath();
  ctx.ellipse(0, -190, 96, 112, 0, 0, Math.PI * 2);
  ctx.fill();

  drawArm(ctx, "left", p.armL, false, 0);

  // cabeça
  ctx.save();
  ctx.translate(0, -340 - b);
  ctx.rotate(p.head);
  // orelhas, atrás da cabeça
  const ear = (side, angle) => {
    const m = side === "left" ? -1 : 1;
    ctx.save();
    ctx.translate(m * 175, -250);
    ctx.rotate(angle);
    poly(ctx, [[m * -115, 40], [m * 20, -210], [m * 110, 30]].map(([x, y]) => [x, y]), FUR);
    poly(ctx, [[m * -62, 28], [m * 22, -150], [m * 70, 22]], EAR_INNER);
    ctx.restore();
  };
  ear("left", p.earL);
  ear("right", p.earR);

  // cabeça arredondada, com facetas leves que lembram o papel recortado da Olena
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.moveTo(-292, -120);
  ctx.bezierCurveTo(-304, -262, -172, -332, 0, -332);
  ctx.bezierCurveTo(172, -332, 304, -262, 292, -120);
  ctx.bezierCurveTo(282, 0, 152, 72, 0, 72);
  ctx.bezierCurveTo(-152, 72, -282, 0, -292, -120);
  ctx.fill();
  ctx.save();
  ctx.clip();
  poly(ctx, [[-92, -330], [92, -330], [0, -190]], FUR_LIGHT);
  poly(ctx, [[-292, -150], [-190, -40], [-110, -190]], FUR_FACET);
  poly(ctx, [[292, -150], [190, -40], [110, -190]], FUR_FACET);
  poly(ctx, [[-90, 72], [90, 72], [0, -10]], FUR_LIGHT);
  ctx.restore();

  // sobrancelhas
  ctx.strokeStyle = "#9a88b8";
  ctx.lineWidth = 15;
  ctx.lineCap = "round";
  for (const m of [-1, 1]) {
    ctx.beginPath();
    const lift = -262 - p.brow * 22;
    const inner = lift + p.brow * -18 + (p.brow < 0 ? p.brow * -10 : 0);
    ctx.moveTo(m * 192, lift + 14);
    ctx.lineTo(m * 66, inner + (p.brow < 0 ? -26 : 6));
    ctx.stroke();
  }

  eye(ctx, -122, -150, p, "left");
  eye(ctx, 122, -150, p, "right");

  // nariz e boca
  poly(ctx, [[-20, -62], [20, -62], [0, -40]], "#c9a6ff");
  ctx.strokeStyle = "#8b7aa8";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(0, -24);
  ctx.stroke();
  const open = clamp(p.mouth, 0, 1);
  if (open > 0.04) {
    const mw = 44 + open * 22;
    const mh = 8 + open * 50;
    ctx.fillStyle = "#120f16";
    ctx.beginPath();
    ctx.ellipse(0, -8 + mh * 0.5, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -8 + mh * 0.5, mw, mh, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#e8527f";
    ctx.beginPath();
    ctx.ellipse(0, -8 + mh * 1.25, mw * 0.7, mh * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.strokeStyle = "#8b7aa8";
    ctx.lineWidth = 9;
    ctx.beginPath();
    const s = p.smile * 20;
    ctx.moveTo(-50, -26 + s * 0.2);
    ctx.quadraticCurveTo(-25, -10 + s, 0, -24);
    ctx.quadraticCurveTo(25, -10 + s, 50, -26 + s * 0.2);
    ctx.stroke();
  }

  // estrelinha na orelha direita
  ctx.save();
  ctx.translate(175, -250);
  ctx.rotate(p.earR);
  star(ctx, 85, -120, 56, 0.1, p.star);
  ctx.restore();
  ctx.restore();

  // pata direita por cima do corpo, e do lápis quando escreve
  drawArm(ctx, "right", p.armR, p.pencil, p.pencilAngle);
  ctx.restore();
}

/** Converte um ponto da tela para as coordenadas locais da Olena (sem inclinação do corpo). */
export function toLocal(pose, wx, wy) {
  const s = pose.s ?? 0.8;
  return [(wx - pose.x) / (s * (pose.sx ?? 1)), (wy - pose.y) / (s * (pose.sy ?? 1))];
}
export const PENCIL_TIP = [-34, 72]; // da pata até a ponta do lápis, para o lápis em 0,55 rad
