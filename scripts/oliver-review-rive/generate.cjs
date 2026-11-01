// Rig articulado desta pose: corpo e membros preservam escala, boca é geometria nativa.
// Uso: node scripts/oliver-review-rive/generate.cjs, após slice.cjs.
const fs = require("fs");
const path = require("path");
const LAYERS = path.join(__dirname, "layers");
const OUTPUT =
  process.env["REVIEW_OUT"] ??
  path.join(__dirname, "..", "..", "public", "oliver-math-review", "oliver.riv");
const meta = JSON.parse(fs.readFileSync(path.join(LAYERS, "layers.json"), "utf8"));
const layers = meta.layers;

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
    a.writeUInt32LE(v >>> 0);
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
  B = "b",
  C = "c",
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
  vx: 24,
  vy: 25,
  isClosed: 32,
  color: 37,
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
  PointsPath: 16,
  StraightVertex: 5,
  Fill: 20,
  SolidColor: 18,
  ImageAsset: 105,
  FileAssetContents: 106,
  Image: 100,
  LinearAnimation: 31,
  KeyedObject: 25,
  KeyedProperty: 26,
  KeyFrameDouble: 30,
  StateMachine: 53,
  StateMachineNumber: 56,
  StateMachineLayer: 57,
  EntryState: 63,
  AnyState: 62,
  ExitState: 64,
  AnimationState: 61,
  StateTransition: 65,
  BlendAnimation1D: 75,
};
const BLEND_STATE_TYPE = 76;
const NUMBER_CONDITION = 70;
const CONDITION_VALUE = 157;

// ---------- arquivo: uma imagem por camada ----------
const fileObjects = [[T.Backboard, []]];
const ASSET_ORDER = meta.order;
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

const comps = [];
function comp(type, props) {
  comps.push({ type, props });
  return comps.length - 1;
}
comp(T.Artboard, [
  [K.name, S, "Oliver"],
  [K.width, D, meta.width],
  [K.height, D, meta.height],
]);
function node(parent, name, x = 0, y = 0) {
  return comp(T.Node, [
    [K.name, S, name],
    [K.parentId, U, parent],
    [K.x, D, x],
    [K.y, D, y],
  ]);
}

// Cada peça vira quatro nós aninhados no mesmo pivô: p (só posiciona, nunca é animado), r (reação),
// l (olhar) e a (ambiente). Os filhos entram no nó a.
function rig(parent, name, pivot, parentPivot) {
  const x = pivot[0] - parentPivot[0],
    y = pivot[1] - parentPivot[1];
  const p = node(parent, name + "-posicao", x, y);
  const r = node(p, name + "-reacao");
  const l = node(r, name + "-olhar");
  const a = node(l, name + "-ambiente");
  return { p, r, l, a, pivot };
}
// No Rive, o primeiro desenhável do arquivo fica por cima. As imagens são criadas no fim, da
// frente para trás, e a ordem de pintura não depende da hierarquia de nós.
const pictures = [];
const PIC = {};
function emitPicture(rigOf, layerName) {
  const L = layers[layerName];
  // O brilho de pulso nasce invisível: a animação o acende, e no repouso a arte é a original.
  const extra = layerName.startsWith("pulse") ? [[K.opacity, D, 0]] : [];
  PIC[layerName] = comp(T.Image, [
    [K.name, S, layerName],
    [K.parentId, U, rigOf.a],
    [K.imageAssetId, U, ASSET_ORDER.indexOf(layerName)],
    [K.x, D, L.x0 + L.w / 2 - rigOf.pivot[0]],
    [K.y, D, L.y0 + L.h / 2 - rigOf.pivot[1]],
    ...extra,
  ]);
}
const ZERO = [0, 0];
const root = node(0, "raiz");
const R = {};
function part(parentRig, name, layerName, pivot) {
  const parent = parentRig ? parentRig.a : root;
  const parentPivot = parentRig ? parentRig.pivot : ZERO;
  const r = rig(parent, name, pivot ?? layers[layerName].pivot, parentPivot);
  if (layerName) pictures.push([r, layerName]);
  R[name] = r;
  return r;
}
const char = part(null, "personagem", null, [630, 1080]);
const corpo = part(char, "corpo", "body");
part(char, "peE", "footL");
part(char, "peD", "footR");
part(corpo, "maoE", "handL");
const boca = part(corpo, "boca", "mouth");
part(corpo, "olhoE", "eyeL");
part(corpo, "olhoD", "eyeR");
part(corpo, "maoD", "handR");
// A geometria fica na frente das imagens. Pontos amostrados da boca original.
const outline = [
  ...meta.mouthContour.map((p) => [p.x, p.top]),
  ...meta.mouthContour
    .slice()
    .reverse()
    .map((p) => [p.x, p.bottom]),
];
const mouthShape = comp(T.Shape, [
  [K.name, S, "boca-vetorial"],
  [K.parentId, U, boca.a],
  [K.opacity, D, 0],
]);
const mouthPath = comp(T.PointsPath, [
  [K.parentId, U, mouthShape],
  [K.isClosed, B, 1],
]);
const mouthVertices = outline.map(([x, y]) =>
  comp(T.StraightVertex, [
    [K.parentId, U, mouthPath],
    [K.vx, D, x],
    [K.vy, D, y],
  ]),
);
const mouthFill = comp(T.Fill, [[K.parentId, U, mouthShape]]);
comp(T.SolidColor, [
  [K.parentId, U, mouthFill],
  [K.color, C, 0xff201f1d],
]);
pictures.sort((a, b) => ASSET_ORDER.indexOf(b[1]) - ASSET_ORDER.indexOf(a[1]));
for (const [r, name] of pictures) emitPicture(r, name);
const TAU = 2 * Math.PI;
const animations = [];
function anim(name, seconds, fps, loop, tracks) {
  animations.push({ name, frames: Math.round(seconds * fps), fps, loop, tracks });
  return animations.length - 1;
}
const P = { x: K.x, y: K.y, rot: K.rotation, sx: K.scaleX, sy: K.scaleY };
function tr(list, rigOf, level, fns) {
  for (const [prop, fn] of Object.entries(fns)) list.push([rigOf[level], P[prop], fn]);
}
const bump = (t, duration) => Math.sin(Math.PI * Math.min(1, t / duration)) ** 2;
const ambient = [];
tr(ambient, R.corpo, "a", {
  y: (t) => -2 * Math.sin((TAU * t) / 4),
  rot: (t) => 0.002 * Math.sin((TAU * t) / 8),
});
for (const name of ["olhoE", "olhoD"])
  tr(ambient, R[name], "a", {
    sy: (t) => {
      const u = (t - 2.7) % 4;
      return u >= 0 && u < 0.22 ? 1 - 0.9 * Math.sin((Math.PI * u) / 0.22) ** 2 : 1;
    },
  });
const A_AMBIENTE = anim("ambiente", 8, 30, 1, ambient);
const rest = [];
for (const name of ["personagem", "corpo", "boca", "olhoE", "olhoD", "maoE", "maoD", "peE", "peD"])
  tr(rest, R[name], "r", { x: () => 0, y: () => 0, rot: () => 0 });
const A_REPOUSO = anim("repouso", 0.5, 30, 1, rest);
const talk = [];
const speechEnvelope = (t) => Math.min(1, t / 0.16, (6 - t) / 0.2);
tr(talk, R.maoD, "r", {
  rot: (t) => -0.075 * Math.sin((TAU * t) / 2) * Math.max(0, speechEnvelope(t)),
  y: (t) => -3 * Math.sin((TAU * t) / 3) * Math.max(0, speechEnvelope(t)),
});
tr(talk, R.maoE, "r", {
  rot: (t) => 0.035 * Math.sin((TAU * t) / 3),
  y: (t) => -2 * Math.sin((TAU * t) / 3),
});
tr(talk, R.peE, "r", { rot: (t) => 0.018 * Math.sin((TAU * t) / 3) });
tr(talk, R.peD, "r", { rot: (t) => -0.018 * Math.sin((TAU * t) / 3) });
tr(talk, R.corpo, "r", { rot: (t) => 0.008 * Math.sin((TAU * t) / 3) });
const A_BALANCO = anim("falando", 6, 60, 1, talk);
const happy = [];
tr(happy, R.personagem, "r", {
  y: (t) =>
    t < 0.22
      ? 8 * Math.sin((Math.PI * t) / 0.44) ** 2
      : t < 0.77
        ? 8 + (-8 / 0.55 - 450 * 0.55) * (t - 0.22) + 450 * (t - 0.22) ** 2
        : t < 1.12
          ? 3 * Math.sin((Math.PI * (t - 0.77)) / 0.35) ** 2
          : 0,
  rot: (t) => 0.025 * Math.sin((TAU * t) / 1.4) * bump(t, 1.4),
});
for (const name of ["olhoE", "olhoD"])
  tr(happy, R[name], "r", {
    y: (t) => -10 * bump(t, 1.4),
  });
tr(happy, R.maoD, "r", { rot: (t) => -0.14 * bump(t, 1.4) });
tr(happy, R.maoE, "r", { rot: (t) => 0.12 * bump(t, 1.4) });
tr(happy, R.peE, "r", { rot: (t) => -0.05 * bump(t, 1.4), y: (t) => -3 * bump(t, 1.4) });
tr(happy, R.peD, "r", { rot: (t) => 0.05 * bump(t, 1.4), y: (t) => -3 * bump(t, 1.4) });
const A_PULO = anim("acerto", 1.4, 60, 0, happy);
const encourage = [];
tr(encourage, R.corpo, "r", { rot: (t) => -0.025 * bump(t, 1.8), y: (t) => 8 * bump(t, 1.8) });
tr(encourage, R.maoD, "r", { rot: (t) => 0.11 * bump(t, 1.8) });
tr(encourage, R.maoE, "r", { rot: (t) => -0.055 * bump(t, 1.8) });
for (const [name, direction] of [
  ["olhoE", 1],
  ["olhoD", -1],
])
  tr(encourage, R[name], "r", {
    y: (t) => 13 * bump(t, 1.8),
    rot: (t) => direction * 0.055 * bump(t, 1.8),
  });
const A_CORACAO = anim("tristeza-e-retomada", 1.8, 60, 0, encourage);
const wave = [];
tr(wave, R.maoD, "r", {
  rot: (t) => -0.14 * Math.sin(TAU * 2 * t) * bump(t, 1.8),
  y: (t) => -4 * bump(t, 1.8),
});
tr(wave, R.corpo, "r", { rot: (t) => 0.018 * bump(t, 1.8) });
const A_WAVE = anim("saudacao", 1.8, 60, 0, wave);
const think = [];
tr(think, R.corpo, "r", { rot: (t) => -0.025 * bump(t, 2.4), y: (t) => 3 * bump(t, 2.4) });
for (const name of ["olhoE", "olhoD"])
  tr(think, R[name], "r", { x: (t) => -8 * bump(t, 2.4), y: (t) => 5 * bump(t, 2.4) });
tr(think, R.maoD, "r", { rot: (t) => 0.07 * bump(t, 2.4) });
const A_THINK = anim("pensando", 2.4, 60, 0, think);
const happy2 = [];
tr(happy2, R.personagem, "r", {
  rot: (t) => 0.025 * Math.sin(TAU * t) * bump(t, 2),
  y: (t) => -8 * Math.sin(Math.PI * t) ** 2,
});
tr(happy2, R.maoD, "r", { rot: (t) => -0.1 * bump(t, 2) });
tr(happy2, R.maoE, "r", { rot: (t) => 0.08 * bump(t, 2) });
tr(happy2, R.peE, "r", { rot: (t) => -0.1 * Math.max(0, Math.sin(TAU * t)) * bump(t, 2) });
tr(happy2, R.peD, "r", { rot: (t) => 0.1 * Math.max(0, -Math.sin(TAU * t)) * bump(t, 2) });
const A_HAPPY2 = anim("comemoracao-passinhos", 2, 60, 0, happy2);
const listen = [];
tr(listen, R.corpo, "r", { rot: (t) => 0.022 * bump(t, 1.6) });
for (const name of ["olhoE", "olhoD"]) tr(listen, R[name], "r", { x: (t) => 9 * bump(t, 1.6) });
const A_LISTEN = anim("atencao", 1.6, 60, 0, listen);
const mouthPoses = [
  outline,
  meta.mouthContour
    .map((p) => [p.x, (p.top + p.bottom) / 2 - 7])
    .concat(
      meta.mouthContour
        .slice()
        .reverse()
        .map((p) => [p.x, (p.top + p.bottom) / 2 + 7]),
    ),
  Array.from({ length: 36 }, (_, i) => [
    65 * Math.cos(Math.PI + (TAU * i) / 36),
    18 + 70 * Math.sin(Math.PI + (TAU * i) / 36),
  ]),
  meta.mouthContour
    .map((p) => [p.x, (p.top + p.bottom) / 2 - 25])
    .concat(
      meta.mouthContour
        .slice()
        .reverse()
        .map((p) => [p.x, (p.top + p.bottom) / 2 + 25]),
    ),
  meta.mouthContour
    .map((p) => [p.x, 55 - 30 * (1 - (p.x / 175) ** 2) - 0.18 * p.x - 9])
    .concat(
      meta.mouthContour
        .slice()
        .reverse()
        .map((p) => [p.x, 55 - 30 * (1 - (p.x / 175) ** 2) - 0.18 * p.x + 9]),
    ),
  outline.map(([x, y], i) => [x, y + (i >= 18 ? 18 * Math.max(0, 1 - (x / 175) ** 2) : 0)]),
];
const A_MOUTH = mouthPoses.map((points, index) =>
  anim(
    ["boca-repouso", "boca-A", "boca-O", "boca-E", "boca-triste", "boca-feliz"][index],
    index >= 4 ? 1.8 : 0.5,
    60,
    index >= 4 ? 0 : 1,
    [
      [
        PIC.mouth,
        K.opacity,
        (t) => (index === 0 ? 1 : index >= 4 ? 1 - Math.min(1, t / 0.14, (1.8 - t) / 0.14) : 0),
      ],
      [
        mouthShape,
        K.opacity,
        (t) => (index === 0 ? 0 : index >= 4 ? Math.min(1, t / 0.14, (1.8 - t) / 0.14) : 1),
      ],
      ...points.flatMap(([x, y], i) => [
        [
          mouthVertices[i],
          K.vx,
          (t) => (index >= 4 ? outline[i][0] + (x - outline[i][0]) * bump(t, 1.8) : x),
        ],
        [
          mouthVertices[i],
          K.vy,
          (t) => (index >= 4 ? outline[i][1] + (y - outline[i][1]) * bump(t, 1.8) : y),
        ],
      ]),
    ],
  ),
);
const lean = (name, x) => anim(name, 0.5, 30, 1, [[R.corpo.l, K.rotation, () => x * 0.003]]);
const A_OLHAR_E = lean("olhar-esquerda", -1),
  A_OLHAR_C = lean("olhar-centro", 0),
  A_OLHAR_D = lean("olhar-direita", 1);
// ---------- serialização ----------
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
  const byObject = new Map();
  for (const t of a.tracks) {
    if (!byObject.has(t[0])) byObject.set(t[0], []);
    byObject.get(t[0]).push(t);
  }
  for (const [objectId, list] of byObject) {
    writeObj(T.KeyedObject, [[K.objectId, U, objectId]]);
    for (const [, prop, fn] of list) {
      writeObj(T.KeyedProperty, [[K.propertyKey, U, prop]]);
      const values = [];
      for (let f = 0; f <= a.frames; f++) values.push(fn(f / a.fps));
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
// máquina de estados: entradas olharX e clique
const IN = { olharX: 0, clique: 1, boca: 2 };
writeObj(T.StateMachine, [[K.animName, S, "Oliver"]]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "olharX"],
  [K.numValue, D, 0],
]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "clique"],
  [K.numValue, D, 0],
]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "boca"],
  [K.numValue, D, 0],
]);
const goNow = (to) =>
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.flags, U, 4 | 8],
    [K.exitTime, U, 100],
    [K.tDuration, U, 0],
  ]);
const goEntry = (to) =>
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.tDuration, U, 0],
  ]);
const onClick = (to, value) => {
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.tDuration, U, 120],
  ]);
  writeObj(NUMBER_CONDITION, [
    [K.inputId, U, IN.clique],
    [K.opValue, U, 0],
    [CONDITION_VALUE, D, value],
  ]);
};
const animState = (id) => writeObj(T.AnimationState, [[K.animationId, U, id]]);
const header = () => {
  writeObj(T.EntryState, []);
};
// camada Base: 3 ambiente (ciclo de 12 s)
writeObj(T.StateMachineLayer, [[K.smName, S, "Base"]]);
header();
goEntry(3);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
animState(A_AMBIENTE);
// camada Reacao: 3 repouso 4 pulo 5 balanço 6 coração
writeObj(T.StateMachineLayer, [[K.smName, S, "Reacao"]]);
header();
goEntry(3);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
animState(A_REPOUSO);
onClick(4, 1);
onClick(5, 2);
onClick(6, 3);
onClick(7, 4);
onClick(8, 5);
onClick(9, 6);
onClick(10, 7);
const reactionStates = [
  [A_PULO, 4, 1],
  [A_BALANCO, 5, 2],
  [A_CORACAO, 6, 3],
  [A_WAVE, 7, 4],
  [A_THINK, 8, 5],
  [A_HAPPY2, 9, 6],
  [A_LISTEN, 10, 7],
];
for (const [id] of reactionStates) {
  animState(id);
  if (id !== A_BALANCO) goNow(3);
  if (id === A_BALANCO) onClick(3, 0);
  for (const [animation, state, value] of reactionStates)
    if (id !== animation) onClick(state, value);
}
// camada Olhar: 3 inclinação
writeObj(T.StateMachineLayer, [[K.smName, S, "Olhar"]]);
header();
goEntry(3);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
writeObj(BLEND_STATE_TYPE, [[K.blendInputId, U, IN.olharX]]);
for (const [id, v] of [
  [A_OLHAR_E, -1],
  [A_OLHAR_C, 0],
  [A_OLHAR_D, 1],
])
  writeObj(T.BlendAnimation1D, [
    [K.blendAnimId, U, id],
    [K.blendValue, D, v],
  ]);

writeObj(T.StateMachineLayer, [[K.smName, S, "Fala"]]);
header();
goEntry(3);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
for (const [value, id] of A_MOUTH.entries()) {
  animState(id);
  for (let next = 0; next < A_MOUTH.length; next++) {
    if (next === value) continue;
    writeObj(T.StateTransition, [
      [K.stateToId, U, 3 + next],
      [K.tDuration, U, 140],
    ]);
    writeObj(NUMBER_CONDITION, [
      [K.inputId, U, IN.boca],
      [K.opValue, U, 0],
      [CONDITION_VALUE, D, next],
    ]);
  }
}
const rigidNodes = new Set(
  ["personagem", "corpo", "maoE", "maoD", "peE", "peD"].flatMap((name) => [
    R[name].p,
    R[name].r,
    R[name].l,
    R[name].a,
  ]),
);
for (const animation of animations)
  for (const [id, property, fn] of animation.tracks) {
    if (rigidNodes.has(id) && [K.scaleX, K.scaleY].includes(property))
      for (let i = 0; i <= animation.frames; i++)
        if (fn(i / animation.fps) !== 1) throw new Error("Body or limb stretch is forbidden");
  }
fs.writeFileSync(
  path.resolve(__dirname, "../../artifacts/math-oliver-review/rig-report.json"),
  JSON.stringify(
    {
      layers: ASSET_ORDER,
      animations: animations.map((a) => a.name),
      mouthNativeVertices: mouthVertices.length,
      bodyAndLimbsScaleFixedAtOne: true,
      inputs: ["olharX", "clique", "boca"],
    },
    null,
    2,
  ) + "\n",
);
const file = Buffer.from(out.b);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, file);
console.log(
  OUTPUT,
  file.length,
  "bytes;",
  comps.length,
  "componentes;",
  animations.length,
  "animações;",
  keyframes,
  "quadros-chave",
);
