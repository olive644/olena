// Gera public/olena-reading/olena.riv: a Olena lendo do onboarding (camadas de slice.cjs), montada
// em papel recortado. Cada peça é uma imagem rígida dentro de três nós aninhados no mesmo pivô
// (posição, reação e ambiente), para as camadas da máquina de estados não disputarem propriedades.
// Formato binário do runtime oficial do Rive, versão 7. No repouso (t = 0) a soma das peças é a
// arte original, então trocar a imagem estática pelo canvas não tem salto.
// Uso: node scripts/olena-reading-rive/generate.cjs
// OLENA_STRESS=1 OLENA_OUT=<arquivo> acrescenta a animação "estresse" (poses extremas, só para
// verificar frestas); o arquivo publicado nunca a inclui.
const fs = require("fs");
const path = require("path");
const LAYERS = path.join(__dirname, "layers");
const OUTPUT =
  process.env["OLENA_OUT"] ??
  path.join(__dirname, "..", "..", "public", "olena-reading", "olena.riv");
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
const U = "u";
const D = "d";
const S = "s";
const BY = "y";
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
};
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
// folga de PAD px em volta da arte: a cauda, as orelhas e a estrela saem um pouco do quadro da
// imagem quando se mexem e seriam cortadas na borda. A arte fica em (PAD, PAD) dentro do quadro.
const PAD = 40;
comp(T.Artboard, [
  [K.name, S, "Olena"],
  [K.width, D, meta.width + 2 * PAD],
  [K.height, D, meta.height + 2 * PAD],
]);
function node(parent, name, x = 0, y = 0) {
  return comp(T.Node, [
    [K.name, S, name],
    [K.parentId, U, parent],
    [K.x, D, x],
    [K.y, D, y],
  ]);
}
// p (posiciona, nunca é animado), r (reação ao clique) e a (ambiente). Os filhos entram no nó a.
function rig(parent, name, pivot, parentPivot) {
  const p = node(parent, name + "-posicao", pivot[0] - parentPivot[0], pivot[1] - parentPivot[1]);
  const r = node(p, name + "-reacao");
  const a = node(r, name + "-ambiente");
  return { p, r, a, pivot };
}
const pictures = [];
const PIC = {};
const root = node(0, "raiz", PAD, PAD);
const R = {};
const ZERO = [0, 0];
function part(parentRig, name, layerName, pivot) {
  const parent = parentRig ? parentRig.a : root;
  const r = rig(parent, name, pivot ?? layers[layerName].pivot, parentRig ? parentRig.pivot : ZERO);
  if (layerName) pictures.push([r, layerName]);
  R[name] = r;
  return r;
}
// Hierarquia: a personagem inteira pula; o corpo respira (cabeça, orelhas, olhos e cauda vão
// junto); o livro balança com as patas e a folha; os pés ficam no chão.
const olena = part(null, "olena", null, [300, 598]);
const corpo = part(olena, "corpo", "body");
const cauda = part(corpo, "cauda", "tail");
part(cauda, "caudaPonta", "tailTip");
part(corpo, "orelhaE", "earL");
const orelhaD = part(corpo, "orelhaD", "earR");
part(orelhaD, "estrela", "star");
const olhoE = part(corpo, "olhoE", "eyeL");
part(olhoE, "pupilaE", "pupilL");
part(olhoE, "palpebraBaixoE", "lidLowL");
part(olhoE, "palpebraE", "lidUpL");
part(corpo, "olhoDFundo", "eyeRBack");
const olhoD = part(corpo, "olhoD", "eyeR");
part(olhoD, "pupilaD", "pupilR");
part(olhoD, "palpebraBaixoD", "lidLowR");
part(olhoD, "palpebraD", "lidUpR");
const livro = part(olena, "livro", "book");
const folha1 = part(livro, "folha1", "page1");
const folha2 = part(folha1, "folha2", "page2");
part(folha2, "folha3", "page3");
part(livro, "pataE", "pawL");
part(livro, "sombraPataD", "pawRShadow");
part(livro, "pataD", "pawR");
part(olena, "peE", "footL");
part(olena, "peD", "footR");

// No Rive o primeiro desenhável do arquivo fica por cima: imagens da frente para trás.
const ORDER = meta.order;
pictures.sort((a, b) => ORDER.indexOf(b[1]) - ORDER.indexOf(a[1]));
for (const [rigOf, layerName] of pictures) {
  const L = layers[layerName];
  PIC[layerName] = comp(T.Image, [
    [K.name, S, layerName],
    [K.parentId, U, rigOf.a],
    [K.imageAssetId, U, ASSET_ORDER.indexOf(layerName)],
    [K.x, D, L.x0 + L.w / 2 - rigOf.pivot[0]],
    [K.y, D, L.y0 + L.h / 2 - rigOf.pivot[1]],
    ...(L.hidden ? [[K.opacity, D, 0]] : []),
  ]);
}

// ---------- curvas ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const ease = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
// oscilação periódica que vale zero em t = 0 (o repouso é a arte original)
const osc = (t, period, phase = 0) => Math.sin(TAU * (t / period + phase)) - Math.sin(TAU * phase);
// mola amortecida que começa em t0 com deslocamento amp
const spring = (t, t0, amp, freq, decay) =>
  t < t0 ? 0 : amp * Math.exp(-decay * (t - t0)) * Math.cos(freq * (t - t0));
// gesto rápido: vai a 1 em `up` segundos e volta com um sobressinal amortecido
const flick = (t, t0, up = 0.08, freq = 26, decay = 9) => {
  if (t < t0) return 0;
  if (t < t0 + up) return smooth(t0, t0 + up, t);
  return Math.exp(-decay * (t - t0 - up)) * Math.cos(freq * (t - t0 - up));
};
const blinkAt = (t, at) => {
  const b = t - at;
  if (b < 0 || b > 0.24) return 0;
  return b < 0.08 ? smooth(0, 0.08, b) : 1 - smooth(0.11, 0.24, b);
};
const bump = (t, a, d) => {
  const u = (t - a) / d;
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2;
};

const animations = [];
function anim(name, seconds, fps, loop, tracks) {
  animations.push({ name, frames: Math.max(1, Math.round(seconds * fps)), fps, loop, tracks });
  return animations.length - 1;
}
const P = { x: K.x, y: K.y, rot: K.rotation, sx: K.scaleX, sy: K.scaleY, op: K.opacity };
function tr(list, rigOf, level, fns) {
  for (const [prop, fn] of Object.entries(fns)) list.push([rigOf[level], P[prop], fn]);
}

// ---------- ambiente: 12 s, todos os períodos dividem 12 ----------
const LOOP = 12;
let ambient = [];
const amb = (name, fns) => tr(ambient, R[name], "a", fns);

// Leitura: a pupila percorre a linha da esquerda para a direita e volta rápido no começo da linha
// seguinte; quatro linhas, a folha vira, mais duas linhas, e ela olha para quem está vendo.
const LINES = [
  [0.5, 1.7],
  [1.9, 3.1],
  [3.3, 4.5],
  [4.7, 5.9],
  // folha vira de 6,4 a 7,4
  [7.8, 9.0],
  [9.2, 10.4],
];
const PAGE = [6.4, 7.4];
const LOOK_UP = [10.6, 11.8];
function gaze(t) {
  // x de -1 (começo da linha) a 1 (fim); y desce uma fração por linha
  let x = 0;
  let y = 0;
  const into = smooth(0.25, 0.5, t);
  for (let k = 0; k < LINES.length; k++) {
    const [a, b] = LINES[k];
    const row = k < 4 ? k : k - 4;
    const next = LINES[k + 1];
    if (t >= a - 0.2 && t < (next ? next[0] - 0.2 : LOOK_UP[0])) {
      // volta rápida ao começo da linha (0,2 s), leitura, pausa no fim
      const back = smooth(a - 0.2, a, t);
      const read = ease(a, b, t);
      x = -1 + 2 * read;
      if (t < a) x = (k === 0 ? 0 : 1) + (-1 - (k === 0 ? 0 : 1)) * back;
      y = -0.5 + row * 0.35;
      if (t < a && k > 0) {
        const prevRow = k - 1 < 4 ? k - 1 : k - 5;
        y =
          -0.5 +
          (k === 4 ? 3 : prevRow) * 0.35 +
          (-0.5 + row * 0.35 - (-0.5 + (k === 4 ? 3 : prevRow) * 0.35)) * back;
      }
    }
  }
  // durante a virada, acompanha a folha da direita para a esquerda, um pouco para cima
  if (t >= LINES[3][1] && t < LINES[4][0] - 0.2) {
    const turn = ease(PAGE[0], PAGE[1], t);
    x = 1 - 2 * turn;
    y = 0.55 - 1.15 * Math.sin(Math.PI * turn) - 1.05 * turn;
    if (t < PAGE[0]) {
      x = 1;
      y = 0.55;
    }
    if (t > PAGE[1]) {
      x = -1;
      y = -0.5;
    }
  }
  // no fim, olha para quem está vendo (centro, um pouco para cima) e volta ao repouso
  if (t >= LINES[5][1]) {
    const up = ease(LOOK_UP[0], LOOK_UP[0] + 0.25, t);
    const rest = ease(LOOK_UP[1] - 0.1, LOOK_UP[1] + 0.15, t);
    x = 1 * (1 - up);
    y = (-0.5 + 1 * 0.35) * (1 - up) + -0.55 * up;
    x = x * (1 - rest);
    y = y * (1 - rest);
  }
  return [x * into, y * into];
}
for (const [name, dx, dy] of [
  ["pupilaE", 6, 5],
  ["pupilaD", 6, 5],
]) {
  amb(name, { x: (t) => dx * gaze(t)[0], y: (t) => dy * gaze(t)[1] });
}

// piscadas: uma simples, uma dupla depois da virada e uma ao olhar para cima
const BLINKS = [2.6, 7.55, 7.85, 11.0];
for (const name of ["olhoE", "olhoD"]) {
  amb(name, {
    sy: (t) => 1 + 0.05 * bump(t, LOOK_UP[0], 1.2),
    sx: (t) => 1 + 0.035 * bump(t, LOOK_UP[0], 1.2),
  });
}
// a piscada é das pálpebras: o olho não achata
const readingBlink = (t) => Math.max(...BLINKS.map((b) => blinkAt(t, b)));
lids(readingBlink, readingBlink);

// respiração: o pivô é o chão, então o corpo cresce para cima e a base fica parada
amb("corpo", {
  sy: (t) => 1 + 0.007 * osc(t, 4, 0.0),
  sx: (t) => 1 - 0.002 * osc(t, 4, 0.0),
  rot: (t) =>
    0.006 * osc(t, 12) - 0.012 * bump(t, PAGE[0] - 0.1, 1.3) + 0.01 * bump(t, LOOK_UP[0], 1.3),
});

// orelhas: tremidinhas rápidas, cada uma no seu tempo; a direita leva a estrela junto
amb("orelhaE", {
  rot: (t) => -0.004 * osc(t, 6, 0.1) - 0.05 * flick(t, 3.9) - 0.04 * flick(t, 9.6),
});
amb("orelhaD", {
  rot: (t) =>
    0.004 * osc(t, 6, 0.4) + 0.05 * flick(t, 1.2) + 0.06 * flick(t, 8.3) + 0.04 * flick(t, 8.6),
});
amb("estrela", {
  rot: (t) =>
    spring(t, 1.25, 0.12, 18, 5) +
    spring(t, 8.35, 0.16, 18, 5) +
    TAU * ease(LOOK_UP[0] + 0.1, LOOK_UP[0] + 1.0, t),
  sx: (t) => 1 + 0.16 * bump(t, LOOK_UP[0] + 0.1, 0.9) + 0.06 * bump(t, 5.0, 0.6),
  sy: (t) => 1 + 0.16 * bump(t, LOOK_UP[0] + 0.1, 0.9) + 0.06 * bump(t, 5.0, 0.6),
});

// cauda: balanço lento com uma chicotada na virada da folha
amb("cauda", {
  // só gira para fora (sentido horário): para dentro ela entraria atrás da borda do corpo
  rot: (t) =>
    0.09 * (1 - Math.cos((TAU * t) / 4)) + 0.1 * Math.max(0, flick(t, 6.5, 0.18, 12, 4.5)),
});
// a ponta vem atrasada em relação à base (onda que corre pela cauda) e chicoteia mais
amb("caudaPonta", {
  // quase só para fora também: para dentro abriria uma cunha no lado de dentro da curva
  rot: (t) =>
    0.1 * (1 - Math.cos((TAU * t) / 4 - 0.8)) -
    0.1 * (1 - Math.cos(0.8)) +
    0.2 * Math.max(0, flick(t, 6.62, 0.16, 12, 4)),
});

// livro: acompanha a respiração, dá um empurrãozinho para virar a folha e assenta
amb("livro", {
  y: (t) =>
    -1.2 * osc(t, 4, 0.05) - 2.5 * bump(t, PAGE[0] - 0.15, 0.6) + 1.2 * bump(t, PAGE[1] - 0.1, 0.5),
  rot: (t) => 0.004 * osc(t, 6, 0.2) - 0.012 * bump(t, PAGE[0] - 0.15, 1.2),
});
// patas: apertam o livro de leve; a direita empurra a folha
// pata esquerda: aperta o livro no ritmo das linhas e ajeita quando a folha vira
const lineBeats = (t) => LINES.reduce((acc, [a]) => acc + bump(t, a - 0.25, 0.45), 0);
amb("pataE", {
  rot: (t) => 0.035 * osc(t, 4, 0.15) - 0.1 * lineBeats(t) + 0.14 * bump(t, PAGE[1] - 0.2, 0.6),
  x: (t) => 2.5 * lineBeats(t) - 3 * bump(t, PAGE[1] - 0.2, 0.6),
  y: (t) => 1.2 * osc(t, 4, 0.3) - 4 * lineBeats(t) - 6 * bump(t, PAGE[1] - 0.2, 0.6),
});
// pata direita: sobe pela borda do livro até perto do canto, empurra a folha para a esquerda e
// volta; sobe pouco para não descobrir uma área grande atrás dela
const REACH = [PAGE[0] - 0.55, PAGE[0]];
const reach = (t) => ease(REACH[0], REACH[1], t) * (1 - ease(PAGE[0] + 0.35, PAGE[0] + 0.9, t));
const push = (t) => bump(t, PAGE[0] - 0.05, 0.5);
amb("pataD", {
  x: (t) => -4 * reach(t) - 14 * push(t),
  y: (t) => 1 * osc(t, 4, 0.6) - 40 * reach(t) - 5 * push(t) - 2.5 * lineBeats(t),
  rot: (t) => -0.03 * osc(t, 4, 0.6) - 0.2 * reach(t) - 0.15 * push(t),
});
// folha: gira em volta da lombada, da direita (deitada sobre as páginas) para a esquerda,
// encolhendo para o tamanho do bloco da esquerda; só aparece durante a virada
const PAGE_RIGHT = Math.atan2(352 - 383, 418 - 240);
const PAGE_LEFT = Math.atan2(320 - 383, 92 - 240);
// folha: gira em volta da lombada da direita para a esquerda; os gomos do meio e da ponta vêm
// atrasados (curvam para trás do movimento) e assentam do outro lado sem dobra
const turn = (t) => ease(PAGE[0], PAGE[1], t);
const PAGE_SY_END = -1;
const lift = (t) => Math.sin(Math.PI * turn(t));
amb("folha1", {
  rot: (t) => PAGE_RIGHT + (PAGE_LEFT - PAGE_RIGHT) * turn(t),
  // termina um pouco mais curta que o bloco da esquerda, para não passar da borda do livro
  sx: (t) => 1 + (0.8 - 1) * turn(t),
  // espessura: vai de um lado da lombada para o outro (o verso aparece depois da metade)
  sy: (t) => (1 + 1.2 * lift(t)) * (1 + (PAGE_SY_END - 1) * smooth(0.45, 0.55, turn(t))),
});
// atraso: positivo enquanto sobe (a ponta fica para a direita), some ao deitar do outro lado
const lag = (t) => {
  const u = turn(t);
  return Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u) ** 0.6;
};
amb("folha2", { rot: (t) => 0.22 * lag(t) });
amb("folha3", { rot: (t) => 0.3 * lag(t) });
// acende quando a ponta já saiu do bloco de páginas e apaga quando deita do outro lado
// (some antes de deitar de todo: deitada, a espessura dela não coincide com o bloco da esquerda)
const pageOp = (t) =>
  smooth(PAGE[0] + 0.02, PAGE[0] + 0.14, t) * (1 - smooth(PAGE[1] - 0.06, PAGE[1], t));
for (const name of ["page1", "page2", "page3"]) ambient.push([PIC[name], P.op, pageOp]);
// a sombra da pata direita na capa some quando a pata levanta e volta quando ela assenta
ambient.push([PIC.pawRShadow, P.op, (t) => 1 - smooth(0, 0.3, reach(t) + push(t))]);
const VARS = [{ name: "lendo", seconds: LOOP, tracks: ambient }];

// ---------- outras esperas: cada uma começa e termina no repouso, com a respiração de 4 s ----------
// curva por pontos [[t, v], ...]: suave entre os pontos e constante fora deles
const curve = (pts) => (t) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [a, va] = pts[i - 1];
      const [b, vb] = pts[i];
      return va + (vb - va) * ease(a, b, t);
    }
  }
  return pts[pts.length - 1][1];
};
const zero = () => 0;
const one = () => 1;
const tailIdle = (t) => 0.09 * (1 - Math.cos((TAU * t) / 4));
const tipIdle = (t) => 0.1 * (1 - Math.cos((TAU * t) / 4 - 0.8)) - 0.1 * (1 - Math.cos(0.8));
const blinkSet = (list) => (t) => Math.max(0, ...list.map((b) => blinkAt(t, b)));
// pálpebras dos dois olhos: up e low vão de 0 (aberto) a 1 (fechado, as duas se encontram)
function lids(up, low) {
  for (const [n, img, fn] of [
    ["palpebraE", "lidUpL", up],
    ["palpebraD", "lidUpR", up],
    ["palpebraBaixoE", "lidLowL", low],
    ["palpebraBaixoD", "lidLowR", low],
  ]) {
    amb(n, { sy: (t) => Math.max(0.001, fn(t)) });
    ambient.push([PIC[img], P.op, (t) => (fn(t) > 0.004 ? 1 : 0)]);
  }
}
// o = funções opcionais por parte; o que não vier fica no repouso (mais a respiração)
function variation(name, seconds, o) {
  ambient = [];
  const f = (key, fallback) => o[key] ?? fallback;
  const blink = blinkSet(o.blinks ?? []);
  const gx = f("gx", zero);
  const gy = f("gy", zero);
  for (const n of ["pupilaE", "pupilaD"]) amb(n, { x: (t) => 6 * gx(t), y: (t) => 5 * gy(t) });
  for (const n of ["olhoE", "olhoD"])
    amb(n, { sy: (t) => f("eyeSy", one)(t), sx: (t) => f("eyeSx", one)(t) });
  lids(
    (t) => Math.max(blink(t), f("lidUp", zero)(t)),
    (t) => Math.max(blink(t), f("lidLow", zero)(t)),
  );
  amb("corpo", {
    sy: (t) => (1 + 0.007 * osc(t, 4)) * f("bodySy", one)(t),
    sx: (t) => 1 - 0.002 * osc(t, 4),
    rot: (t) => f("bodyRot", zero)(t),
  });
  amb("orelhaE", { rot: (t) => -0.004 * osc(t, 4, 0.1) + f("earL", zero)(t) });
  amb("orelhaD", { rot: (t) => 0.004 * osc(t, 4, 0.4) + f("earR", zero)(t) });
  amb("estrela", {
    rot: (t) => f("starRot", zero)(t),
    sx: (t) => f("starS", one)(t),
    sy: (t) => f("starS", one)(t),
  });
  amb("cauda", { rot: (t) => f("tail", tailIdle)(t) });
  amb("caudaPonta", { rot: (t) => f("tip", tipIdle)(t) });
  amb("livro", {
    y: (t) => -1.2 * osc(t, 4, 0.05) + f("bookY", zero)(t),
    rot: (t) => 0.004 * osc(t, 4, 0.2) + f("bookRot", zero)(t),
  });
  amb("pataE", {
    rot: (t) => 0.03 * osc(t, 4, 0.15) + f("pawLRot", zero)(t),
    x: (t) => f("pawLX", zero)(t),
    y: (t) => 1.2 * osc(t, 4, 0.3) + f("pawLY", zero)(t),
  });
  amb("pataD", {
    rot: (t) => -0.03 * osc(t, 4, 0.6) + f("pawRRot", zero)(t),
    x: (t) => f("pawRX", zero)(t),
    y: (t) => 1 * osc(t, 4, 0.6) + f("pawRY", zero)(t),
  });
  ambient.push([PIC.pawRShadow, P.op, (t) => f("shadow", one)(t)]);
  VARS.push({ name, seconds, tracks: ambient });
}

// curiosa: olha para um lado, para o outro e para quem está vendo, com a cabeça e as orelhas junto
variation("curiosa", 8, {
  gx: curve([
    [0, 0],
    [0.3, 0],
    [0.8, -1],
    [2.2, -1],
    [2.8, 1],
    [4.3, 1],
    [4.9, 0],
    [7.4, 0],
  ]),
  gy: curve([
    [0, 0],
    [0.8, -0.2],
    [2.2, -0.2],
    [2.8, -0.3],
    [4.3, -0.3],
    [4.9, -0.75],
    [6.6, -0.75],
    [7.4, 0],
  ]),
  bodyRot: curve([
    [0, 0],
    [0.4, 0],
    [1.0, -0.022],
    [2.2, -0.022],
    [2.9, 0.022],
    [4.3, 0.022],
    [5.0, -0.026],
    [6.6, -0.026],
    [7.5, 0],
  ]),
  earL: (t) =>
    curve([
      [0, 0],
      [0.4, 0],
      [0.9, -0.06],
      [2.2, -0.06],
      [2.9, 0.05],
      [4.3, 0.05],
      [5.0, -0.03],
      [6.6, -0.03],
      [7.4, 0],
    ])(t) -
    0.05 * flick(t, 5.2),
  earR: (t) =>
    curve([
      [0, 0],
      [0.4, 0],
      [0.9, -0.05],
      [2.2, -0.05],
      [2.9, 0.06],
      [4.3, 0.06],
      [5.0, 0.04],
      [6.6, 0.04],
      [7.4, 0],
    ])(t) +
    0.05 * flick(t, 5.3),
  starRot: (t) =>
    spring(t, 1.0, -0.1, 18, 5) + spring(t, 2.95, 0.14, 18, 5) + spring(t, 5.05, -0.08, 18, 5),
  eyeSx: curve([
    [0, 1],
    [4.6, 1],
    [5.1, 1.06],
    [6.6, 1.06],
    [7.3, 1],
  ]),
  eyeSy: curve([
    [0, 1],
    [4.6, 1],
    [5.1, 1.06],
    [6.6, 1.06],
    [7.3, 1],
  ]),
  tail: (t) => tailIdle(t) + 0.1 * Math.max(0, flick(t, 3.0, 0.18, 12, 4.5)),
  tip: (t) => tipIdle(t) + 0.2 * Math.max(0, flick(t, 3.12, 0.16, 12, 4)),
  blinks: [2.45, 4.65, 6.9],
});

// cochilo: as pálpebras pesam, a cabeça e o livro caem devagar, ela fecha os olhos, acorda num
// susto (orelhas em pé, olhos arregalados, estrela girando) e olha em volta antes de voltar a ler
const sleepAmp = curve([
  [0, 1],
  [1, 1],
  [4, 0.3],
  [6.6, 0.3],
  [7.2, 1],
]);
variation("cochilo", 12, {
  // a pálpebra de cima pesa aos poucos, fecha de vez, e o susto abre os olhos arregalados
  lidUp: curve([
    [0, 0],
    [0.6, 0],
    [2.6, 0.45],
    [3.2, 0.38],
    [4.6, 0.62],
    [5.2, 0.68],
    [5.5, 1],
    [6.6, 1],
    [6.68, 0],
  ]),
  lidLow: curve([
    [0, 0],
    [4.6, 0],
    [5.2, 0.15],
    [5.5, 1],
    [6.6, 1],
    [6.68, 0],
  ]),
  eyeSy: curve([
    [0, 1],
    [6.6, 1],
    [6.7, 1.15],
    [7.6, 1],
  ]),
  eyeSx: curve([
    [0, 1],
    [6.6, 1],
    [6.7, 1.08],
    [7.6, 1],
  ]),
  gx: curve([
    [0, 0],
    [6.7, 0],
    [7.2, -0.7],
    [7.8, 0.7],
    [8.5, 0],
  ]),
  gy: curve([
    [0, 0],
    [1, 0.3],
    [5.4, 0.9],
    [6.6, 0.9],
    [6.7, -0.6],
    [8.0, -0.6],
    [9.0, 0],
  ]),
  bodySy: curve([
    [0, 1],
    [1, 1],
    [5.4, 0.982],
    [6.6, 0.982],
    [6.72, 1.012],
    [7.2, 0.997],
    [7.6, 1],
  ]),
  bodyRot: curve([
    [0, 0],
    [1, 0],
    [5.4, 0.02],
    [6.6, 0.02],
    [6.75, -0.01],
    [7.6, 0],
  ]),
  earL: (t) =>
    curve([
      [0, 0],
      [1, 0],
      [5.4, -0.06],
      [6.6, -0.06],
      [6.7, 0.02],
      [7.4, 0],
    ])(t) + spring(t, 6.7, -0.04, 20, 6),
  earR: (t) =>
    curve([
      [0, 0],
      [1, 0],
      [5.4, 0.06],
      [6.6, 0.06],
      [6.7, -0.02],
      [7.4, 0],
    ])(t) + spring(t, 6.7, 0.04, 20, 6),
  bookY: curve([
    [0, 0],
    [1, 0],
    [5.4, 3.5],
    [6.6, 3.5],
    [6.72, -2],
    [7.4, 0],
  ]),
  bookRot: curve([
    [0, 0],
    [1, 0],
    [5.4, 0.015],
    [6.6, 0.015],
    [6.75, -0.006],
    [7.4, 0],
  ]),
  starRot: curve([
    [0, 0],
    [1, 0],
    [5.4, 0.3],
    [6.6, 0.3],
    [7.7, TAU],
  ]),
  starS: (t) => 1 + 0.25 * bump(t, 6.7, 1.0),
  tail: (t) => tailIdle(t) * sleepAmp(t) + 0.12 * Math.max(0, flick(t, 6.7, 0.12, 14, 4.5)),
  tip: (t) => tipIdle(t) * sleepAmp(t) + 0.22 * Math.max(0, flick(t, 6.8, 0.12, 14, 4)),
  blinks: [8.4, 8.7, 10.8],
});

// feliz: aperta os olhos de alegria, dá pulinhos sentada, balança a cauda rápido e bate as patas
const HOPS = [0.9, 1.3, 1.7, 2.6, 3.0];
const hops = (t) => HOPS.reduce((s, h) => s + bump(t, h, 0.32), 0);
const wagEnv = (t) => smooth(0.6, 1.0, t) * (1 - smooth(3.4, 3.9, t));
const tapL = (t) => bump(t, 0.9, 0.3) + bump(t, 1.7, 0.3) + bump(t, 2.6, 0.3);
const tapR = (t) => bump(t, 1.3, 0.3) + bump(t, 3.0, 0.3);
variation("feliz", 8, {
  eyeSy: curve([
    [0, 1],
    [0.5, 1],
    [0.8, 0.5],
    [3.8, 0.5],
    [4.2, 1],
  ]),
  gy: curve([
    [0, 0],
    [0.5, 0],
    [0.8, -0.5],
    [3.8, -0.5],
    [4.3, 0],
  ]),
  bodySy: (t) => 1 + 0.022 * hops(t),
  bodyRot: (t) => 0.015 * Math.sin((TAU * t) / 0.8) * wagEnv(t),
  bookY: (t) => -3 * hops(t),
  pawLY: (t) => -5 * tapL(t),
  pawLRot: (t) => -0.08 * tapL(t),
  pawRY: (t) => -5 * tapR(t),
  pawRRot: (t) => 0.08 * tapR(t),
  shadow: (t) => 1 - 0.7 * Math.min(1, tapR(t)),
  earL: (t) => -0.06 * flick(t, 0.9) - 0.05 * flick(t, 2.6),
  earR: (t) => 0.06 * flick(t, 0.95) + 0.05 * flick(t, 2.65),
  starS: (t) => 1 + 0.2 * (bump(t, 1.0, 0.5) + bump(t, 2.7, 0.5)),
  starRot: (t) => spring(t, 1.0, 0.15, 18, 5) + spring(t, 2.7, -0.15, 18, 5),
  tail: (t) => tailIdle(t) + 0.08 * (1 - Math.cos((TAU * t) / 0.5)) * wagEnv(t),
  tip: (t) => tipIdle(t) + 0.14 * (1 - Math.cos((TAU * t) / 0.5 - 0.9)) * wagEnv(t),
  blinks: [5.2, 6.8],
});

// estrela: repara na estrela da orelha, mexe a orelha, a estrela gira e brilha, ela aperta os
// olhos contente
variation("estrela", 8, {
  gx: curve([
    [0, 0],
    [0.5, 0],
    [1.0, 0.9],
    [4.6, 0.9],
    [5.2, 0],
  ]),
  gy: curve([
    [0, 0],
    [0.5, 0],
    [1.0, -1],
    [4.6, -1],
    [5.2, 0],
  ]),
  bodyRot: curve([
    [0, 0],
    [0.6, 0],
    [1.2, 0.02],
    [4.6, 0.02],
    [5.3, 0],
  ]),
  earR: (t) => 0.07 * flick(t, 1.6) + 0.07 * flick(t, 2.1),
  earL: (t) => -0.06 * flick(t, 3.7),
  starRot: (t) =>
    spring(t, 1.65, 0.18, 18, 5) + spring(t, 2.15, 0.2, 18, 5) + TAU * ease(2.6, 3.6, t),
  starS: (t) => 1 + 0.3 * bump(t, 2.6, 1.0) + 0.12 * bump(t, 3.7, 0.5),
  eyeSx: curve([
    [0, 1],
    [2.4, 1],
    [2.8, 1.08],
    [3.8, 1.08],
    [4.3, 1],
  ]),
  eyeSy: curve([
    [0, 1],
    [2.4, 1],
    [2.8, 1.08],
    [3.8, 1.08],
    [4.3, 1],
    [5.6, 1],
    [6.0, 0.55],
    [6.8, 0.55],
    [7.2, 1],
  ]),

  tail: (t) => tailIdle(t) + 0.1 * Math.max(0, flick(t, 3.7, 0.18, 12, 4.5)),
  tip: (t) => tipIdle(t) + 0.2 * Math.max(0, flick(t, 3.82, 0.16, 12, 4)),
  blinks: [4.9],
});

// Cada espera mexe em todas as propriedades que alguma espera mexe (as que ela não usa ficam no
// repouso), então trocar de uma para outra nunca deixa uma peça presa na pose anterior.
const restOf = (objectId, prop) => {
  if (prop === K.scaleX || prop === K.scaleY) return 1;
  if (prop === K.opacity) return objectId === PIC.pawRShadow ? 1 : 0;
  if (prop === K.rotation && objectId === R.folha1.a) return PAGE_RIGHT;
  return 0;
};
const keyed = new Map();
for (const v of VARS) for (const [id, prop] of v.tracks) keyed.set(id + ":" + prop, [id, prop]);
const VAR_ANIM = {};
for (const v of VARS) {
  const have = new Set(v.tracks.map(([id, prop]) => id + ":" + prop));
  for (const [key, [id, prop]] of keyed)
    if (!have.has(key)) v.tracks.push([id, prop, () => restOf(id, prop)]);
  VAR_ANIM[v.name] = anim(v.name, v.seconds, 30, 0, v.tracks);
}
// ordem automática: a leitura volta entre as outras esperas
const SEQUENCE = ["lendo", "curiosa", "lendo", "cochilo", "lendo", "feliz", "lendo", "estrela"];
// entrada variacao: 1 a 5 pula para a espera de mesmo número (voltar a 0 depois)
const JUMP = ["lendo", "curiosa", "cochilo", "feliz", "estrela"];

// ---------- reação ao clique: pulinho de alegria ----------
const reaction = [];
const rea = (name, fns) => tr(reaction, R[name], "r", fns);
const arc = (t, a, b, hgt) => {
  if (t <= a || t >= b) return 0;
  const u = (t - a) / (b - a);
  return hgt * 4 * u * (1 - u);
};
rea("olena", {
  y: (t) => -arc(t, 0.18, 0.62, 18),
  sy: (t) =>
    t < 0.18
      ? 1 - 0.05 * smooth(0, 0.18, t)
      : t < 0.62
        ? 0.95 + 0.08 * smooth(0.18, 0.28, t) - 0.03 * smooth(0.5, 0.62, t)
        : 1 + spring(t, 0.62, -0.04, 24, 8),
  sx: (t) =>
    t < 0.18
      ? 1 + 0.025 * smooth(0, 0.18, t)
      : t < 0.62
        ? 1.025 - 0.04 * smooth(0.18, 0.28, t) + 0.015 * smooth(0.5, 0.62, t)
        : 1 - spring(t, 0.62, -0.02, 24, 8),
});
rea("orelhaE", { rot: (t) => -0.07 * flick(t, 0.2, 0.1, 20, 7) });
rea("orelhaD", { rot: (t) => 0.07 * flick(t, 0.2, 0.1, 20, 7) });
for (const name of ["olhoE", "olhoD"]) {
  rea(name, {
    sx: (t) => 1 + 0.1 * bump(t, 0.15, 0.9),
    sy: (t) => 1 + 0.1 * bump(t, 0.15, 0.9),
  });
}
rea("estrela", {
  rot: (t) => TAU * ease(0.2, 1.0, t),
  sx: (t) => 1 + 0.25 * bump(t, 0.2, 0.8),
  sy: (t) => 1 + 0.25 * bump(t, 0.2, 0.8),
});
rea("cauda", { rot: (t) => 0.1 * flick(t, 0.3, 0.12, 16, 5) });
const A_ALEGRIA = anim("alegria", 1.3, 60, 0, reaction);
const A_REPOUSO = anim("repouso", 0.5, 30, 1, [[R.olena.r, K.y, () => 0]]);

// ---------- estresse (só verificação) ----------
if (process.env["OLENA_STRESS"]) {
  const poses = [
    { ear: 1, tail: 1, book: 1, paw: 1, blink: 0, gx: 1, gy: 1 },
    { ear: -1, tail: -1, book: -1, paw: -1, blink: 0, gx: -1, gy: -1 },
    { ear: 1, tail: -1, book: 1, paw: -1, blink: 1, gx: 0, gy: 0 },
    { ear: -1, tail: 1, book: -1, paw: 1, blink: 0, gx: 1, gy: -1 },
  ];
  const at = (t) => poses[Math.min(poses.length - 1, Math.round(t))];
  const list = [];
  list.push([R.orelhaE.r, K.rotation, (t) => -0.13 * at(t).ear]);
  list.push([R.orelhaD.r, K.rotation, (t) => 0.13 * at(t).ear]);
  list.push([R.cauda.r, K.rotation, (t) => 0.13 + 0.13 * at(t).tail]);
  list.push([R.caudaPonta.r, K.rotation, (t) => (at(t).tail > 0 ? 0.42 : -0.05)]);
  list.push([R.livro.r, K.y, (t) => -3.5 * at(t).book]);
  list.push([R.livro.r, K.rotation, (t) => -0.018 * at(t).book]);
  list.push([R.corpo.r, K.scaleY, (t) => 1 + 0.009 * at(t).book]);
  list.push([R.corpo.r, K.rotation, (t) => 0.018 * at(t).ear]);
  list.push([R.pataD.r, K.rotation, (t) => -0.25 * at(t).paw]);
  list.push([R.pataD.r, K.y, (t) => -22 * at(t).paw - 25]);
  list.push([R.pataD.r, K.x, (t) => -14 * at(t).paw]);
  list.push([R.pataE.r, K.rotation, (t) => 0.2 * at(t).paw]);
  list.push([R.pataE.r, K.y, (t) => -8 * at(t).paw]);
  list.push([R.pataE.r, K.x, (t) => 5 * at(t).paw]);
  list.push([R.olhoE.r, K.scaleY, (t) => (at(t).blink ? 0.06 : 1)]);
  list.push([R.olhoD.r, K.scaleY, (t) => (at(t).blink ? 0.06 : 1)]);
  list.push([R.pupilaE.r, K.x, (t) => 6 * at(t).gx]);
  list.push([R.pupilaE.r, K.y, (t) => 5 * at(t).gy]);
  list.push([R.pupilaD.r, K.x, (t) => 6 * at(t).gx]);
  list.push([R.pupilaD.r, K.y, (t) => 5 * at(t).gy]);
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
// máquina de estados "Olena": entrada clique (1 dispara a alegria; voltar a 0 depois)
writeObj(T.StateMachine, [[K.animName, S, "Olena"]]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "clique"],
  [K.numValue, D, 0],
]);
writeObj(T.StateMachineNumber, [
  [K.smName, S, "variacao"],
  [K.numValue, D, 0],
]);
const goEntry = (to) =>
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.tDuration, U, 0],
  ]);
const goNow = (to) =>
  writeObj(T.StateTransition, [
    [K.stateToId, U, to],
    [K.flags, U, 4 | 8],
    [K.exitTime, U, 100],
    [K.tDuration, U, 0],
  ]);
const animState = (id) => writeObj(T.AnimationState, [[K.animationId, U, id]]);
// camada Base: estados 3 em diante = SEQUENCE; cada um passa ao seguinte quando termina, e a
// entrada variacao (1 a 5) pula para a primeira ocorrência da espera pedida
writeObj(T.StateMachineLayer, [[K.smName, S, "Base"]]);
writeObj(T.EntryState, []);
goEntry(3);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
SEQUENCE.forEach((name, i) => {
  animState(VAR_ANIM[name]);
  goNow(3 + ((i + 1) % SEQUENCE.length));
  JUMP.forEach((target, k) => {
    const to = 3 + SEQUENCE.indexOf(target);
    if (to === 3 + i) return;
    writeObj(T.StateTransition, [
      [K.stateToId, U, to],
      [K.tDuration, U, 250],
    ]);
    writeObj(NUMBER_CONDITION, [
      [K.inputId, U, 1],
      [K.opValue, U, 0],
      [CONDITION_VALUE, D, k + 1],
    ]);
  });
});
// camada Reacao: 3 repouso, 4 alegria
writeObj(T.StateMachineLayer, [[K.smName, S, "Reacao"]]);
writeObj(T.EntryState, []);
goEntry(3);
writeObj(T.AnyState, []);
writeObj(T.ExitState, []);
animState(A_REPOUSO);
writeObj(T.StateTransition, [
  [K.stateToId, U, 4],
  [K.tDuration, U, 0],
]);
writeObj(NUMBER_CONDITION, [
  [K.inputId, U, 0],
  [K.opValue, U, 0],
  [CONDITION_VALUE, D, 1],
]);
animState(A_ALEGRIA);
goNow(3);

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
