// Gera public/helena-assistant/helena.riv: a estrela de papel do assistente antigo (vetor) e a
// Helena do favicon em camadas (cabeca, orelhas, olhos com iris e pupila, estrelinha), com a
// maquina de estados "Helena" (camadas corpo e olhar). Formato binario do runtime oficial do Rive,
// versao 7. Uso: node scripts/helena-rive/generate.cjs (as camadas vem de slice.cjs).
const fs = require("fs");
const path = require("path");
const LAYERS = path.join(__dirname, "layers");
const OUTPUT = path.join(__dirname, "..", "..", "public", "helena-assistant", "helena.riv");
const { layers, pivots } = JSON.parse(fs.readFileSync(path.join(LAYERS, "layers.json"), "utf8"));
const BLEND_STATE_TYPE = Number(process.env.BLEND_TYPE || 76);

class Out {
  constructor() {
    this.b = [];
  }
  byte(v) {
    this.b.push(v & 255);
  }
  varuint(n) {
    n = Math.floor(n);
    do {
      let x = n % 128;
      n = Math.floor(n / 128);
      if (n > 0) x |= 128;
      this.byte(x);
    } while (n > 0);
  }
  f32(v) {
    const a = Buffer.alloc(4);
    a.writeFloatLE(v, 0);
    for (const x of a) this.byte(x);
  }
  u32(v) {
    const a = Buffer.alloc(4);
    a.writeUInt32LE(v >>> 0, 0);
    for (const x of a) this.byte(x);
  }
  str(s) {
    const a = Buffer.from(s, "utf8");
    this.varuint(a.length);
    for (const x of a) this.byte(x);
  }
  bytes(buf) {
    this.varuint(buf.length);
    for (const x of buf) this.byte(x);
  }
}
const U = "u",
  D = "d",
  S = "s",
  C = "c",
  B = "b",
  BY = "y";
const K = {
  name: 4,
  parentId: 5,
  width: 7,
  height: 8,
  x: 13,
  y: 14,
  rotation: 15,
  scaleX: 16,
  scaleY: 17,
  opacity: 18,
  ellW: 20,
  ellH: 21,
  vx: 24,
  vy: 25,
  isClosed: 32,
  color: 37,
  thickness: 47,
  cap: 48,
  join: 49,
  animName: 55,
  fps: 56,
  duration: 57,
  loop: 59,
  objectId: 51,
  propertyKey: 53,
  frame: 67,
  interp: 68,
  value: 70,
  assetName: 203,
  assetId: 204,
  assetH: 207,
  assetW: 208,
  imageAssetId: 206,
  bytesKey: 212,
  smName: 138,
  boolValue: 141,
  numValue: 140,
  animationId: 149,
  stateToId: 151,
  flags: 152,
  tDuration: 158,
  exitTime: 160,
  inputId: 155,
  opValue: 156,
  blendInputId: 167,
  blendAnimId: 165,
  blendValue: 166,
};
const T = {
  Backboard: 23,
  Artboard: 1,
  Node: 2,
  Shape: 3,
  Ellipse: 4,
  PointsPath: 16,
  StraightVertex: 5,
  Fill: 20,
  Stroke: 24,
  SolidColor: 18,
  ImageAsset: 105,
  FileAssetContents: 106,
  Image: 100,
  LinearAnimation: 31,
  KeyedObject: 25,
  KeyedProperty: 26,
  KeyFrameDouble: 30,
  StateMachine: 53,
  StateMachineBool: 59,
  StateMachineNumber: 56,
  StateMachineLayer: 57,
  EntryState: 63,
  AnyState: 62,
  ExitState: 64,
  AnimationState: 61,
  StateTransition: 65,
  TransitionBoolCondition: 71,
  BlendAnimation1D: 75,
};

// ---------- arquivo: camadas da Helena como imagens ----------
const fileObjects = [[T.Backboard, []]];
const ASSET_ORDER = ["head", "earL", "earR", "irisL", "irisR", "pupilL", "pupilR", "earStar"];
ASSET_ORDER.forEach((name, i) => {
  const L = layers[name];
  fileObjects.push([
    T.ImageAsset,
    [
      [K.assetName, S, name],
      [K.assetId, U, i],
      [K.assetW, D, L.w],
      [K.assetH, D, L.h],
    ],
  ]);
  fileObjects.push([
    T.FileAssetContents,
    [[K.bytesKey, BY, fs.readFileSync(path.join(LAYERS, L.file))]],
  ]);
});
const assetIndex = (name) => ASSET_ORDER.indexOf(name);

const comps = [];
function comp(type, props) {
  comps.push({ type, props });
  return comps.length - 1;
}
const W = 500,
  H = 500;
comp(T.Artboard, [
  [K.name, S, "Helena"],
  [K.width, D, W],
  [K.height, D, H],
]);
const argb = (hex, a = 255) => ((a << 24) >>> 0) + parseInt(hex.slice(1), 16);
function node(parent, name, x = 0, y = 0, extra = []) {
  return comp(T.Node, [
    [K.name, S, name],
    [K.parentId, U, parent],
    [K.x, D, x],
    [K.y, D, y],
    ...extra,
  ]);
}
function polyShape(parent, name, pts, color, opts = {}) {
  const shape = comp(T.Shape, [
    [K.name, S, name],
    [K.parentId, U, parent],
    [K.x, D, opts.x ?? 0],
    [K.y, D, opts.y ?? 0],
  ]);
  for (const poly of opts.multi ? pts : [pts]) {
    const path = comp(T.PointsPath, [
      [K.parentId, U, shape],
      [K.isClosed, B, opts.stroke ? 0 : 1],
    ]);
    for (const [vx, vy] of poly)
      comp(T.StraightVertex, [
        [K.parentId, U, path],
        [K.vx, D, vx],
        [K.vy, D, vy],
      ]);
  }
  if (opts.stroke) {
    const st = comp(T.Stroke, [
      [K.parentId, U, shape],
      [K.thickness, D, opts.stroke],
      [K.cap, U, 1],
      [K.join, U, 1],
    ]);
    comp(T.SolidColor, [
      [K.parentId, U, st],
      [K.color, C, color],
    ]);
  } else {
    const f = comp(T.Fill, [[K.parentId, U, shape]]);
    comp(T.SolidColor, [
      [K.parentId, U, f],
      [K.color, C, color],
    ]);
  }
  return shape;
}
function ellipseShape(parent, name, x, y, w, h, color, stroke = 0) {
  const shape = comp(T.Shape, [
    [K.name, S, name],
    [K.parentId, U, parent],
    [K.x, D, x],
    [K.y, D, y],
  ]);
  comp(T.Ellipse, [
    [K.parentId, U, shape],
    [K.ellW, D, w],
    [K.ellH, D, h],
  ]);
  const p = stroke
    ? comp(T.Stroke, [
        [K.parentId, U, shape],
        [K.thickness, D, stroke],
      ])
    : comp(T.Fill, [[K.parentId, U, shape]]);
  comp(T.SolidColor, [
    [K.parentId, U, p],
    [K.color, C, color],
  ]);
  return shape;
}
function image(parent, name, layerName, pivot) {
  const L = layers[layerName];
  return comp(T.Image, [
    [K.name, S, name],
    [K.parentId, U, parent],
    [K.imageAssetId, U, assetIndex(layerName)],
    [K.x, D, (L.cx - pivot[0]) * IMG],
    [K.y, D, (L.cy - pivot[1]) * IMG],
    [K.scaleX, D, IMG],
    [K.scaleY, D, IMG],
  ]);
}

const STAR_MAIN = [
  [24, 1],
  [31, 14],
  [45, 17],
  [35, 28],
  [36, 43],
  [24, 36],
  [10, 43],
  [13, 28],
  [3, 17],
  [18, 14],
];
const STAR_DEPTH = STAR_MAIN.map(([x, y]) => [x, y + 3]);
const STAR_FOLD = [
  [
    [24, 1],
    [24, 25],
    [3, 17],
    [18, 14],
  ],
  [
    [24, 25],
    [36, 43],
    [35, 28],
    [45, 17],
  ],
];
const centered = (pts, s, cx = 24, cy = 24) => pts.map(([x, y]) => [(x - cx) * s, (y - cy) * s]);

// ---------- hierarquia ----------
const CX = 250,
  CY = 255,
  IMG = 0.52,
  SS = 4.2;
const TAU0 = Math.PI * 2;
const local = ([x, y]) => [(x - 256) * IMG, (y - 256) * IMG];
const mover = node(0, "mover", CX, CY);
const body = node(mover, "corpo");
const star = node(body, "estrela", 0, 0, [[K.rotation, D, -0.12]]);
const helena = node(body, "helena", 0, 0, [
  [K.scaleX, D, 0.0001],
  [K.scaleY, D, 0.0001],
  [K.opacity, D, 0],
]);
// Orelhas: cisalhamento paralelo a base (a linha da base nao se move), montado com tres nos
// aninhados: rotacao, escala, rotacao (decomposicao polar calculada a cada quadro).
function earRig(name, pivot) {
  const a = node(helena, name, ...local(pivot));
  const b = node(a, name + "-escala");
  const c = node(b, name + "-giro");
  return { a, b, c };
}
const earLRig = earRig("orelha-esquerda", pivots.earL);
const earRRig = earRig("orelha-direita", pivots.earR);
const STAR_EAR_CENTER = [layers.earStar.cx, layers.earStar.cy];
const earStar = node(helena, "estrelinha", ...local(STAR_EAR_CENTER));
const eyeL = node(helena, "olho-esquerdo", ...local(pivots.eyeL));
const eyeR = node(helena, "olho-direito", ...local(pivots.eyeR));
const pupilRest = {
  L: [(layers.pupilL.cx - pivots.eyeL[0]) * IMG, (layers.pupilL.cy - pivots.eyeL[1]) * IMG],
  R: [(layers.pupilR.cx - pivots.eyeR[0]) * IMG, (layers.pupilR.cy - pivots.eyeR[1]) * IMG],
};
const pupilL = node(eyeL, "pupila-esquerda", ...pupilRest.L);
const pupilR = node(eyeR, "pupila-direita", ...pupilRest.R);
const zNodes = [0, 1, 2].map((i) => node(helena, "z-" + i, 95, -150, [[K.opacity, D, 0]]));
const heartNodes = [0, 1, 2].map((i) => node(helena, "coracao-" + i, 0, -150, [[K.opacity, D, 0]]));
const noteNodes = [0, 1, 2].map((i) => node(helena, "nota-" + i, 110, -120, [[K.opacity, D, 0]]));
const sparkNodes = [];
for (let i = 0; i < 7; i++)
  sparkNodes.push(
    node(mover, "faisca-" + i, 0, 0, [
      [K.scaleX, D, 0.0001],
      [K.scaleY, D, 0.0001],
      [K.opacity, D, 0],
    ]),
  );

// ---------- desenhaveis, de cima para baixo ----------
sparkNodes.forEach((n, i) =>
  polyShape(
    n,
    "faisca",
    centered(STAR_MAIN, i % 2 ? 0.55 : 0.75),
    argb(i % 3 ? "#ffe88d" : "#facc15"),
  ),
);
const ring = ellipseShape(mover, "anel", 0, 0, 230, 230, argb("#ffe88d"), 5);
polyShape(
  star,
  "estrela-dobra",
  STAR_FOLD.map((p) => centered(p, SS)),
  argb("#ffe88d"),
  { multi: true },
);
polyShape(star, "estrela-face", centered(STAR_MAIN, SS), argb("#facc15"));
polyShape(star, "estrela-fundo", centered(STAR_DEPTH, SS), argb("#b78121"));
zNodes.forEach((n, i) => {
  const s = i === 1 ? 1 : i === 0 ? 0.75 : 0.6;
  polyShape(
    n,
    "z",
    [
      [-9 * s, -9 * s],
      [9 * s, -9 * s],
      [-9 * s, 9 * s],
      [9 * s, 9 * s],
    ],
    argb("#cbb8ff"),
    { stroke: 4.5 },
  );
});
const HEART = [];
for (let k = 0; k < 40; k++) {
  const a = (TAU0 * k) / 40;
  HEART.push([
    16 * Math.sin(a) ** 3 * 0.9,
    -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.9,
  ]);
}
heartNodes.forEach((n, i) =>
  polyShape(
    n,
    "coracao",
    HEART.map(([x, y]) => [x * (i === 1 ? 1 : 0.75), y * (i === 1 ? 1 : 0.75)]),
    argb(i === 1 ? "#ff6f9f" : "#ff9ec0"),
  ),
);
const NOTE_HEAD = [];
for (let k = 0; k < 18; k++) {
  const a = (TAU0 * k) / 18;
  NOTE_HEAD.push([
    Math.cos(a) * 8 * Math.cos(-0.4) - Math.sin(a) * 5.5 * Math.sin(-0.4),
    Math.cos(a) * 8 * Math.sin(-0.4) + Math.sin(a) * 5.5 * Math.cos(-0.4),
  ]);
}
noteNodes.forEach((n, i) => {
  const col = argb(i === 1 ? "#a98bff" : "#cbb8ff");
  polyShape(
    n,
    "nota-bandeira",
    [
      [6, -26],
      [17, -19],
      [16, -14],
      [6, -19],
    ],
    col,
  );
  polyShape(
    n,
    "nota-haste",
    [
      [5, -26],
      [8, -26],
      [8, -1],
      [5, -1],
    ],
    col,
  );
  polyShape(
    n,
    "nota-cabeca",
    NOTE_HEAD.map(([x, y]) => [x, y]),
    col,
  );
});
image(earStar, "estrelinha", "earStar", STAR_EAR_CENTER);
image(pupilL, "pupila", "pupilL", [layers.pupilL.cx, layers.pupilL.cy]);
image(pupilR, "pupila", "pupilR", [layers.pupilR.cx, layers.pupilR.cy]);
const crease = (pivot, w) => {
  const pts = [];
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI * (k / 12);
    pts.push([-Math.cos(a) * w, Math.sin(a) * w * 0.32]);
  }
  const [x, y] = local(pivot);
  return polyShape(helena, "olho-fechado", pts, argb("#8d7fa3"), { stroke: 5, x, y: y + 4 });
};
const creaseL = crease(pivots.eyeL, 26);
const creaseR = crease(pivots.eyeR, 29);
// olhos felizes, em arco para cima (^^)
const happyArc = (pivot, w) => {
  const pts = [];
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI * (k / 12);
    pts.push([-Math.cos(a) * w, -Math.sin(a) * w * 0.42]);
  }
  const [x, y] = local(pivot);
  return polyShape(helena, "olho-feliz", pts, argb("#f4c430"), { stroke: 6, x, y: y + 8 });
};
const happyL = happyArc(pivots.eyeL, 25);
const happyR = happyArc(pivots.eyeR, 28);
image(eyeL, "iris", "irisL", pivots.eyeL);
image(eyeR, "iris", "irisR", pivots.eyeR);
const blushL = ellipseShape(helena, "bochecha", ...local([118, 372]), 46, 20, argb("#ff9ec0", 170));
const blushR = ellipseShape(helena, "bochecha", ...local([330, 420]), 50, 22, argb("#ff9ec0", 170));
image(helena, "cabeca", "head", [256, 256]);
image(earLRig.c, "orelha", "earL", pivots.earL);
image(earRRig.c, "orelha", "earR", pivots.earR);
const shadow = ellipseShape(0, "sombra", CX, 432, 168, 26, argb("#3b2a5e", 46));

// ---------- curvas ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const pulse = (t, a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));
const PX = 120;
const flick = (u) =>
  u < 0 ? 0 : pulse(u, 0, 0.06, 0.1, 0.2) + 0.7 * pulse(u, 0.22, 0.28, 0.32, 0.42);
const blinkAt = (t, at) => {
  const b = t - at;
  if (b < 0 || b > 0.26) return 0;
  return b < 0.095 ? smooth(0, 0.095, b) : 1 - smooth(0.125, 0.26, b);
};
const EYE_MIN = 0.0001;

function blank() {
  return {
    moverY: CY,
    bodySX: 1,
    bodySY: 1,
    bodyRot: 0,
    starS: 1,
    starRot: -0.12,
    starOp: 1,
    helS: 0.0001,
    helOp: 0,
    helRot: 0,
    helX: 0,
    earL: 0,
    earR: 0,
    earStarS: 1,
    earStarRot: 0,
    eyeLX: 1,
    eyeLY: 1,
    eyeRX: 1,
    eyeRY: 1,
    blush: 0,
    creaseL: 0,
    creaseR: 0,
    eyeLOp: 1,
    eyeROp: 1,
    z: [0, 1, 2].map(() => ({ y: -150, op: 0, s: 1, x: 95 })),
    sparks: Array.from({ length: 7 }, () => ({ s: 0.0001, op: 0, x: 0, y: 0 })),
    ringS: 0.5,
    ringOp: 0,
    shS: 1,
    shOp: 1,
    starFlip: 1,
    happyL: 0,
    happyR: 0,
    hearts: [0, 1, 2].map((i) => ({ x: (i - 1) * 40, y: -150, op: 0, s: 1 })),
    notes: [0, 1, 2].map(() => ({ x: 110, y: -120, op: 0, s: 1, r: 0 })),
  };
}
// olhos fechados de alegria: a iris some e aparecem os arcos ^^
const setHappy = (p, l, r) => {
  const L = Math.max(l, 0),
    R = Math.max(r, 0);
  if (L > 0) {
    p.eyeLY = Math.max(EYE_MIN, p.eyeLY * (1 - L));
    p.eyeLOp = Math.min(p.eyeLOp, 1 - smooth(0.86, 0.97, L));
    p.creaseL *= 1 - smooth(0.5, 0.9, L);
  }
  if (R > 0) {
    p.eyeRY = Math.max(EYE_MIN, p.eyeRY * (1 - R));
    p.eyeROp = Math.min(p.eyeROp, 1 - smooth(0.86, 0.97, R));
    p.creaseR *= 1 - smooth(0.5, 0.9, R);
  }
  p.happyL = smooth(0.8, 0.97, L);
  p.happyR = smooth(0.8, 0.97, R);
};
// pulo: parabola entre a e b, altura h
const jump = (t, a, b, h) =>
  t <= a || t >= b ? 0 : h * 4 * ((t - a) / (b - a)) * (1 - (t - a) / (b - a));
// mola amortecida a partir de t0
const spring = (t, t0, amp, freq, decay) =>
  t < t0 ? 0 : amp * Math.exp(-decay * (t - t0)) * Math.cos(freq * (t - t0));
const asHelena = (p) => {
  p.starS = 0.0001;
  p.starOp = 0;
  p.helS = 1;
  p.helOp = 1;
  return p;
};
function placeSparks(p, amount, angle0, radius, burst, cx = 0, cy = 8) {
  for (let i = 0; i < 7; i++) {
    const a = (i * TAU) / 7 + angle0,
      amt = typeof amount === "function" ? amount(i) : amount,
      sp = p.sparks[i];
    sp.x = cx + Math.cos(a) * radius;
    sp.y = cy + Math.sin(a) * radius;
    // some encolhendo, nao desbotando: translucida por cima da pelagem preta ela fica cor de barro
    sp.s = Math.max(0.0001, Math.sqrt(clamp(amt, 0, 1.5)) * (i % 2 ? 1 : 1.25) * (1 + 0.4 * burst));
    sp.op = amt > 0.02 ? 1 : 0;
  }
}
const setEyes = (p, l, r, wide = 1) => {
  // a iris achata ate sumir; com o olho fechado aparece a dobra da palpebra
  p.eyeLY = Math.max(EYE_MIN, (1 - l) * wide);
  p.eyeRY = Math.max(EYE_MIN, (1 - r) * wide);
  p.creaseL = smooth(0.8, 0.97, l);
  p.creaseR = smooth(0.8, 0.97, r);
  p.eyeLOp = 1 - smooth(0.86, 0.97, l);
  p.eyeROp = 1 - smooth(0.86, 0.97, r);
  p.eyeLX = wide * (1 + 0.06 * l);
  p.eyeRX = wide * (1 + 0.06 * r);
};

// estrela flutuando (5,2 s)
const STAR_LOOP = 10.4;
function starPose(t) {
  const p = blank(),
    ph = (TAU * t) / 5.2,
    hop = 0.5 - 0.5 * Math.cos(3 * ph),
    bounce = Math.sin(3 * ph);
  const shine = pulse(t, 6.4, 6.6, 6.9, 7.4),
    wob = pulse(t, 8.2, 8.4, 9.2, 9.6);
  p.moverY = CY - 14 * hop - 10 * shine;
  p.bodySX = 1 - 0.035 * bounce + 0.08 * shine;
  p.bodySY = 1 + 0.035 * bounce + 0.08 * shine;
  p.bodyRot =
    0.065 * Math.sin(2 * ph) +
    0.025 * Math.sin(4 * ph) +
    (t > 0.75 ? TAU * smooth(0.75, 1.45, t) : 0) +
    0.18 * wob * Math.sin((t - 8.2) * 18);
  const sh = pulse(t, 6.5, 6.7, 7.0, 7.6);
  placeSparks(
    p,
    (i) => Math.max(0.53 * pulse((((t + i * 0.47) % 2.6) + 2.6) % 2.6, 0.1, 0.55, 0.65, 1.0), sh),
    (TAU / 7) * (t / 5.2),
    150 + 50 * smooth(6.5, 7.6, t) * (t < 7.6 ? 1 : 0),
    sh,
  );
  p.ringS = 0.6 + 0.8 * smooth(6.5, 7.5, t);
  p.ringOp = 0.6 * pulse(t, 6.5, 6.7, 7.0, 7.5);
  p.shS = 1 - 0.22 * hop;
  p.shOp = 1 - 0.35 * hop;
  setEyes(p, 1, 1);
  return p;
}
// Helena parada (20 s de repertorio)
const IDLE = 32;
function idlePose(t) {
  const p = asHelena(blank());
  const breathe = Math.sin((TAU * t) / 4);
  const curious = pulse(t, 3.0, 3.35, 4.2, 4.6),
    nodA = pulse(t, 5.6, 5.8, 6.7, 7.0);
  const happy = pulse(t, 9.2, 9.5, 10.2, 10.6),
    sleepy = pulse(t, 12.0, 12.8, 14.7, 15.3);
  const wake = pulse(t, 15.25, 15.45, 15.7, 16.2),
    tiltL = pulse(t, 17.4, 17.8, 18.6, 19.0);
  const nod = nodA * Math.sin((t - 5.6) * 15);
  p.moverY = CY - PX * (0.03 * breathe * (1 + sleepy) + 0.06 * nod + 0.15 * wake) + 9 * sleepy;
  p.bodySX = 1 + 0.012 * breathe + 0.05 * happy - 0.03 * wake;
  p.bodySY = 1 - 0.012 * breathe - 0.045 * happy + 0.06 * wake;
  p.bodyRot =
    0.025 * Math.sin((TAU * t) / 8) -
    0.12 * curious +
    0.1 * happy +
    0.06 * sleepy * Math.sin((TAU * t) / 2.5) +
    0.04 * nod +
    0.12 * tiltL;
  p.helX = 6 * curious - 5 * tiltL;
  // orelhas: respiram, contraem, ficam em pe de curiosidade, caem de sono e levantam no susto
  p.earL =
    0.03 * Math.sin((TAU * t) / 4) -
    0.3 * flick(t - 2.2) -
    0.28 * flick(t - 17.8) -
    0.1 * happy -
    0.22 * sleepy +
    0.12 * wake +
    0.06 * curious;
  p.earR =
    0.03 * Math.sin((TAU * t) / 4 + 1) +
    0.3 * flick(t - 7.6) -
    0.22 * curious +
    0.1 * happy +
    0.22 * sleepy -
    0.12 * wake;
  const spin = smooth(8.0, 8.8, t);
  p.earStarRot = TAU * spin + 0.25 * Math.sin((TAU * t) / 4);
  p.earStarS =
    1 +
    0.25 * pulse(t, 8.0, 8.35, 8.5, 8.9) +
    0.12 * happy +
    0.08 * pulse(((t % 4) + 4) % 4, 0.2, 0.45, 0.6, 1.0);
  let blink = 0;
  for (const at of [1.0, 5.0, 5.3, 11.2, 16.8, 19.35]) blink = Math.max(blink, blinkAt(t, at));
  const sleepClose = smooth(0.05, 0.6, sleepy),
    wink = smooth(0.05, 0.35, happy);
  setEyes(
    p,
    Math.max(blink, sleepClose, wink),
    Math.max(blink, sleepClose),
    1 + 0.12 * wake + 0.05 * curious,
  );
  p.blush = 0.9 * happy;
  // Zzz saindo da cabeca enquanto ela cochila
  p.z.forEach((z, i) => {
    const u = (t - 12.6 - i * 0.55) / 1.6;
    const cyc = u - Math.floor(u);
    const on = sleepy > 0.2 && t > 12.6 + i * 0.55 && t < 15.0 ? 1 : 0;
    z.y = -150 - 46 * cyc;
    z.x = 95 + 18 * Math.sin(cyc * Math.PI) + i * 10;
    z.op = on * Math.sin(Math.PI * cyc) * 0.95;
    z.s = 0.7 + 0.5 * cyc;
  });
  p.shS = 1 - 0.12 * wake;
  // 20 a 32 s: bocejo, cantarolar com notinhas, orelhas alternadas, olhar de perto
  const yawn = pulse(t, 20.4, 21.0, 21.9, 22.6);
  const hum = pulse(t, 23.0, 23.3, 25.4, 25.8);
  const wiggle = pulse(t, 26.2, 26.35, 27.2, 27.4);
  const peek = pulse(t, 28.0, 28.4, 29.2, 29.7);
  const beat = Math.sin(TAU * 2 * (t - 23));
  p.bodySY += 0.08 * yawn + 0.02 * hum * Math.abs(beat) + 0.04 * peek;
  p.bodySX += -0.05 * yawn - 0.015 * hum * Math.abs(beat) + 0.04 * peek;
  p.bodyRot += -0.08 * yawn + 0.07 * hum * beat;
  p.moverY += -PX * 0.03 * hum * Math.abs(beat) - 8 * yawn + 6 * peek;
  p.earL +=
    -0.18 * yawn +
    0.12 * hum * Math.sin(TAU * 2 * (t - 23) + 1) +
    0.22 * wiggle * Math.sin(TAU * 4 * (t - 26.2)) +
    0.08 * peek;
  p.earR +=
    0.18 * yawn +
    0.12 * hum * Math.sin(TAU * 2 * (t - 23)) -
    0.22 * wiggle * Math.sin(TAU * 4 * (t - 26.2) + Math.PI) -
    0.08 * peek;
  let blink2 = 0;
  for (const at of [24.6, 30.2, 31.1]) blink2 = Math.max(blink2, blinkAt(t, at));
  const yawnClose = smooth(0.05, 0.5, yawn);
  if (yawn > 0.001 || blink2 > 0 || peek > 0.001)
    setEyes(p, Math.max(yawnClose, blink2), Math.max(yawnClose, blink2), 1 + 0.1 * peek);
  setHappy(p, 0.95 * smooth(0.2, 0.6, hum), 0.95 * smooth(0.2, 0.6, hum));
  p.notes.forEach((n, i) => {
    const st = 23.2 + i * 0.7,
      u = clamp((t - st) / 1.5, 0, 1);
    n.op = t > st && t < st + 1.5 ? Math.sin(Math.PI * u) : 0;
    n.y = -120 - 70 * u;
    n.x = 110 + 22 * Math.sin(u * TAU) + i * 8;
    n.s = 0.8 + 0.4 * u;
    n.r = 0.3 * Math.sin(u * TAU);
  });
  return p;
}
// estrela <-> Helena (0,94 s), mesma curva do runtime 3D
const MORPH = 0.94;
function morphPose(t, to) {
  const p = blank(),
    q = clamp(t / MORPH, 0, 1);
  const squash = pulse(q, 0, 0.14, 0.18, 0.34),
    m = smooth(0.2, 0.68, q),
    shape = to ? m : 1 - m;
  const pop = pulse(q, 0.45, 0.64, 0.7, 0.99),
    burst = pulse(q, 0.47, 0.63, 0.75, 1.18);
  const settle = q > 0.68 ? Math.sin((q - 0.68) * Math.PI * 5) * Math.exp(-(q - 0.68) * 8) : 0;
  p.bodySX = 1 + 0.17 * squash - 0.1 * pop + 0.06 * settle;
  p.bodySY = 1 - 0.16 * squash + 0.19 * pop - 0.055 * settle;
  p.bodyRot = (to ? -0.13 : 0.15) * squash + (to ? 0.08 : -0.12) * pop + 0.035 * settle;
  p.moverY = CY - PX * 0.07 * pop;
  const head = smooth(0.05, 0.95, shape);
  p.starS = Math.max(0.0001, 1 - 0.75 * head);
  p.starOp = 1 - smooth(0.45, 0.85, shape);
  p.starRot = -0.12 + (to ? 1 : -1) * 2.4 * head;
  p.helS = Math.max(0.0001, 0.25 + 0.75 * head);
  p.helOp = smooth(0.12, 0.5, shape);
  p.helRot = (to ? -1 : 1) * 0.9 * (1 - head);
  // orelhas brotam dobradas e se abrem com o estouro
  const fold = 1 - smooth(0.55, 0.95, shape);
  p.earL = -0.55 * fold + 0.18 * pop * (to ? 1 : 0) - 0.08 * settle;
  p.earR = 0.55 * fold - 0.18 * pop * (to ? 1 : 0) + 0.08 * settle;
  p.earStarS = Math.max(0.0001, smooth(0.9, 0.995, shape) * (1 + 0.3 * pop));
  p.earStarRot = (1 - smooth(0.9, 1, shape)) * -2;
  const closed = to ? 1 - smooth(0.66, 0.88, q) : smooth(0, 0.16, q);
  setEyes(p, Math.max(closed, shape < 0.985 ? 1 : 0), Math.max(closed, shape < 0.985 ? 1 : 0));
  placeSparks(p, burst, q * 0.9, 150 + burst * 45, burst);
  p.ringS = 0.55 + 0.9 * smooth(0.45, 1, q);
  p.ringOp = 0.75 * burst;
  p.shS = 1 + 0.18 * squash - 0.2 * pop;
  p.shOp = 1 - 0.3 * pop;
  return p;
}
// arrastada: pendurada e esticada, inclina para o lado do movimento, orelhas batendo
const DRAG = 1.0;
function dragPose(t, lean) {
  const p = asHelena(blank()),
    w = (TAU * t) / DRAG;
  p.moverY = CY - 14 + 3 * Math.sin(w);
  p.bodySX = 0.9 - 0.02 * Math.sin(w);
  p.bodySY = 1.12 + 0.03 * Math.sin(w);
  p.bodyRot = 0.3 * lean + 0.06 * Math.sin(2 * w);
  p.earL = -0.22 + 0.15 * Math.sin(2 * w) - 0.12 * Math.max(0, lean);
  p.earR = 0.22 + 0.15 * Math.sin(2 * w + 1) + 0.12 * Math.max(0, -lean);
  p.earStarRot = 0.4 * Math.sin(2 * w);
  p.earStarS = 1.05;
  setEyes(p, 0, 0, 1.12);
  p.shS = 0.72;
  p.shOp = 0.55;
  return p;
}
// soltura: cai, amassa, balanca e assenta
const DROP = 0.9;
function dropPose(t) {
  const p = asHelena(blank()),
    fall = 1 - smooth(0, 0.14, t),
    land = t - 0.14;
  const spring = land > 0 ? Math.exp(-5.5 * land) : 0;
  p.moverY = CY - 14 * fall;
  p.bodySX = 0.9 + 0.1 * smooth(0, 0.14, t) + (land > 0 ? 0.16 * spring * Math.cos(16 * land) : 0);
  p.bodySY =
    1.12 - 0.12 * smooth(0, 0.14, t) - (land > 0 ? 0.15 * spring * Math.cos(16 * land) : 0);
  p.bodyRot = land > 0 ? 0.14 * spring * Math.sin(13 * land) : 0;
  p.earL = -0.22 * fall + (land > 0 ? -0.28 * spring * Math.cos(12 * land) : 0);
  p.earR = 0.22 * fall + (land > 0 ? 0.28 * spring * Math.cos(12 * land + 0.6) : 0);
  const squint = land > 0 ? pulse(land, 0, 0.05, 0.16, 0.3) : 0;
  setEyes(p, squint, squint, 1 + 0.12 * fall);
  p.shS = 0.72 + 0.28 * smooth(0, 0.14, t) + (land > 0 ? 0.12 * spring : 0);
  p.shOp = 0.55 + 0.45 * smooth(0, 0.14, t);
  return p;
}
// atenta: o ponteiro por perto, orelhas em pe, olhos abertos e um pulinho leve
const ALERT = 3;
function alertPose(t) {
  const p = asHelena(blank()),
    w = (TAU * t) / ALERT;
  p.moverY = CY - 4 - 4 * (0.5 - 0.5 * Math.cos(2 * w));
  p.bodySX = 1 + 0.01 * Math.sin(2 * w);
  p.bodySY = 1 - 0.01 * Math.sin(2 * w);
  p.bodyRot = 0.035 * Math.sin(w);
  p.earL = 0.12 + 0.05 * Math.sin(2 * w) - 0.22 * flick(t - 1.6);
  p.earR = -0.12 + 0.05 * Math.sin(2 * w + 1);
  p.earStarS = 1.08 + 0.06 * Math.sin(2 * w);
  p.earStarRot = 0.2 * Math.sin(w);
  setEyes(p, blinkAt(t, 2.4), blinkAt(t, 2.4), 1.07);
  return p;
}
// estrela arrastada e solta
function starDragPose(t) {
  const p = blank(),
    w = (TAU * t) / 0.8;
  p.moverY = CY - 12;
  p.bodySX = 0.9;
  p.bodySY = 1.14;
  p.bodyRot = 0.28 * Math.sin(w);
  placeSparks(
    p,
    (i) => 0.5 * pulse((((t * 1.25 + i / 7) % 1) + 1) % 1, 0, 0.3, 0.5, 1),
    w / 7,
    120,
    0,
  );
  p.shS = 0.72;
  p.shOp = 0.55;
  setEyes(p, 1, 1);
  return p;
}
function starDropPose(t) {
  const p = blank(),
    land = t - 0.12,
    spring = land > 0 ? Math.exp(-6 * land) : 0,
    f = smooth(0, 0.12, t);
  p.moverY = CY - 12 * (1 - f);
  p.bodySX = 0.9 + 0.1 * f + (land > 0 ? 0.18 * spring * Math.cos(17 * land) : 0);
  p.bodySY = 1.14 - 0.14 * f - (land > 0 ? 0.16 * spring * Math.cos(17 * land) : 0);
  p.bodyRot = land > 0 ? 0.2 * spring * Math.sin(14 * land) : 0;
  const burst = land > 0 ? pulse(land, 0, 0.08, 0.2, 0.5) : 0;
  placeSparks(p, burst * 0.8, 0.3, 120 + 40 * burst, burst);
  p.shS = 0.72 + 0.28 * f;
  p.shOp = 0.55 + 0.45 * f;
  setEyes(p, 1, 1);
  return p;
}

// reacoes ao clique, Helena
function reactJump(t) {
  // pulo feliz
  const p = asHelena(blank());
  const ant = pulse(t, 0, 0.08, 0.12, 0.18),
    air = jump(t, 0.16, 0.62, 52),
    land = pulse(t, 0.6, 0.64, 0.7, 0.82);
  p.moverY = CY - air + spring(t, 0.7, 4, 18, 7);
  p.bodySX = 1 + 0.14 * ant - 0.08 * (air / 52) + 0.16 * land + spring(t, 0.82, 0.05, 18, 6);
  p.bodySY = 1 - 0.14 * ant + 0.12 * (air / 52) - 0.15 * land - spring(t, 0.82, 0.05, 18, 6);
  p.earL = 0.16 * (air / 52) - 0.25 * land + spring(t, 0.7, -0.15, 14, 5);
  p.earR = -0.16 * (air / 52) + 0.25 * land - spring(t, 0.7, -0.15, 14, 5);
  setEyes(p, 0, 0);
  setHappy(p, pulse(t, 0.12, 0.2, 0.8, 0.95), pulse(t, 0.12, 0.2, 0.8, 0.95));
  const b = pulse(t, 0.6, 0.66, 0.8, 1.05);
  placeSparks(p, b * 0.85, 0.2, 120 + 70 * smooth(0.6, 1.05, t), b, 0, 120);
  p.shS = 1 - 0.35 * (air / 52) + 0.1 * land;
  p.shOp = 1 - 0.45 * (air / 52);
  p.blush = 0.6 * pulse(t, 0.2, 0.35, 0.8, 1.05);
  return p;
}
function reactSpin(t) {
  // giro no ar
  const p = asHelena(blank());
  const air = jump(t, 0.1, 0.85, 46),
    sp = smooth(0.18, 0.78, t);
  p.moverY = CY - air + spring(t, 0.85, 4, 16, 7);
  p.bodyRot = TAU * sp;
  p.bodySX = 1 + 0.1 * pulse(t, 0, 0.06, 0.08, 0.14) + 0.12 * pulse(t, 0.84, 0.88, 0.92, 1.05);
  p.bodySY = 1 - 0.1 * pulse(t, 0, 0.06, 0.08, 0.14) - 0.1 * pulse(t, 0.84, 0.88, 0.92, 1.05);
  p.earL = -0.2 * Math.sin(Math.PI * sp);
  p.earR = 0.2 * Math.sin(Math.PI * sp);
  setEyes(p, 0, 0, 1 + 0.08 * Math.sin(Math.PI * sp));
  const trail = Math.sin(Math.PI * sp);
  placeSparks(p, trail * 0.7, -TAU * sp * 1.3, 140, 0.4 * trail);
  p.shS = 1 - 0.32 * (air / 46);
  p.shOp = 1 - 0.4 * (air / 46);
  return p;
}
function reactCuddle(t) {
  // carinho: aperta, fecha os olhos, cora e solta coracoes
  const p = asHelena(blank());
  const sq = pulse(t, 0, 0.25, 1.2, 1.55);
  p.bodySX = 1 + 0.1 * sq;
  p.bodySY = 1 - 0.09 * sq;
  p.bodyRot = 0.08 * sq * Math.sin(TAU * 1.6 * t);
  p.moverY = CY + 6 * sq;
  p.earL = -0.26 * sq;
  p.earR = 0.26 * sq;
  setEyes(p, 0, 0);
  setHappy(p, sq, sq);
  p.blush = sq;
  p.hearts.forEach((h, i) => {
    const st = 0.2 + i * 0.28,
      u = clamp((t - st) / 1.0, 0, 1);
    h.op = t > st && t < st + 1.0 ? Math.sin(Math.PI * u) : 0;
    h.x = (i - 1) * 46 + 10 * Math.sin(u * TAU);
    h.y = -140 - 80 * u;
    h.s = 0.6 + 0.6 * u;
  });
  return p;
}
function reactStartle(t) {
  // susto: pula para tras, arregala os olhos, orelhas em pe
  const p = asHelena(blank());
  const air = jump(t, 0.02, 0.4, 26),
    shake = pulse(t, 0.05, 0.1, 0.55, 0.8);
  p.moverY = CY - air + spring(t, 0.4, 3, 20, 8);
  p.bodySY = 1 + 0.12 * pulse(t, 0, 0.06, 0.25, 0.45) - 0.08 * pulse(t, 0.38, 0.42, 0.48, 0.6);
  p.bodySX = 1 - 0.08 * pulse(t, 0, 0.06, 0.25, 0.45) + 0.08 * pulse(t, 0.38, 0.42, 0.48, 0.6);
  p.bodyRot = 0.12 * shake * Math.sin(t * 46);
  p.earL = 0.22 * pulse(t, 0, 0.05, 0.5, 0.8);
  p.earR = -0.22 * pulse(t, 0, 0.05, 0.5, 0.8);
  setEyes(p, 0, 0, 1 + 0.16 * pulse(t, 0, 0.05, 0.55, 0.85));
  p.shS = 1 - 0.2 * (air / 26);
  return p;
}
function reactWink(t) {
  // piscadela com a estrelinha girando e soltando brilhos
  const p = asHelena(blank());
  const w = pulse(t, 0.05, 0.16, 0.75, 0.95);
  p.bodyRot = 0.1 * w;
  p.helX = -4 * w;
  p.bodySX = 1 + 0.04 * w;
  p.bodySY = 1 - 0.035 * w;
  p.earR = -0.12 * w + spring(t, 0.3, 0.12, 16, 5);
  p.earL = 0.05 * w;
  setEyes(p, smooth(0.05, 0.16, t) * (1 - smooth(0.75, 0.95, t)), 0);
  p.earStarRot = 2 * TAU * smooth(0.12, 0.9, t);
  p.earStarS = 1 + 0.6 * pulse(t, 0.12, 0.35, 0.6, 0.95);
  const ear = local(STAR_EAR_CENTER);
  const b = pulse(t, 0.3, 0.45, 0.7, 1.1);
  placeSparks(p, b * 0.6, t * 3, 40 + 60 * smooth(0.3, 1.1, t), b, ear[0] * 1, ear[1] + 8);
  p.blush = 0.5 * w;
  return p;
}
// reacoes ao clique, estrela
function starReactHop(t) {
  const p = blank();
  const ant = pulse(t, 0, 0.08, 0.12, 0.18),
    air = jump(t, 0.15, 0.7, 60),
    land = pulse(t, 0.68, 0.72, 0.78, 0.9);
  p.moverY = CY - air + spring(t, 0.75, 4, 18, 7);
  p.bodySX = 1 + 0.16 * ant - 0.1 * (air / 60) + 0.18 * land;
  p.bodySY = 1 - 0.16 * ant + 0.14 * (air / 60) - 0.16 * land;
  p.bodyRot = TAU * smooth(0.18, 0.66, t);
  const b = pulse(t, 0.66, 0.72, 0.8, 1.0);
  placeSparks(p, b * 0.9, 0.4, 120 + 80 * smooth(0.66, 1.0, t), b, 0, 120);
  p.shS = 1 - 0.38 * (air / 60);
  p.shOp = 1 - 0.5 * (air / 60);
  setEyes(p, 1, 1);
  return p;
}
function starReactShine(t) {
  const p = blank();
  const pop = pulse(t, 0, 0.12, 0.3, 0.6);
  p.bodySX = p.bodySY = 1 + 0.25 * pop + spring(t, 0.3, 0.06, 16, 6);
  p.bodyRot = 0.25 * pop * Math.sin(t * 20) * (1 - smooth(0.2, 0.6, t));
  p.ringS = 0.5 + 1.1 * smooth(0.05, 0.8, t);
  p.ringOp = 0.85 * pulse(t, 0.05, 0.12, 0.4, 0.8);
  const b = pulse(t, 0.08, 0.16, 0.5, 0.85);
  placeSparks(p, b, t * 1.5, 110 + 120 * smooth(0.08, 0.85, t), b);
  setEyes(p, 1, 1);
  return p;
}
function starReactFlip(t) {
  const p = blank();
  const air = jump(t, 0.1, 0.8, 34),
    fl = smooth(0.14, 0.76, t);
  p.moverY = CY - air + spring(t, 0.8, 3, 18, 7);
  p.starFlip = Math.cos(TAU * fl) || 0.0001;
  p.bodySY = 1 + 0.1 * (air / 34) - 0.12 * pulse(t, 0.78, 0.82, 0.86, 0.98);
  p.bodySX = 1 + 0.12 * pulse(t, 0.78, 0.82, 0.86, 0.98);
  const b = pulse(t, 0.4, 0.5, 0.7, 1.0);
  placeSparks(p, b * 0.5, t * 2, 140, b * 0.5);
  p.shS = 1 - 0.3 * (air / 34);
  setEyes(p, 1, 1);
  return p;
}
function starDragLean(t, lean) {
  const p = starDragPose(t);
  p.bodyRot = 0.35 * lean + 0.12 * Math.sin((TAU * t) / 0.8);
  p.bodySX = 0.9 - 0.04 * Math.abs(lean);
  p.bodySY = 1.14 + 0.04 * Math.abs(lean);
  return p;
}
// arrastada parada no ar: balanca, pisca e mexe uma orelha (2 s)
function dragCenterPose(t) {
  const p = dragPose(t, 0);
  p.bodyRot = 0.1 * Math.sin((TAU * t) / 2) + 0.03 * Math.sin((TAU * t) / 0.5);
  p.earL += -0.2 * flick(t - 0.9);
  p.earR += 0.2 * flick(t - 1.5);
  setEyes(p, blinkAt(t, 1.2), blinkAt(t, 1.2), 1.12);
  return p;
}

// ---------- olhar (segunda camada): so as pupilas ----------
const GX = 9,
  GY = 6;
function gaze(dx, dy) {
  return {
    lx: pupilRest.L[0] + dx * GX,
    ly: pupilRest.L[1] + dy * GY,
    rx: pupilRest.R[0] + dx * GX,
    ry: pupilRest.R[1] + dy * GY,
  };
}
function wanderGaze(t) {
  // passeia: esquerda, direita, cima, centro, com pequenas sacadas
  const keys = [
    [0, 0, 0],
    [1.0, 0, 0],
    [1.25, -1, 0.1],
    [2.6, -1, 0.1],
    [2.85, 0.9, -0.2],
    [4.4, 0.9, -0.2],
    [4.65, -0.5, -0.8],
    [5.6, -0.5, -0.8],
    [5.85, 0.3, 0.2],
    [6.2, 0.4, 0.1],
    [7.6, 0.4, 0.1],
    [8, 0, 0],
  ];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, x0, y0] = keys[i],
      [b, x1, y1] = keys[i + 1];
    if (t >= a && t <= b) {
      const s = smooth(a, b, t);
      return gaze(x0 + (x1 - x0) * s, y0 + (y1 - y0) * s);
    }
  }
  return gaze(0, 0);
}

// ---------- orelhas: de "giro" para cisalhamento ----------
function earGeometry(side) {
  const base = side === "L" ? pivots.earLBase : pivots.earRBase;
  const tip = side === "L" ? pivots.earLTip : pivots.earRTip;
  const pivot = side === "L" ? pivots.earL : pivots.earR;
  const phi = Math.atan2(base[1][1] - base[0][1], base[1][0] - base[0][0]);
  // sentido: o mesmo de um giro horario pequeno para a ponta da orelha
  const tx = tip[0] - pivot[0],
    ty = tip[1] - pivot[1];
  const rotD = [-ty, tx]; // derivada de um giro horario (y para baixo)
  const M = shearMatrix(phi, 0.1, 1);
  const shD = [M[0] * tx + M[1] * ty - tx, M[2] * tx + M[3] * ty - ty];
  const sign = rotD[0] * shD[0] + rotD[1] * shD[1] >= 0 ? 1 : -1;
  return { phi, sign, pivot };
}
function shearMatrix(phi, k, s) {
  // R(phi) [[1,k],[0,s]] R(-phi)
  const c = Math.cos(phi),
    sn = Math.sin(phi);
  const A = [
      [c, -sn],
      [sn, c],
    ],
    B = [
      [1, k],
      [0, s],
    ],
    C = [
      [c, sn],
      [-sn, c],
    ];
  const AB = [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
  return [
    AB[0][0] * C[0][0] + AB[0][1] * C[1][0],
    AB[0][0] * C[0][1] + AB[0][1] * C[1][1],
    AB[1][0] * C[0][0] + AB[1][1] * C[1][0],
    AB[1][0] * C[0][1] + AB[1][1] * C[1][1],
  ];
}
function polar([a, b, c, d]) {
  const rho = Math.atan2(c - b, a + d);
  const cr = Math.cos(-rho),
    sr = Math.sin(-rho);
  const p11 = cr * a - sr * c,
    p12 = cr * b - sr * d,
    p22 = sr * b + cr * d;
  const beta = 0.5 * Math.atan2(2 * p12, p11 - p22);
  const cb = Math.cos(beta),
    sb = Math.sin(beta);
  const s1 = p11 * cb * cb + 2 * p12 * sb * cb + p22 * sb * sb;
  const s2 = p11 * sb * sb - 2 * p12 * sb * cb + p22 * cb * cb;
  return { a1: rho + beta, a3: -beta, s1, s2, rho };
}
const EAR = { L: earGeometry("L"), R: earGeometry("R") };
const earCache = new WeakMap();
function earPose(p, side) {
  let cache = earCache.get(p);
  if (!cache) {
    cache = {};
    earCache.set(p, cache);
  }
  if (cache[side]) return cache[side];
  const g = EAR[side];
  const r = side === "L" ? p.earL : p.earR;
  const sN = side === "L" ? (p.earLS ?? 1) : (p.earRS ?? 1);
  const M = shearMatrix(g.phi, g.sign * Math.tan(r), sN);
  const dec = polar(M);
  const off = [(STAR_EAR_CENTER[0] - g.pivot[0]) * IMG, (STAR_EAR_CENTER[1] - g.pivot[1]) * IMG];
  const pv = local(g.pivot);
  dec.star = [pv[0] + M[0] * off[0] + M[1] * off[1], pv[1] + M[2] * off[0] + M[3] * off[1]];
  cache[side] = dec;
  return dec;
}
function earTracks(rig, side) {
  return [
    [rig.a, K.rotation, (p) => earPose(p, side).a1],
    [rig.b, K.scaleX, (p) => earPose(p, side).s1],
    [rig.b, K.scaleY, (p) => earPose(p, side).s2],
    [rig.c, K.rotation, (p) => earPose(p, side).a3],
  ];
}

// ---------- trilhas ----------
const bodyTracks = [
  [mover, K.y, (p) => p.moverY],
  [body, K.scaleX, (p) => p.bodySX],
  [body, K.scaleY, (p) => p.bodySY],
  [body, K.rotation, (p) => p.bodyRot],
  [star, K.scaleX, (p) => p.starS * p.starFlip],
  [star, K.scaleY, (p) => p.starS],
  [star, K.rotation, (p) => p.starRot],
  [star, K.opacity, (p) => p.starOp],
  [helena, K.scaleX, (p) => p.helS],
  [helena, K.scaleY, (p) => p.helS],
  [helena, K.opacity, (p) => p.helOp],
  [helena, K.rotation, (p) => p.helRot],
  [helena, K.x, (p) => p.helX],
  ...earTracks(earLRig, "L"),
  ...earTracks(earRRig, "R"),
  [earStar, K.x, (p) => earPose(p, "R").star[0]],
  [earStar, K.y, (p) => earPose(p, "R").star[1]],
  [earStar, K.scaleX, (p) => p.earStarS],
  [earStar, K.scaleY, (p) => p.earStarS],
  [earStar, K.rotation, (p) => p.earStarRot + earPose(p, "R").rho],
  [eyeL, K.scaleX, (p) => p.eyeLX],
  [eyeL, K.scaleY, (p) => p.eyeLY],
  [eyeR, K.scaleX, (p) => p.eyeRX],
  [eyeR, K.scaleY, (p) => p.eyeRY],
  [blushL, K.opacity, (p) => p.blush],
  [blushR, K.opacity, (p) => p.blush],
  [creaseL, K.opacity, (p) => p.creaseL],
  [creaseR, K.opacity, (p) => p.creaseR],
  [happyL, K.opacity, (p) => p.happyL],
  [happyR, K.opacity, (p) => p.happyR],
  [eyeL, K.opacity, (p) => p.eyeLOp],
  [eyeR, K.opacity, (p) => p.eyeROp],
  [ring, K.scaleX, (p) => p.ringS],
  [ring, K.scaleY, (p) => p.ringS],
  [ring, K.opacity, (p) => p.ringOp],
  [shadow, K.scaleX, (p) => p.shS],
  [shadow, K.scaleY, (p) => p.shS],
  [shadow, K.opacity, (p) => p.shOp],
];
heartNodes.forEach((n, i) =>
  bodyTracks.push(
    [n, K.x, (p) => p.hearts[i].x],
    [n, K.y, (p) => p.hearts[i].y],
    [n, K.opacity, (p) => p.hearts[i].op],
    [n, K.scaleX, (p) => p.hearts[i].s],
    [n, K.scaleY, (p) => p.hearts[i].s],
  ),
);
noteNodes.forEach((n, i) =>
  bodyTracks.push(
    [n, K.x, (p) => p.notes[i].x],
    [n, K.y, (p) => p.notes[i].y],
    [n, K.opacity, (p) => p.notes[i].op],
    [n, K.scaleX, (p) => p.notes[i].s],
    [n, K.scaleY, (p) => p.notes[i].s],
    [n, K.rotation, (p) => p.notes[i].r],
  ),
);
zNodes.forEach((n, i) =>
  bodyTracks.push(
    [n, K.y, (p) => p.z[i].y],
    [n, K.x, (p) => p.z[i].x],
    [n, K.opacity, (p) => p.z[i].op],
    [n, K.scaleX, (p) => p.z[i].s],
    [n, K.scaleY, (p) => p.z[i].s],
  ),
);
sparkNodes.forEach((n, i) =>
  bodyTracks.push(
    [n, K.scaleX, (p) => p.sparks[i].s],
    [n, K.scaleY, (p) => p.sparks[i].s],
    [n, K.opacity, (p) => p.sparks[i].op],
    [n, K.x, (p) => p.sparks[i].x],
    [n, K.y, (p) => p.sparks[i].y],
  ),
);
const gazeTracks = [
  [pupilL, K.x, (g) => g.lx],
  [pupilL, K.y, (g) => g.ly],
  [pupilR, K.x, (g) => g.rx],
  [pupilR, K.y, (g) => g.ry],
];

const animations = [];
const anim = (name, seconds, fps, loop, poseAt, tracks) => {
  animations.push({
    name,
    frames: Math.max(1, Math.round(seconds * fps)),
    fps,
    loop,
    poseAt,
    tracks,
  });
  return animations.length - 1;
};
const A = {
  estrela: anim("estrela", STAR_LOOP, 30, 1, starPose, bodyTracks),
  parada: anim("helena-parada", IDLE, 30, 1, idlePose, bodyTracks),
  viraHelena: anim("vira-helena", MORPH, 60, 0, (t) => morphPose(t, 1), bodyTracks),
  viraEstrela: anim("vira-estrela", MORPH, 60, 0, (t) => morphPose(t, 0), bodyTracks),
  arrEsq: anim("arrastada-esquerda", DRAG, 60, 1, (t) => dragPose(t, -1), bodyTracks),
  arrMeio: anim("arrastada", 2, 60, 1, dragCenterPose, bodyTracks),
  arrDir: anim("arrastada-direita", DRAG, 60, 1, (t) => dragPose(t, 1), bodyTracks),
  solta: anim("solta", DROP, 60, 0, dropPose, bodyTracks),
  estrelaArr: anim("estrela-arrastada", 0.8, 60, 1, starDragPose, bodyTracks),
  estrelaArrEsq: anim(
    "estrela-arrastada-esquerda",
    0.8,
    60,
    1,
    (t) => starDragLean(t, -1),
    bodyTracks,
  ),
  estrelaArrDir: anim(
    "estrela-arrastada-direita",
    0.8,
    60,
    1,
    (t) => starDragLean(t, 1),
    bodyTracks,
  ),
  pulo: anim("pulo-feliz", 1.15, 60, 0, reactJump, bodyTracks),
  giro: anim("giro", 1.15, 60, 0, reactSpin, bodyTracks),
  carinho: anim("carinho", 1.6, 60, 0, reactCuddle, bodyTracks),
  susto: anim("susto", 1.0, 60, 0, reactStartle, bodyTracks),
  piscadela: anim("piscadela", 1.1, 60, 0, reactWink, bodyTracks),
  estrelaPulo: anim("estrela-pulo", 1.05, 60, 0, starReactHop, bodyTracks),
  estrelaBrilho: anim("estrela-brilho", 0.95, 60, 0, starReactShine, bodyTracks),
  estrelaCambalhota: anim("estrela-cambalhota", 1.1, 60, 0, starReactFlip, bodyTracks),
  estrelaSolta: anim("estrela-solta", 0.7, 60, 0, starDropPose, bodyTracks),
  atenta: anim("atenta", ALERT, 30, 1, alertPose, bodyTracks),
  olharPasseia: anim("olhar-passeia", 8, 30, 1, wanderGaze, gazeTracks),
  olharEsq: anim("olhar-esquerda", 0.5, 30, 1, () => gaze(-1, 0), gazeTracks),
  olharMeio: anim("olhar-centro", 0.5, 30, 1, () => gaze(0, 0), gazeTracks),
  olharDir: anim("olhar-direita", 0.5, 30, 1, () => gaze(1, 0), gazeTracks),
  olharBaixo: anim(
    "olhar-baixo",
    0.6,
    30,
    1,
    (t) => gaze(0.15 * Math.sin((TAU * t) / 0.6), 0.9),
    gazeTracks,
  ),
};

// ---------- serializacao ----------
const out = new Out();
for (const ch of "RIVE") out.byte(ch.charCodeAt(0));
out.varuint(7);
out.varuint(0);
out.varuint(0);
out.varuint(0);
function writeObj(type, props) {
  out.varuint(type);
  for (const [key, kind, value] of props) {
    out.varuint(key);
    if (kind === U) out.varuint(value);
    else if (kind === D) out.f32(value);
    else if (kind === S) out.str(value);
    else if (kind === C) out.u32(value);
    else if (kind === B) out.byte(value ? 1 : 0);
    else if (kind === BY) out.bytes(value);
  }
  out.varuint(0);
}
for (const [type, props] of fileObjects) writeObj(type, props);
for (const c of comps) writeObj(c.type, c.props);
let keyframes = 0;
for (const a of animations) {
  writeObj(T.LinearAnimation, [
    [K.animName, S, a.name],
    [K.fps, U, a.fps],
    [K.duration, U, a.frames],
    [K.loop, U, a.loop],
  ]);
  const poses = [];
  for (let f = 0; f <= a.frames; f++) poses.push(a.poseAt(f / a.fps));
  const byObject = new Map();
  for (const tr of a.tracks) {
    if (!byObject.has(tr[0])) byObject.set(tr[0], []);
    byObject.get(tr[0]).push(tr);
  }
  for (const [objectId, list] of byObject) {
    writeObj(T.KeyedObject, [[K.objectId, U, objectId]]);
    for (const [, prop, fn] of list) {
      writeObj(T.KeyedProperty, [[K.propertyKey, U, prop]]);
      const values = poses.map(fn);
      for (let f = 0; f < values.length; f++) {
        const keep =
          f === 0 ||
          f === values.length - 1 ||
          Math.abs(values[f] - (values[f - 1] + values[f + 1]) / 2) > 1e-4;
        if (!keep) continue;
        writeObj(T.KeyFrameDouble, [
          [K.frame, U, f],
          [K.interp, U, 1],
          [K.value, D, values[f]],
        ]);
        keyframes++;
      }
    }
  }
}
// maquina de estados
const IN = { aberta: 0, arrastando: 1, atenta: 2, lado: 3, olharX: 4, clique: 5 };
writeObj(T.StateMachine, [[K.animName, S, "Helena"]]);
writeObj(T.StateMachineBool, [[K.smName, S, "aberta"]]);
writeObj(T.StateMachineBool, [[K.smName, S, "arrastando"]]);
writeObj(T.StateMachineBool, [[K.smName, S, "atenta"]]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "lado"],
  [K.numValue, D, 0],
]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "olharX"],
  [K.numValue, D, 0],
]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "clique"],
  [K.numValue, D, 0],
]);
const EXIT = [
  [K.flags, U, 4 | 8],
  [K.exitTime, U, 100],
  [K.tDuration, U, 60],
];
const go = (to, cond, ms = 150) => {
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.tDuration, U, ms],
  ]);
  if (cond)
    writeObj(T.TransitionBoolCondition, [
      [K.inputId, U, IN[cond[0]]],
      [K.opValue, U, cond[1] ? 0 : 1],
    ]);
};
const goExit = (to) => writeObj(T.StateTransition, [[K.stateToId, U, to], ...EXIT]);
// troca imediata no fim (a pose final ja e a de repouso; sem mistura, o giro de 360 graus nao volta)
const goExitNow = (to) =>
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.flags, U, 4 | 8],
    [K.exitTime, U, 100],
    [K.tDuration, U, 0],
  ]);
const onClick = (to, value) => {
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.tDuration, U, 80],
  ]);
  writeObj(70, [
    [K.inputId, U, IN.clique],
    [K.opValue, U, 0],
    [157, D, value],
  ]);
};
const animState = (id) => writeObj(T.AnimationState, [[K.animationId, U, id]]);
const blendState = (input, list) => {
  writeObj(BLEND_STATE_TYPE, [[K.blendInputId, U, IN[input]]]);
  for (const [id, v] of list)
    writeObj(T.BlendAnimation1D, [
      [K.blendAnimId, U, id],
      [K.blendValue, D, v],
    ]);
};
// camada do corpo: 0 entrada 1 qualquer 2 saida 3 estrela 4 vira-helena 5 parada 6 vira-estrela
// 7 arrastada 8 solta 9 estrela-arrastada 10 estrela-solta 11 atenta
// 12 pulo-feliz 13 giro 14 carinho 15 susto 16 piscadela 17 estrela-pulo 18 estrela-brilho 19 estrela-cambalhota
const HELENA_CLICKS = [
  [12, 1],
  [13, 2],
  [14, 3],
  [15, 4],
  [16, 5],
];
const STAR_CLICKS = [
  [17, 11],
  [18, 12],
  [19, 13],
];
writeObj(T.StateMachineLayer, [[K.smName, S, "Corpo"]]);
writeObj(T.EntryState, []);
go(3, null, 0);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
animState(A.estrela);
go(4, ["aberta", true], 120);
go(9, ["arrastando", true], 90);
STAR_CLICKS.forEach(([s, v]) => onClick(s, v));
animState(A.viraHelena);
goExit(5);
animState(A.parada);
go(6, ["aberta", false], 120);
go(7, ["arrastando", true], 110);
go(11, ["atenta", true], 220);
HELENA_CLICKS.forEach(([s, v]) => onClick(s, v));
animState(A.viraEstrela);
goExit(3);
blendState("lado", [
  [A.arrEsq, -1],
  [A.arrMeio, 0],
  [A.arrDir, 1],
]);
go(8, ["arrastando", false], 60);
animState(A.solta);
goExit(5);
blendState("lado", [
  [A.estrelaArrEsq, -1],
  [A.estrelaArr, 0],
  [A.estrelaArrDir, 1],
]);
go(10, ["arrastando", false], 60);
animState(A.estrelaSolta);
goExit(3);
animState(A.atenta);
go(5, ["atenta", false], 260);
go(6, ["aberta", false], 120);
go(7, ["arrastando", true], 110);
HELENA_CLICKS.forEach(([s, v]) => onClick(s, v));
for (const id of [A.pulo, A.giro, A.carinho, A.susto, A.piscadela]) {
  animState(id);
  go(7, ["arrastando", true], 100);
  goExitNow(5);
}
for (const id of [A.estrelaPulo, A.estrelaBrilho, A.estrelaCambalhota]) {
  animState(id);
  go(9, ["arrastando", true], 100);
  goExitNow(3);
}
// camada do olhar: 0 entrada 1 qualquer 2 saida 3 passeia 4 segue 5 baixo
writeObj(T.StateMachineLayer, [[K.smName, S, "Olhar"]]);
writeObj(T.EntryState, []);
go(3, null, 0);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
animState(A.olharPasseia);
go(4, ["atenta", true], 200);
go(5, ["arrastando", true], 120);
blendState("olharX", [
  [A.olharEsq, -1],
  [A.olharMeio, 0],
  [A.olharDir, 1],
]);
go(3, ["atenta", false], 300);
go(5, ["arrastando", true], 120);
animState(A.olharBaixo);
go(3, ["arrastando", false], 250);

const file = Buffer.from(out.b);
fs.writeFileSync(OUTPUT, file);
console.log(
  OUTPUT,
  file.length,
  "bytes;",
  comps.length,
  "componentes;",
  animations.length,
  "animacoes;",
  keyframes,
  "quadros-chave",
);
