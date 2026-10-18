// Gera public/oliver-math-islands/oliver.riv: a arte do Oliver (camadas de slice.cjs) com uma
// montagem de papel recortado: cada peca e uma imagem rigida dentro de quatro nos aninhados
// (posicao, reacao, olhar, ambiente), para que as camadas da maquina de estados nao disputem
// as mesmas propriedades. Formato binario do runtime oficial do Rive, versao 7.
// No repouso (t = 0 do ambiente) a soma das pecas e a arte original, entao a troca da imagem
// estatica pelo canvas nao tem salto visual.
// Uso: node scripts/oliver-rive/generate.cjs (as camadas vem de slice.cjs).
const fs = require("fs");
const path = require("path");
const LAYERS = path.join(__dirname, "layers");
const OUTPUT =
  process.env["OLIVER_OUT"] ??
  path.join(__dirname, "..", "..", "public", "oliver-math-islands", "oliver.riv");
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

// Cada peca vira quatro nos aninhados no mesmo pivo: p (so posiciona, nunca e animado), r (reacao),
// l (olhar) e a (ambiente). Os filhos entram no no a.
function rig(parent, name, pivot, parentPivot) {
  const x = pivot[0] - parentPivot[0],
    y = pivot[1] - parentPivot[1];
  const p = node(parent, name + "-posicao", x, y);
  const r = node(p, name + "-reacao");
  const l = node(r, name + "-olhar");
  const a = node(l, name + "-ambiente");
  return { p, r, l, a, pivot };
}
// No Rive, o primeiro desenhavel do arquivo fica por cima. As imagens sao criadas no fim, da
// frente para tras, e a ordem de pintura nao depende da hierarquia de nos.
const pictures = [];
function picture(rigOf, layerName) {
  pictures.push([rigOf, layerName]);
}
function emitPicture(rigOf, layerName) {
  const L = layers[layerName];
  comp(T.Image, [
    [K.name, S, layerName],
    [K.parentId, U, rigOf.a],
    [K.imageAssetId, U, ASSET_ORDER.indexOf(layerName)],
    [K.x, D, L.x0 + L.w / 2 - rigOf.pivot[0]],
    [K.y, D, L.y0 + L.h / 2 - rigOf.pivot[1]],
  ]);
}
const ZERO = [0, 0];
const root = node(0, "raiz");
const R = {};
function part(parentRig, name, layerName, pivot) {
  const parent = parentRig ? parentRig.a : root;
  const parentPivot = parentRig ? parentRig.pivot : ZERO;
  const r = rig(parent, name, pivot ?? layers[layerName].pivot, parentPivot);
  if (layerName) picture(r, layerName);
  R[name] = r;
  return r;
}
// Ordem de pintura igual a da arte original: objetos soltos, ilha e, sobre ela, o personagem.
const props = [
  ["pedraE", "rockL"],
  ["lascaE", "chipL"],
  ["pedraD", "rockR"],
  ["lascaD", "chipR"],
];
for (const [n, l] of props) part(null, n, l);
const chama = part(null, "chama", null, layers.flame.pivot);
for (const l of ["flameSparkA", "flameSparkB", "flameSparkC"]) part(chama, "fa-" + l, l);
part(chama, "chamaCorpo", "flame", layers.flame.pivot);
for (const l of ["shardA", "shardB", "shardC"]) part(null, l, l);
part(null, "mais", "plus");
const divisao = part(null, "divisao", null, layers.divBar.pivot);
part(divisao, "divPontoCima", "divDotTop");
part(divisao, "divPontoBaixo", "divDotBottom");
part(divisao, "divBarra", "divBar");
part(null, "regua", "ruler");
const ilha = part(null, "ilha", "island");
// o personagem esta em pe sobre a ilha: o pivo dele e o meio dos pes
const FEET = [330, 585];
const char = rig(ilha.a, "personagem", FEET, ilha.pivot);
R.personagem = char;
const legL = part(char, "pernaE", "legL");
const legR = part(char, "pernaD", "legR");
const bodyRig = part(char, "corpo", "body", [320, 500]);
const mouth = part(bodyRig, "boca", "mouth");
const eyeL = part(bodyRig, "olhoE", "eyeL");
const eyeR = part(bodyRig, "olhoD", "eyeR");
const armL = part(bodyRig, "bracoE", "armL");
const armR = part(bodyRig, "bracoD", "armR");

// A ordem de pintura vem de layers.json (de tras para frente), nao da ordem dos nos.
pictures.sort((a, b) => ASSET_ORDER.indexOf(b[1]) - ASSET_ORDER.indexOf(a[1]));
const hidden = (process.env["OLIVER_HIDE"] ?? "").split(",");
for (const [rigOf, layerName] of pictures)
  if (!hidden.includes(layerName)) emitPicture(rigOf, layerName);

// ---------- curvas ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// oscilacao periodica que vale zero em t = 0 (a pose de repouso e a da arte original)
const osc = (t, period, phase = 0) => Math.sin(TAU * (t / period + phase)) - Math.sin(TAU * phase);
const spring = (t, t0, amp, freq, decay) =>
  t < t0 ? 0 : amp * Math.exp(-decay * (t - t0)) * Math.cos(freq * (t - t0));
const blinkAt = (t, at) => {
  const b = t - at;
  if (b < 0 || b > 0.26) return 0;
  return b < 0.095 ? smooth(0, 0.095, b) : 1 - smooth(0.125, 0.26, b);
};
const EPS = 0.0001;

const animations = [];
function anim(name, seconds, fps, loop, tracks) {
  animations.push({ name, frames: Math.max(1, Math.round(seconds * fps)), fps, loop, tracks });
  return animations.length - 1;
}
const P = { x: K.x, y: K.y, rot: K.rotation, sx: K.scaleX, sy: K.scaleY, op: K.opacity };
const REST = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, op: 1 };
// pequena ajuda: cria trilhas de um no a partir de funcoes por propriedade
function tr(list, rigOf, level, fns) {
  const id = rigOf[level];
  for (const [prop, fn] of Object.entries(fns)) list.push([id, P[prop], fn]);
}
const scaleBoth = (fn) => ({ sx: fn, sy: fn });

// ---------- ambiente: 12 s, ciclos inteiros ----------
const LOOP = 12;
const ambient = [];
const amb = (name, fns) => tr(ambient, R[name], "a", fns);
amb("ilha", {
  y: (t) => 4 * osc(t, 6),
  rot: (t) => 0.004 * osc(t, 12),
});
amb("corpo", {
  sy: (t) => 1 + 0.011 * osc(t, 3),
  sx: (t) => 1 - 0.005 * osc(t, 3),
});
const wave = (t) => smooth(5, 5.4, t) * (1 - smooth(6.9, 7.4, t));
amb("bracoD", {
  rot: (t) =>
    0.03 * osc(t, 4, 0.25) - 0.06 * wave(t) + 0.15 * wave(t) * Math.sin(TAU * ((t - 5) / 0.8)),
});
amb("bracoE", { rot: (t) => 0.035 * osc(t, 4) });
for (const side of ["olhoE", "olhoD"]) {
  amb(side, {
    sy: (t) =>
      Math.max(EPS, 1 - 0.93 * Math.max(blinkAt(t, 2.4), blinkAt(t, 8.1), blinkAt(t, 8.45))),
  });
}
amb("boca", {
  sx: (t) => 1 + 0.012 * osc(t, 6),
  sy: (t) => 1 + 0.02 * osc(t, 3, 0.1),
});
amb("chamaCorpo", {
  sy: (t) => 1 + 0.05 * osc(t, 0.8) + 0.025 * osc(t, 0.3, 0.2),
  sx: (t) => 1 - 0.03 * osc(t, 0.8, 0.1),
  rot: (t) => 0.03 * osc(t, 2) + 0.015 * osc(t, 0.6),
});
const sparkTwinkle = (name, period, phase) =>
  amb(name, {
    ...scaleBoth((t) => 1 + 0.28 * osc(t, period, phase)),
    op: (t) =>
      1 -
      0.22 * (osc(t, period, phase + 0.25) + 1) * 0.5 +
      0.22 * 0.5 * (osc(0, period, phase + 0.25) + 1),
    y: (t) => -3 * osc(t, period * 2, phase),
  });
sparkTwinkle("fa-flameSparkA", 2.4, 0.1);
sparkTwinkle("fa-flameSparkB", 3, 0.5);
sparkTwinkle("fa-flameSparkC", 4, 0.8);
const twinkle = (name, period, phase) =>
  amb(name, {
    ...scaleBoth((t) => 1 + 0.09 * osc(t, period, phase)),
    rot: (t) => 0.05 * osc(t, period * 2, phase + 0.3),
  });
twinkle("shardA", 3, 0.1);
twinkle("shardB", 4, 0.4);
twinkle("shardC", 2.4, 0.7);
const floaty = (name, period, ampY, ampRot, phase) =>
  amb(name, {
    y: (t) => ampY * osc(t, period, phase),
    rot: (t) => ampRot * osc(t, period * 2, phase + 0.2),
  });
floaty("mais", 6, 5, 0.06, 0.0);
floaty("divisao", 4, 4, 0.05, 0.3);
floaty("regua", 6, 4, 0.03, 0.55);
floaty("pedraE", 4, 3, 0.04, 0.2);
floaty("pedraD", 6, 3, 0.04, 0.7);
floaty("lascaE", 3, 2, 0.08, 0.4);
floaty("lascaD", 2, 2, 0.08, 0.1);
const A_AMBIENTE = anim("ambiente", LOOP, 30, 1, ambient);

// ---------- reacoes (clique) ----------
const reactAnim = (name, seconds, fill) => {
  const list = [];
  fill((n, fns) => tr(list, R[n], "r", fns));
  return anim(name, seconds, 60, 0, list);
};
const arc = (t, a, b, h) => {
  if (t <= a || t >= b) return 0;
  const u = (t - a) / (b - a);
  return h * 4 * u * (1 - u);
};
const A_PULO = reactAnim("pulo", 1.3, (r) => {
  const air = (t) => arc(t, 0.25, 0.85, 52);
  r("personagem", {
    y: (t) => -air(t),
    sy: (t) => {
      if (t < 0.25) return 1 - 0.1 * smooth(0, 0.25, t);
      if (t < 0.85) return 0.9 + 0.2 * smooth(0.25, 0.35, t) - 0.12 * smooth(0.6, 0.85, t) + 0.0;
      return 1 + spring(t, 0.85, -0.12, 24, 7);
    },
    sx: (t) => {
      if (t < 0.25) return 1 + 0.05 * smooth(0, 0.25, t);
      if (t < 0.85) return 1.05 - 0.07 * smooth(0.25, 0.35, t) + 0.05 * smooth(0.6, 0.85, t);
      return 1 - spring(t, 0.85, -0.06, 24, 7);
    },
  });
  r("ilha", {
    y: (t) =>
      t < 0.25
        ? 6 * smooth(0, 0.25, t)
        : 6 * (1 - smooth(0.25, 0.4, t)) + spring(t, 0.85, 5, 20, 7),
  });
  r("bracoE", {
    rot: (t) =>
      ((0.35 * (1 - Math.cos(Math.PI * smooth(0.2, 0.5, t)))) / 2) * (1 - smooth(0.9, 1.25, t)),
  });
  r("bracoD", { rot: (t) => -0.12 * Math.sin(Math.PI * smooth(0.2, 1.2, t)) });
  for (const side of ["olhoE", "olhoD"])
    r(
      side,
      scaleBoth((t) => 1 + 0.12 * Math.sin(Math.PI * smooth(0.2, 1.0, t))),
    );
  r("boca", { sy: (t) => 1 + 0.18 * Math.sin(Math.PI * smooth(0.25, 1.0, t)) });
  for (const [name, d] of [
    ["mais", 0],
    ["divisao", 0.05],
    ["regua", 0.1],
    ["shardA", 0],
    ["shardB", 0.04],
    ["shardC", 0.08],
  ]) {
    r(
      name,
      scaleBoth((t) => 1 + 0.14 * Math.sin(Math.PI * smooth(0.3 + d, 1.1 + d, t))),
    );
  }
  r(
    "chama",
    scaleBoth((t) => 1 + 0.18 * Math.sin(Math.PI * smooth(0.3, 1.0, t))),
  );
});
const A_ACENO = reactAnim("aceno", 1.9, (r) => {
  const env = (t) => smooth(0, 0.3, t) * (1 - smooth(1.5, 1.9, t));
  r("bracoD", {
    rot: (t) => -0.14 * env(t) + 0.2 * env(t) * Math.sin(TAU * (t / 0.6)),
  });
  r("corpo", { rot: (t) => -0.02 * env(t) + 0.008 * env(t) * Math.sin(TAU * (t / 0.6)) });
  r("bracoE", { rot: (t) => 0.14 * env(t) });
  for (const side of ["olhoE", "olhoD"])
    r(
      side,
      scaleBoth((t) => 1 + 0.1 * env(t)),
    );
  r("boca", { sx: (t) => 1 + 0.04 * env(t), sy: (t) => 1 + 0.12 * env(t) });
  r("chama", { rot: (t) => 0.06 * env(t) * Math.sin(TAU * (t / 0.5)) });
  r("mais", { rot: (t) => 0.08 * env(t) * Math.sin(TAU * (t / 0.5) + 1) });
});
const A_ANIMO = reactAnim("animo", 1.7, (r) => {
  const bounce = (t) =>
    Math.abs(Math.sin(Math.PI * (t / 0.5))) * (t < 1.5 ? 1 : 0) * smooth(0, 0.1, t);
  r("personagem", {
    y: (t) => -26 * bounce(t),
    sy: (t) => 1 + 0.05 * (bounce(t) - 0.5) * (t < 1.5 ? 1 : 0),
  });
  r("bracoE", { rot: (t) => 0.35 * smooth(0, 0.25, t) * (1 - smooth(1.4, 1.7, t)) });
  r("bracoD", { rot: (t) => -0.08 * smooth(0, 0.25, t) * (1 - smooth(1.4, 1.7, t)) });
  r("ilha", { y: (t) => 4 * (1 - bounce(t)) * smooth(0, 0.1, t) * (1 - smooth(1.4, 1.7, t)) });
  for (const [name, dir] of [
    ["mais", 1],
    ["regua", -1],
    ["shardA", 1],
    ["shardC", -1],
  ]) {
    r(name, { rot: (t) => dir * 0.25 * Math.sin(Math.PI * smooth(0.1, 1.5, t)) });
  }
  for (const side of ["olhoE", "olhoD"])
    r(
      side,
      scaleBoth((t) => 1 + 0.1 * Math.sin(Math.PI * smooth(0, 1.6, t))),
    );
});
const A_REPOUSO = anim("repouso", 0.5, 30, 1, [
  [R.personagem.r, K.y, () => 0],
  [R.corpo.r, K.rotation, () => 0],
]);

// ---------- olhar: inclinacao para o ponteiro (-1 a 1) ----------
const lean = (name, x) => {
  const list = [];
  const l = (n, fns) => tr(list, R[n], "l", fns);
  l("corpo", { rot: () => 0.035 * x, x: () => 3 * x });
  l("personagem", { rot: () => 0.01 * x });
  l("olhoE", { x: () => 7 * x });
  l("olhoD", { x: () => 7 * x });
  l("boca", { x: () => 4 * x });
  l("bracoD", { rot: () => 0.05 * x });
  l("bracoE", { rot: () => 0.05 * x });
  l("mais", { x: () => -4 * x });
  l("divisao", { x: () => -5 * x });
  l("regua", { x: () => -6 * x });
  l("chama", { x: () => 4 * x });
  l("pedraE", { x: () => 3 * x });
  l("pedraD", { x: () => -3 * x });
  return anim(name, 0.5, 30, 1, list);
};
const A_OLHAR_E = lean("olhar-esquerda", -1);
const A_OLHAR_C = lean("olhar-centro", 0);
const A_OLHAR_D = lean("olhar-direita", 1);

// ---------- estresse (somente verificacao): poses extremas somadas, uma por segundo ----------
// OLIVER_STRESS=1 acrescenta a animacao "estresse"; o arquivo publicado nunca a inclui.
if (process.env["OLIVER_STRESS"]) {
  const poses = [];
  for (const body of [-0.075, 0.075])
    for (const armR of [-0.6, 0.6])
      for (const armL of [-0.6, 0.6]) poses.push({ body, armR, armL, squash: 0.88 });
  poses.push(
    { body: 0.07, armR: 0, armL: 0, squash: 1.1 },
    { body: -0.07, armR: 0, armL: 0, squash: 1.1 },
  );
  const at = (t) => poses[Math.min(poses.length - 1, Math.round(t))];
  const list = [];
  list.push([R.corpo.l, K.rotation, (t) => at(t).body]);
  list.push([R.bracoD.l, K.rotation, (t) => at(t).armR]);
  list.push([R.bracoE.l, K.rotation, (t) => at(t).armL]);
  list.push([R.personagem.r, K.scaleY, (t) => at(t).squash]);
  list.push([R.personagem.r, K.scaleX, (t) => 2 - at(t).squash]);
  animations.push({ name: "estresse", frames: poses.length - 1, fps: 1, loop: 0, tracks: list });
}

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
// maquina de estados: entradas olharX e clique
const IN = { olharX: 0, clique: 1 };
writeObj(T.StateMachine, [[K.animName, S, "Oliver"]]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "olharX"],
  [K.numValue, D, 0],
]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "clique"],
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
// camada Reacao: 3 repouso 4 pulo 5 aceno 6 animo
writeObj(T.StateMachineLayer, [[K.smName, S, "Reacao"]]);
header();
goEntry(3);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
animState(A_REPOUSO);
onClick(4, 1);
onClick(5, 2);
onClick(6, 3);
for (const id of [A_PULO, A_ACENO, A_ANIMO]) {
  animState(id);
  goNow(3);
}
// camada Olhar: 3 inclinacao
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
  "animacoes;",
  keyframes,
  "quadros-chave",
);
