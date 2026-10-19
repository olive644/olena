// Gera public/pomodoro-tomato/tomato.riv a partir das camadas de art.cjs: o tomate inteiro, um
// estagio por mordida, a peca arrancada, a folha e as particulas. A maquina de estados
// "Tomate" tem a entrada numerica "etapa" (0 a 8, a mordida em que o tempo esta): cada aumento toca
// a animacao da mordida seguinte; voltar a 0 faz o tomate brotar de novo. Formato binario do
// runtime oficial do Rive, versao 7. Uso: node scripts/tomato-rive/generate.cjs
const fs = require("fs");
const path = require("path");
const LAYERS = path.join(__dirname, "layers");
const OUTPUT =
  process.env["TOMATO_OUT"] ??
  path.join(__dirname, "..", "..", "public", "pomodoro-tomato", "tomato.riv");
const meta = JSON.parse(fs.readFileSync(path.join(LAYERS, "layers.json"), "utf8"));
const layers = meta.layers;
const BITES = meta.bites;

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

const OP = { equal: 0, greater: 5 };

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
// margem em volta da arte para o pedaço arrancado e as migalhas voarem sem serem cortadas
const MARGIN = { x: 150, top: 90, bottom: 70 };
comp(T.Artboard, [
  [K.name, S, "Tomate"],
  [K.width, D, meta.width + MARGIN.x * 2],
  [K.height, D, meta.height + MARGIN.top + MARGIN.bottom],
]);
function node(parent, name, x = 0, y = 0, extra = []) {
  return comp(T.Node, [
    [K.name, S, name],
    [K.parentId, U, parent],
    [K.x, D, x],
    [K.y, D, y],
    ...extra,
  ]);
}
// Cada peca: p (so posiciona), r (reacao) e a (ambiente); os filhos entram em a.
function rig(parent, name, pivot, parentPivot, opacity = 1) {
  const p = node(parent, name + "-posicao", pivot[0] - parentPivot[0], pivot[1] - parentPivot[1]);
  const r = node(p, name + "-reacao", 0, 0, opacity === 1 ? [] : [[K.opacity, D, opacity]]);
  const a = node(r, name + "-ambiente");
  return { p, r, a, pivot };
}
const pictures = [];
function picture(parentNode, name, layerName, pivot, opacity = 1) {
  pictures.push({ parentNode, name, layerName, pivot, opacity });
  return name;
}
const imageIds = {};
function emitPicture({ parentNode, name, layerName, pivot, opacity }) {
  const L = layers[layerName];
  imageIds[name] = comp(T.Image, [
    [K.name, S, name],
    [K.parentId, U, parentNode],
    [K.imageAssetId, U, ASSET_ORDER.indexOf(layerName)],
    [K.x, D, L.x0 + L.w / 2 - pivot[0]],
    [K.y, D, L.y0 + L.h / 2 - pivot[1]],
    ...(opacity === 1 ? [] : [[K.opacity, D, opacity]]),
  ]);
}

const ZERO = [0, 0];
const root = node(0, "raiz", MARGIN.x, MARGIN.top);
const C = meta.center;
const corpo = rig(root, "corpo", C, ZERO);
for (let k = 0; k <= BITES; k++) picture(corpo.a, "estagio" + k, "estagio" + k, C, k === 0 ? 1 : 0);
// pecas arrancadas: cada uma e uma peca com o mesmo lugar do estagio de onde sai
const pieces = [];
for (let k = 0; k < BITES; k++) {
  const L = layers["peca" + k];
  const pivot = [L.x0 + L.w / 2, L.y0 + L.h / 2];
  const r = rig(corpo.a, "peca" + k, pivot, C, 0);
  picture(r.a, "peca" + k, "peca" + k, pivot);
  pieces.push(r);
}
const LF = layers.folha;
const folhaPivot = [LF.x0 + LF.w / 2, LF.y0 + LF.h * 0.75];
const folha = rig(corpo.a, "folha", folhaPivot, C);
picture(folha.a, "folha", "folha", folhaPivot);
// minhoca sob o relogio: gomos em fila (cada um com o seu pivo), olhos e boca presos a cabeca
const wormRigs = [];
for (let i = 0; layers["minhoca" + i]; i++) {
  const L = layers["minhoca" + i];
  const pivot = [L.x0 + L.w / 2, L.y0 + L.h / 2];
  const r = rig(root, "minhoca" + i, pivot, ZERO);
  picture(r.a, "minhoca" + i, "minhoca" + i, pivot);
  wormRigs.push(r);
}
const wormHead = wormRigs[wormRigs.length - 1];
const wormFace = {};
for (const part of ["olhos", "boca"]) {
  const L = layers["minhoca-" + part];
  const pivot = [L.x0 + L.w / 2, L.y0 + L.h / 2];
  wormFace[part] = rig(wormHead.a, "minhoca-" + part, pivot, wormHead.pivot);
  picture(wormFace[part].a, "minhoca-" + part, "minhoca-" + part, pivot);
}
// particulas (soltas na raiz, sem herdar o amasso do tomate)
const bits = [];
function addBits(kind, count) {
  for (let i = 0; i < count; i++) {
    const r = rig(root, `${kind}-${i}`, ZERO, ZERO, 0);
    const L = layers[kind];
    picture(r.a, `${kind}-${i}`, kind, [L.x0 + L.w / 2, L.y0 + L.h / 2]);
    bits.push({ kind, i, r });
  }
}
addBits("migalha", 6);
addBits("semente", 4);
addBits("gota", 4);
addBits("brilho", 3);
// ordem de pintura: a lista de camadas vai de tras para frente; o Rive pinta primeiro o que vem
// primeiro no arquivo, entao as imagens saem da frente para tras
const order = (p) => {
  if (p.name.startsWith("estagio")) return 0 + Number(p.name.slice(7)) * 0.01;
  if (p.name.startsWith("peca")) return 1;
  if (p.name === "minhoca-olhos" || p.name === "minhoca-boca") return 1.9;
  if (p.name.startsWith("minhoca")) return 1.5 + Number(p.name.slice(7)) * 0.01;
  if (p.name === "folha") return 2;
  return 4;
};
pictures.sort((a, b) => order(b) - order(a));
for (const p of pictures) emitPicture(p);

// ---------- curvas ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const outCubic = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const outBack = (x) => {
  const t = clamp(x, 0, 1) - 1;
  return 1 + 2.70158 * t * t * t + 1.70158 * t * t;
};
const osc = (t, period, phase = 0) => Math.sin(TAU * (t / period + phase)) - Math.sin(TAU * phase);
const spring = (t, t0, amp, freq, decay) =>
  t < t0 ? 0 : amp * Math.exp(-decay * (t - t0)) * Math.cos(freq * (t - t0));
const EPS = 0.0001;
const P = { x: K.x, y: K.y, rot: K.rotation, sx: K.scaleX, sy: K.scaleY, op: K.opacity };
const animations = [];
function anim(name, seconds, fps, loop, tracks) {
  animations.push({ name, frames: Math.max(1, Math.round(seconds * fps)), fps, loop, tracks });
  return animations.length - 1;
}
const track = (list, id, prop, fn) => list.push([id, P[prop], fn]);
const stageOpacity = (list, shown, fnOverride = {}) => {
  for (let k = 0; k <= BITES; k++)
    track(list, imageIds["estagio" + k], "op", fnOverride[k] ?? (() => (k === shown ? 1 : 0)));
};
const hideEffects = (list) => {
  // zera tudo o que a mordida mexe: o fim de cada animacao deixa o repouso
  for (const part of [...pieces, ...bits.map((b) => b.r)]) track(list, part.r, "op", () => 0);
};

// ---------- ambiente ----------
// Parado, o tomate respira e balanca devagar e a folha acompanha; a minhoca ondula em onda da
// cauda para a cabeca, pisca e mastiga de leve. Tudo em ciclos de 12 s para repetir sem emenda.
const ambient = [];
track(ambient, corpo.a, "sy", (t) => 1 + 0.03 * osc(t, 3));
track(ambient, corpo.a, "sx", (t) => 1 - 0.02 * osc(t, 3));
track(ambient, corpo.a, "y", (t) => -5 * osc(t, 3, 0.25));
track(ambient, corpo.a, "rot", (t) => 0.022 * osc(t, 6));
track(ambient, folha.a, "rot", (t) => 0.1 * osc(t, 3, 0.1) + 0.04 * osc(t, 4));
const wave = (t, i) => Math.sin(TAU * (t / 2.4 - i * 0.11));
wormRigs.forEach((w, i) => {
  track(ambient, w.a, "y", (t) => 7 * (wave(t, i) - wave(0, i)));
  track(
    ambient,
    w.a,
    "rot",
    (t) => 0.07 * (Math.cos(TAU * (t / 2.4 - i * 0.11)) - Math.cos(TAU * -i * 0.11)),
  );
  track(
    ambient,
    w.a,
    "sx",
    (t) => 1 + 0.045 * (Math.cos(TAU * (t / 2.4 - i * 0.11)) - Math.cos(TAU * -i * 0.11)),
  );
  track(
    ambient,
    w.a,
    "sy",
    (t) => 1 - 0.045 * (Math.cos(TAU * (t / 2.4 - i * 0.11)) - Math.cos(TAU * -i * 0.11)),
  );
});
// piscada (duas vezes por ciclo, uma dupla) e mastigada
const blink = (t, at) => Math.max(0, 1 - Math.abs(t - at) / 0.09);
track(ambient, wormFace.olhos.a, "sy", (t) =>
  Math.max(0.08, 1 - 0.92 * Math.max(blink(t, 3.1), blink(t, 8.6), blink(t, 9.1))),
);
track(ambient, wormFace.boca.a, "sy", (t) => 1 + 0.35 * Math.max(0, Math.sin(TAU * (t / 2.4))));
track(ambient, wormFace.boca.a, "y", (t) => 1.5 * Math.max(0, Math.sin(TAU * (t / 2.4))));
const A_AMBIENTE = anim("ambiente", 12, 15, 1, ambient);

// ---------- repouso de cada etapa ----------
const holds = [];
for (let k = 0; k <= BITES; k++) {
  const list = [];
  stageOpacity(list, k);
  holds.push(anim("etapa-" + k, 0.5, 30, 1, list));
}

// ---------- mordidas ----------
const FPS = 60;
const BITE_SECONDS = 1.0;
const T_OPEN = 0.12,
  T_SNAP = 0.2,
  T_SWAP = 0.22;
const bite = [];
for (let k = 0; k < BITES; k++) {
  const info = meta.biteInfo[k];
  const [cx, cy] = info.center;
  const d = info.dir;
  const u = [-d[0], -d[1]];
  const rot0 = Math.atan2(u[1], u[0]);
  const list = [];
  // estagios: troca seca no instante da mordida
  stageOpacity(list, k, {
    [k]: (t) => (t < T_SWAP ? 1 : 0),
    [k + 1]: (t) => (t < T_SWAP ? 0 : 1),
  });
  // peca arrancada: salta do tomate para fora, gira e cai desfazendo-se
  const piece = pieces[k];
  const fly = (t) => Math.max(0, t - T_SWAP);
  track(list, piece.r, "op", (t) =>
    t < T_SWAP ? 0 : fly(t) < 0.45 ? 1 : 1 - smooth(0.45, 0.6, fly(t)),
  );
  track(list, piece.r, "x", (t) => d[0] * 260 * outCubic(Math.min(1, fly(t) / 0.5)));
  track(
    list,
    piece.r,
    "y",
    (t) => d[1] * 260 * outCubic(Math.min(1, fly(t) / 0.5)) - 150 * fly(t) + 900 * fly(t) * fly(t),
  );
  track(list, piece.r, "sx", (t) => 1 - 0.55 * smooth(0, 0.55, fly(t)));
  track(list, piece.r, "sy", (t) => 1 - 0.55 * smooth(0, 0.55, fly(t)));
  track(list, piece.r, "rot", (t) => (d[0] >= 0 ? 1 : -1) * 3.2 * fly(t));
  // tomate: amassa, recua e balanca
  track(list, corpo.r, "x", (t) => spring(t, T_SWAP, -d[0] * 14, 24, 7));
  track(list, corpo.r, "y", (t) => spring(t, T_SWAP, -d[1] * 14, 24, 7));
  track(list, corpo.r, "rot", (t) => spring(t, T_SWAP, 0.05 * (d[0] >= 0 ? -1 : 1), 22, 6));
  track(list, corpo.r, "sx", (t) =>
    t < T_SNAP ? 1 + 0.02 * smooth(T_OPEN, T_SNAP, t) : 1 + spring(t, T_SWAP, -0.05, 26, 8),
  );
  track(list, corpo.r, "sy", (t) =>
    t < T_SNAP ? 1 - 0.015 * smooth(T_OPEN, T_SNAP, t) : 1 + spring(t, T_SWAP, 0.045, 26, 8),
  );
  track(list, folha.r, "rot", (t) => spring(t, T_SWAP, 0.16, 20, 4.5));
  // particulas: tiro balistico a partir da mordida
  bits.forEach((b, idx) => {
    const base = Math.atan2(d[1], d[0]);
    const spread = ((idx * 2.399) % 1) * 2 - 1;
    const ang = base + spread * 1.15;
    const speed = 260 + ((idx * 0.618) % 1) * 300 + (b.kind === "brilho" ? -120 : 0);
    const vx = Math.cos(ang) * speed,
      vy = Math.sin(ang) * speed - 140;
    const g = b.kind === "brilho" ? 0 : 1500;
    const life = b.kind === "brilho" ? 0.45 : 0.7;
    const st = (t) => Math.max(0, t - T_SWAP);
    const s0 =
      b.kind === "migalha"
        ? 0.9
        : b.kind === "semente"
          ? 1
          : b.kind === "gota"
            ? 1
            : 1.5 + (k === BITES - 1 ? 0.5 : 0);
    track(list, b.r.r, "x", (t) => cx + (b.kind === "brilho" ? vx * st(t) * 0.35 : vx * st(t)));
    track(
      list,
      b.r.r,
      "y",
      (t) => cy + (b.kind === "brilho" ? vy * st(t) * 0.35 : vy * st(t) + 0.5 * g * st(t) * st(t)),
    );
    track(list, b.r.r, "rot", (t) => st(t) * (idx % 2 ? 9 : -9));
    track(list, b.r.r, "sx", (t) =>
      Math.max(
        EPS,
        s0 *
          (b.kind === "brilho"
            ? Math.sin(Math.PI * Math.min(1, st(t) / life))
            : 1 - (0.3 * st(t)) / life),
      ),
    );
    track(list, b.r.r, "sy", (t) =>
      Math.max(
        EPS,
        s0 *
          (b.kind === "brilho"
            ? Math.sin(Math.PI * Math.min(1, st(t) / life))
            : 1 - (0.3 * st(t)) / life),
      ),
    );
    track(list, b.r.r, "op", (t) =>
      t < T_SWAP ? 0 : st(t) < life ? 1 - smooth(life * 0.6, life, st(t)) : 0,
    );
  });
  bite.push(anim("mordida-" + k, BITE_SECONDS, FPS, 0, list));
}
// brotar de novo
const REGROW = (() => {
  const list = [];
  stageOpacity(
    list,
    0,
    Object.fromEntries(Array.from({ length: BITES + 1 }, (_, k) => [k, () => (k === 0 ? 1 : 0)])),
  );
  hideEffects(list);
  track(list, corpo.r, "sx", (t) => Math.max(EPS, 0.35 + 0.65 * outBack(t / 0.6)));
  track(list, corpo.r, "sy", (t) => Math.max(EPS, 0.35 + 0.65 * outBack(t / 0.6)));
  track(list, corpo.r, "rot", (t) => spring(t, 0.15, 0.08, 16, 5));
  track(list, folha.r, "rot", (t) => spring(t, 0.3, 0.2, 18, 4));
  bits
    .filter((b) => b.kind === "brilho")
    .forEach((b, i) => {
      const ang = -Math.PI / 2 + (i - 1) * 1.0;
      track(list, b.r.r, "x", (t) => C[0] + Math.cos(ang) * 170 * outCubic(t / 0.6));
      track(list, b.r.r, "y", (t) => C[1] - 20 + Math.sin(ang) * 150 * outCubic(t / 0.6));
      track(list, b.r.r, "sx", (t) =>
        Math.max(EPS, 1.6 * Math.sin(Math.PI * clamp(t / 0.7, 0, 1))),
      );
      track(list, b.r.r, "sy", (t) =>
        Math.max(EPS, 1.6 * Math.sin(Math.PI * clamp(t / 0.7, 0, 1))),
      );
      track(list, b.r.r, "op", (t) => (t < 0.05 || t > 0.7 ? 0 : 1));
    });
  return anim("brotar", 0.9, FPS, 0, list);
})();

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
// maquina de estados: entrada "etapa"
writeObj(T.StateMachine, [[K.animName, S, "Tomate"]]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "etapa"],
  [K.numValue, D, 0],
]);
// "instante": com ele ligado, a etapa muda sem tocar as mordidas (abrir a tela no meio do tempo)
writeObj(59, [[K.smName, S, "instante"]]);
const BOOL_CONDITION = 71;
const jump = (to, value) => {
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.tDuration, U, 0],
  ]);
  writeObj(BOOL_CONDITION, [
    [K.inputId, U, 1],
    [K.opValue, U, 0],
  ]);
  writeObj(NUMBER_CONDITION, [
    [K.inputId, U, 0],
    [K.opValue, U, OP.equal],
    [CONDITION_VALUE, D, value],
  ]);
};
const goNow = (to) =>
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.flags, U, 4 | 8],
    [K.exitTime, U, 100],
    [K.tDuration, U, 0],
  ]);
const when = (to, op, value) => {
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.tDuration, U, 0],
  ]);
  writeObj(NUMBER_CONDITION, [
    [K.inputId, U, 0],
    [K.opValue, U, op],
    [CONDITION_VALUE, D, value],
  ]);
};
const always = (to) =>
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.tDuration, U, 0],
  ]);
const animState = (id) => writeObj(T.AnimationState, [[K.animationId, U, id]]);
// camada Estagio: 0 entrada 1 qualquer 2 saida; 3..11 etapas 0..8; 12..19 mordidas 0..7; 20 brotar
const S_ID = (k) => 3 + k;
const B_ID = (k) => 12 + k;
const R_ID = 20;
writeObj(T.StateMachineLayer, [[K.smName, S, "Estagio"]]);
writeObj(T.EntryState, []);
for (let j = BITES; j >= 1; j--) when(S_ID(j), OP.equal, j);
always(S_ID(0));
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
for (let k = 0; k <= BITES; k++) {
  animState(holds[k]);
  for (let j = 1; j <= BITES; j++) if (j !== k) jump(S_ID(j), j);
  if (k > 0) when(R_ID, OP.equal, 0);
  if (k < BITES) when(B_ID(k), OP.greater, k);
}
for (let k = 0; k < BITES; k++) {
  animState(bite[k]);
  for (let j = 1; j <= BITES; j++) jump(S_ID(j), j);
  when(R_ID, OP.equal, 0);
  goNow(S_ID(k + 1));
}
animState(REGROW);
for (let j = 1; j <= BITES; j++) jump(S_ID(j), j);
goNow(S_ID(0));
// camada Ambiente
writeObj(T.StateMachineLayer, [[K.smName, S, "Ambiente"]]);
writeObj(T.EntryState, []);
always(3);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
animState(A_AMBIENTE);

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
