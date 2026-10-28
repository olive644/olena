// Gera public/oliver-peeking-widget/oliver.riv: a arte do Oliver espiando atrás do widget de
// Matemática (camadas de slice.cjs) com uma montagem de papel recortado: cada peça é uma imagem
// rígida dentro de quatro nós aninhados (posição, reação, olhar, ambiente), para que as camadas da
// máquina de estados não disputem as mesmas propriedades. Formato binário do runtime oficial do
// Rive, versão 7. No repouso (t = 0 do ambiente) a soma das peças é a arte original, então a troca
// da imagem estática pelo canvas não tem salto visual.
// Uso: node scripts/oliver-peek-rive/generate.cjs (as camadas vêm de slice.cjs).
const fs = require("fs");
const path = require("path");
const LAYERS = path.join(__dirname, "layers");
const OUTPUT =
  process.env["PEEK_OUT"] ??
  path.join(__dirname, "..", "..", "public", "oliver-peeking-widget", "oliver.riv");
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
// O personagem inteiro (corpo e mãos) pula e balança junto; o pivô é o chão sob o corpo.
const char = part(null, "personagem", null, [450, 540]);
const corpo = part(char, "corpo", "body");
part(corpo, "boca", "mouth");
part(corpo, "olhoE", "eyeL");
part(corpo, "olhoD", "eyeR");
part(char, "maoE", "handL");
part(char, "maoD", "handR");
const mais = part(null, "mais", null, layers.plus.pivot);
part(mais, "maisPulso", "pulsePlus");
part(mais, "maisBrilho", "glowPlus");
part(mais, "maisSinal", "plus");
const divisao = part(null, "divisao", null, layers.divBar.pivot);
part(divisao, "divPulso", "pulseDiv");
part(divisao, "divBrilho", "glowDiv");
part(divisao, "divBarra", "divBar");
part(divisao, "divPontoCima", "divDotTop");
part(divisao, "divPontoBaixo", "divDotBottom");

// A ordem de pintura vem de layers.json (de trás para frente), não da ordem dos nós.
pictures.sort((a, b) => ASSET_ORDER.indexOf(b[1]) - ASSET_ORDER.indexOf(a[1]));
const hidden = (process.env["PEEK_HIDE"] ?? "").split(",");
for (const [rigOf, layerName] of pictures)
  if (!hidden.includes(layerName)) emitPicture(rigOf, layerName);

// ---------- curvas ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// oscilação periódica que vale zero em t = 0 (a pose de repouso é a da arte original)
const osc = (t, period, phase = 0) => Math.sin(TAU * (t / period + phase)) - Math.sin(TAU * phase);
const spring = (t, t0, amp, freq, decay) =>
  t < t0 ? 0 : amp * Math.exp(-decay * (t - t0)) * Math.cos(freq * (t - t0));
const blinkAt = (t, at) => {
  const b = t - at;
  if (b < 0 || b > 0.26) return 0;
  return b < 0.095 ? smooth(0, 0.095, b) : 1 - smooth(0.125, 0.26, b);
};
// um batimento: sobe e desce suave em d segundos a partir de a
const bump = (t, a, d) => {
  const u = (t - a) / d;
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2;
};
const heartbeat = (t, at) => bump(t, at, 0.24) + 0.7 * bump(t, at + 0.3, 0.24);
const EPS = 0.0001;

const animations = [];
function anim(name, seconds, fps, loop, tracks) {
  animations.push({ name, frames: Math.max(1, Math.round(seconds * fps)), fps, loop, tracks });
  return animations.length - 1;
}
const P = { x: K.x, y: K.y, rot: K.rotation, sx: K.scaleX, sy: K.scaleY, op: K.opacity };
// pequena ajuda: cria trilhas de um nó a partir de funções por propriedade
function tr(list, rigOf, level, fns) {
  const id = rigOf[level];
  for (const [prop, fn] of Object.entries(fns)) list.push([id, P[prop], fn]);
}
const scaleBoth = (fn) => ({ sx: fn, sy: fn });

// ---------- ambiente: 12 s, ciclos inteiros ----------
const LOOP = 12;
const ambient = [];
const amb = (name, fns) => tr(ambient, R[name], "a", fns);
// respiração do corpo: o pivô é o chão, então ele cresce para cima e a base não se mexe
amb("corpo", {
  // o corpo é um sólido: respira subindo e descendo, quase sem escala, para não parecer esticado
  y: (t) => -2.5 * osc(t, 3),
  sy: (t) => 1 + 0.003 * osc(t, 3),
  sx: (t) => 1 - 0.0015 * osc(t, 3),
  rot: (t) => 0.005 * osc(t, 12),
  x: (t) => 1 * osc(t, 6),
});
// as mãos apertam o chão de leve, uma de cada vez
amb("maoE", {
  sy: (t) => 1 + 0.02 * osc(t, 3, 0.12),
  sx: (t) => 1 - 0.008 * osc(t, 3, 0.12),
  rot: (t) => 0.006 * osc(t, 6, 0.1),
});
amb("maoD", {
  sy: (t) => 1 + 0.02 * osc(t, 3, 0.62),
  sx: (t) => 1 - 0.008 * osc(t, 3, 0.62),
  rot: (t) => -0.006 * osc(t, 6, 0.6),
});
// piscadas (uma dupla) e dois batimentos de coração nos olhos
for (const side of ["olhoE", "olhoD"]) {
  amb(side, {
    sy: (t) =>
      Math.max(
        EPS,
        (1 - 0.93 * Math.max(blinkAt(t, 2.4), blinkAt(t, 8.1), blinkAt(t, 8.45))) *
          (1 + 0.09 * (heartbeat(t, 5) + heartbeat(t, 10.2))),
      ),
    sx: (t) => 1 + 0.07 * (heartbeat(t, 5) + heartbeat(t, 10.2)),
    x: (t) => 1.5 * osc(t, 6, 0.1),
  });
}
amb("boca", {
  sx: (t) => 1 + 0.014 * osc(t, 6) + 0.03 * heartbeat(t, 5),
  sy: (t) => 1 + 0.03 * osc(t, 3, 0.1) + 0.06 * heartbeat(t, 5),
});
const floaty = (name, period, ampY, ampRot, phase) =>
  amb(name, {
    y: (t) => ampY * osc(t, period, phase),
    rot: (t) => ampRot * osc(t, period * 2, phase + 0.2),
  });
floaty("mais", 6, 7, 0.06, 0.0);
floaty("divisao", 4, 5, 0.06, 0.3);
// O sinal e o brilho original são uma peça só (a borda do sinal está no brilho), então só o grupo
// se mexe. O halo respira por uma cópia sem borda, por trás, que infla e acende de leve.
amb("mais", { ...scaleBoth((t) => 1 + 0.035 * osc(t, 3, 0.3)) });
amb("divisao", { ...scaleBoth((t) => 1 + 0.025 * osc(t, 4, 0.1)) });
const breathe = (t, period) => (1 - Math.cos((TAU * t) / period)) / 2;
amb("maisPulso", { ...scaleBoth((t) => 1 + 0.07 * breathe(t, 3)) });
amb("divPulso", { ...scaleBoth((t) => 1 + 0.07 * breathe(t, 4)) });
ambient.push([PIC.pulsePlus, P.op, (t) => 0.5 * breathe(t, 3)]);
ambient.push([PIC.pulseDiv, P.op, (t) => 0.5 * breathe(t, 4)]);
const A_AMBIENTE = anim("ambiente", LOOP, 30, 1, ambient);

// ---------- reações (clique) ----------
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
const A_PULO = reactAnim("pulo", 1.4, (r) => {
  const air = (t) => arc(t, 0.2, 0.7, 12);
  r("personagem", {
    y: (t) => -air(t),
    sy: (t) => {
      if (t < 0.2) return 1 - 0.035 * smooth(0, 0.2, t);
      if (t < 0.7) return 0.965 + 0.06 * smooth(0.2, 0.3, t) - 0.035 * smooth(0.55, 0.7, t);
      return 1 + spring(t, 0.7, -0.035, 24, 7);
    },
    sx: (t) => {
      if (t < 0.2) return 1 + 0.018 * smooth(0, 0.2, t);
      if (t < 0.7) return 1.018 - 0.025 * smooth(0.2, 0.3, t) + 0.012 * smooth(0.55, 0.7, t);
      return 1 - spring(t, 0.7, -0.015, 24, 7);
    },
  });
  for (const side of ["olhoE", "olhoD"])
    r(
      side,
      scaleBoth((t) => 1 + 0.12 * Math.sin(Math.PI * smooth(0.2, 1.0, t))),
    );
  r("boca", { sy: (t) => 1 + 0.18 * Math.sin(Math.PI * smooth(0.25, 1.0, t)) });
  for (const [name, d] of [
    ["mais", 0],
    ["divisao", 0.06],
  ])
    r(name, {
      ...scaleBoth((t) => 1 + 0.13 * Math.sin(Math.PI * smooth(0.25 + d, 1.05 + d, t))),
      y: (t) => -9 * Math.sin(Math.PI * smooth(0.25 + d, 1.0 + d, t)),
    });
});
const A_BALANCO = reactAnim("balanco", 1.7, (r) => {
  const env = (t) => smooth(0, 0.15, t) * (1 - smooth(1.2, 1.7, t));
  r("personagem", { rot: (t) => 0.028 * env(t) * Math.sin(TAU * (t / 0.7)) });
  r("corpo", { sx: (t) => 1 + 0.012 * env(t) * Math.sin(TAU * (t / 0.7) + 1.2) });
  r("maoE", { sy: (t) => 1 - 0.03 * env(t) * Math.max(0, Math.sin(TAU * (t / 0.7))) });
  r("maoD", { sy: (t) => 1 - 0.03 * env(t) * Math.max(0, -Math.sin(TAU * (t / 0.7))) });
  for (const side of ["olhoE", "olhoD"])
    r(
      side,
      scaleBoth((t) => 1 + 0.08 * env(t)),
    );
  r("mais", { rot: (t) => 0.1 * env(t) * Math.sin(TAU * (t / 0.7) + 1) });
  r("divisao", { rot: (t) => -0.09 * env(t) * Math.sin(TAU * (t / 0.7) + 1) });
});
const A_CORACAO = reactAnim("coracao", 1.8, (r) => {
  const beat = (t) => heartbeat(t, 0.1) + heartbeat(t, 0.75);
  for (const side of ["olhoE", "olhoD"])
    r(side, {
      sx: (t) => 1 + 0.28 * beat(t),
      sy: (t) => 1 + 0.28 * beat(t),
    });
  r("boca", { sx: (t) => 1 + 0.05 * beat(t), sy: (t) => 1 + 0.22 * beat(t) });
  r("personagem", { sy: (t) => 1 + 0.01 * beat(t), sx: (t) => 1 - 0.004 * beat(t) });
  r("mais", {
    rot: (t) => TAU * smooth(0.1, 1.3, t),
    ...scaleBoth((t) => 1 + 0.1 * bump(t, 0.1, 1.3)),
  });
  r("divisao", {
    rot: (t) => -0.35 * Math.sin(Math.PI * smooth(0.15, 1.4, t)),
    ...scaleBoth((t) => 1 + 0.1 * bump(t, 0.15, 1.3)),
  });
});
const A_REPOUSO = anim("repouso", 0.5, 30, 1, [[R.personagem.r, K.y, () => 0]]);

// ---------- olhar: inclinação para o ponteiro (-1 a 1) ----------
const lean = (name, x) => {
  const list = [];
  const l = (n, fns) => tr(list, R[n], "l", fns);
  l("corpo", { rot: () => 0.012 * x, x: () => 2.5 * x });
  l("personagem", { rot: () => 0.005 * x });
  l("olhoE", { x: () => 7 * x });
  l("olhoD", { x: () => 7 * x });
  l("boca", { x: () => 5 * x });
  l("maoE", { x: () => 0.5 * x });
  l("maoD", { x: () => 0.5 * x });
  l("mais", { x: () => -5 * x });
  l("divisao", { x: () => -6 * x });
  return anim(name, 0.5, 30, 1, list);
};
const A_OLHAR_E = lean("olhar-esquerda", -1);
const A_OLHAR_C = lean("olhar-centro", 0);
const A_OLHAR_D = lean("olhar-direita", 1);

// ---------- estresse (somente verificação): poses extremas somadas, uma por segundo ----------
// PEEK_STRESS=1 acrescenta a animação "estresse"; o arquivo publicado nunca a inclui.
if (process.env["PEEK_STRESS"]) {
  const poses = [];
  for (const body of [-0.02, 0.02])
    for (const squash of [0.93, 1.07]) poses.push({ body, squash, hand: 0.01 });
  poses.push({ body: 0, squash: 1, hand: -0.01 });
  const at = (t) => poses[Math.min(poses.length - 1, Math.round(t))];
  const list = [];
  list.push([R.corpo.l, K.rotation, (t) => at(t).body]);
  list.push([R.personagem.r, K.scaleY, (t) => at(t).squash]);
  list.push([R.personagem.r, K.scaleX, (t) => 2 - at(t).squash]);
  list.push([R.maoE.l, K.rotation, (t) => at(t).hand]);
  list.push([R.maoD.l, K.rotation, (t) => -at(t).hand]);
  animations.push({ name: "estresse", frames: poses.length - 1, fps: 1, loop: 0, tracks: list });
}

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
for (const id of [A_PULO, A_BALANCO, A_CORACAO]) {
  animState(id);
  goNow(3);
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
