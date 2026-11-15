// Gera public/olena-prateleira/olena-dormindo.riv: a Olena dormindo da prateleira dos cadernos,
// montada com as peças de slice-olena.cjs. Cada peça é uma imagem rígida dentro de quatro nós no
// mesmo pivô: p (posiciona, nunca é animado), r (reação ao clique), a (respirar, sempre rodando) e
// v (variações da camada Base). Camadas diferentes nunca disputam a mesma propriedade do mesmo nó.
// No repouso (t = 0) a soma das peças é a arte original: trocar a imagem estática pelo canvas não
// dá salto.
// Uso: node scripts/prateleira-rive/generate-olena.cjs
// OLENA_STRESS=1 OLENA_OUT=<arquivo> acrescenta a animação "estresse" (poses extremas, só para
// verificar frestas); o arquivo publicado nunca a inclui.
const fs = require("fs");
const path = require("path");
const { RiveFile, P, K } = require("./rive-writer.cjs");

const LAYERS = path.join(__dirname, "layers-olena");
const OUTPUT =
  process.env["OLENA_OUT"] ??
  path.join(__dirname, "..", "..", "public", "olena-prateleira", "olena-dormindo.riv");
const meta = JSON.parse(fs.readFileSync(path.join(LAYERS, "layers.json"), "utf8"));
const layers = meta.layers;

// folga em volta da arte: estrela, orelha, cauda, brilhos e "z" saem um pouco do quadro da imagem
const PAD = 16;
const file = new RiveFile("Olena dormindo", meta.width + 2 * PAD, meta.height + 2 * PAD);

meta.order.forEach((name) => {
  const L = layers[name];
  file.asset(name, fs.readFileSync(path.join(LAYERS, L.file)), L.w, L.h);
});

const ZERO = [0, 0];
const root = file.node(0, "raiz", PAD, PAD);
const R = {};
function rig(parentRig, name, pivot) {
  const parent = parentRig ? parentRig.v : root;
  const parentPivot = parentRig ? parentRig.pivot : ZERO;
  const p = file.node(
    parent,
    name + "-posicao",
    pivot[0] - parentPivot[0],
    pivot[1] - parentPivot[1],
  );
  const r = file.node(p, name + "-reacao");
  const a = file.node(r, name + "-respirar");
  const v = file.node(a, name + "-variacao");
  R[name] = { p, r, a, v, pivot };
  return R[name];
}
const corpo = rig(null, "corpo", [240, 228]);
const earL = rig(corpo, "orelhaE", layers.earL.pivot);
const tail = rig(corpo, "cauda", layers.tail.pivot);
const eyeL = rig(corpo, "olhoE", layers.eyeL.pivot);
const eyeR = rig(corpo, "olhoD", layers.eyeR.pivot);
const star = rig(corpo, "estrela", layers.star.pivot);
// brilhos e "z": soltos do corpo (não respiram junto), posicionados pelo centro
const placed = {
  sparkleA: [332, 60],
  sparkleB: [244, 58],
  sparkleC: [338, 126],
  zSmall: [158, 70],
  zMid: [188, 54],
  zBig: [226, 38],
};
for (const [name, at] of Object.entries(placed)) rig(null, name, at);

// da frente para trás: o primeiro desenhável do arquivo fica por cima
const parts = {
  sparkleA: ["sparkleA", "sparkleA"],
  sparkleB: ["sparkleB", "sparkleB"],
  sparkleC: ["sparkleB", "sparkleC"],
  zBig: ["zBig", "zBig"],
  zMid: ["zMid", "zMid"],
  zSmall: ["zSmall", "zSmall"],
  star: ["star", "estrela"],
  eyeL: ["eyeL", "olhoE"],
  eyeR: ["eyeR", "olhoD"],
  earL: ["earL", "orelhaE"],
  tail: ["tail", "cauda"],
  body: ["body", "corpo"],
};
const FRESH = new Set(["sparkleA", "sparkleB", "sparkleC", "zBig", "zMid", "zSmall"]);
for (const [key, [layerName, rigName]] of Object.entries(parts)) {
  const L = layers[layerName];
  const target = R[rigName];
  const fresh = FRESH.has(key);
  file.image(
    target.v,
    key,
    meta.order.indexOf(layerName),
    fresh ? 0 : L.x0 + L.w / 2 - target.pivot[0],
    fresh ? 0 : L.y0 + L.h / 2 - target.pivot[1],
  );
}

// brilhos e "z" começam invisíveis (a opacidade do nó v é o que as variações animam)
for (const name of Object.keys(placed)) file.comps[R[name].v].props.push([K.opacity, "d", 0]);

// ---------- curvas ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const bump = (t, a, d) => {
  const u = (t - a) / d;
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2;
};
// oscilação que vale zero em t = 0 (o repouso é a arte original)
const osc = (t, period, phase = 0) => Math.sin(TAU * (t / period + phase)) - Math.sin(TAU * phase);
const flick = (t, t0, up = 0.1, freq = 24, decay = 8) => {
  if (t < t0) return 0;
  if (t < t0 + up) return smooth(t0, t0 + up, t);
  return Math.exp(-decay * (t - t0 - up)) * Math.cos(freq * (t - t0 - up));
};

// Todo trilho de uma camada precisa ter um valor em todas as animações da camada: quando a
// animação seguinte começa, o que a anterior deixou fica onde está.
const REST = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, op: 1 };
function track(level, universe, overrides) {
  const list = [];
  for (const [name, props] of Object.entries(universe)) {
    for (const prop of props) {
      const rest = FX.includes(name) && prop === "op" ? 0 : REST[prop];
      const fn = overrides[name]?.[prop] ?? (() => rest);
      list.push([R[name][level], P[prop], fn]);
    }
  }
  return list;
}
const FX = ["sparkleA", "sparkleB", "sparkleC", "zBig", "zMid", "zSmall"];
// camada Base (nó v): todas as peças que alguma variação mexe
const V_UNIVERSE = {
  corpo: ["y", "sx", "sy", "rot"],
  orelhaE: ["rot"],
  cauda: ["rot"],
  olhoE: ["y", "sy"],
  olhoD: ["y", "sy"],
  estrela: ["rot", "sx", "sy"],
  ...Object.fromEntries(FX.map((name) => [name, ["x", "y", "sx", "sy", "op"]])),
};
// pose parada de um brilho/z: invisível, na posição de origem
const fx = (name, fns) => ({ [name]: { op: () => 0, ...fns } });

// ---------- respirar (nó a, camada Respirar): 8 s, roda sempre ----------
const BREATH = 4;
const breath = (t) => (1 - Math.cos((TAU * t) / BREATH)) / 2;
const A_RESPIRAR = file.anim(
  "respirar",
  8,
  30,
  1,
  track(
    "a",
    { corpo: ["sx", "sy"], orelhaE: ["rot"], cauda: ["rot"], estrela: ["sx", "sy"] },
    {
      corpo: { sy: (t) => 1 + 0.016 * breath(t), sx: (t) => 1 - 0.004 * breath(t) },
      orelhaE: { rot: (t) => -0.006 * breath(t) },
      cauda: { rot: (t) => 0.014 * osc(t, 8) },
      estrela: { sx: (t) => 1 + 0.018 * breath(t), sy: (t) => 1 + 0.018 * breath(t) },
    },
  ),
);

// ---------- variações (nó v, camada Base) ----------
const FPS = 30;
const variations = {};
function variation(name, seconds, overrides) {
  variations[name] = file.anim(name, seconds, FPS, 0, track("v", V_UNIVERSE, overrides));
}
variation("quieta", 3, {});
variation("orelha", 2.6, {
  orelhaE: {
    rot: (t) => -0.055 * flick(t, 0.5, 0.09, 26, 9) - 0.03 * flick(t, 1.35, 0.08, 28, 10),
  },
});
variation("estrela", 3.2, {
  estrela: {
    // só cresce (nunca gira): a estrela original continua por baixo e ficaria à mostra
    sx: (t) => 1 + 0.13 * bump(t, 0.2, 0.9) + 0.1 * bump(t, 1.3, 0.9),
    sy: (t) => 1 + 0.13 * bump(t, 0.2, 0.9) + 0.1 * bump(t, 1.3, 0.9),
  },
  ...fx("sparkleA", {
    op: (t) => bump(t, 0.35, 1.1),
    sx: (t) => 0.4 + 0.7 * bump(t, 0.35, 1.1),
    sy: (t) => 0.4 + 0.7 * bump(t, 0.35, 1.1),
  }),
  ...fx("sparkleB", {
    op: (t) => bump(t, 0.75, 1.1),
    sx: (t) => 0.4 + 0.7 * bump(t, 0.75, 1.1),
    sy: (t) => 0.4 + 0.7 * bump(t, 0.75, 1.1),
  }),
  ...fx("sparkleC", {
    op: (t) => bump(t, 1.2, 1.1),
    sx: (t) => 0.4 + 0.7 * bump(t, 1.2, 1.1),
    sy: (t) => 0.4 + 0.7 * bump(t, 1.2, 1.1),
  }),
});
variation("cauda", 4, {
  cauda: {
    rot: (t) => 0.05 * Math.sin(TAU * smooth(0, 4, t) * 1.5) * Math.sin(Math.PI * smooth(0, 4, t)),
  },
  corpo: {
    rot: (t) =>
      0.0025 * Math.sin(TAU * smooth(0, 4, t) * 1.5) * Math.sin(Math.PI * smooth(0, 4, t)),
  },
});
const zRise = (name, start, dx, dy, life = 2.6) => ({
  ...fx(name, {
    op: (t) => bump(t, start, life),
    x: (t) => dx * smooth(start, start + life, t),
    y: (t) => -dy * smooth(start, start + life, t),
    sx: (t) => 0.6 + 0.5 * smooth(start, start + life * 0.6, t),
    sy: (t) => 0.6 + 0.5 * smooth(start, start + life * 0.6, t),
  }),
});
variation("sonho", 5.4, {
  olhoE: {
    sy: (t) => 1 - 0.4 * bump(t, 1.0, 0.5) - 0.3 * bump(t, 2.2, 0.4),
    y: (t) => 0.5 * bump(t, 1.0, 0.5),
  },
  olhoD: {
    sy: (t) => 1 - 0.4 * bump(t, 1.0, 0.5) - 0.3 * bump(t, 2.2, 0.4),
    y: (t) => 0.5 * bump(t, 1.0, 0.5),
  },
  cauda: { rot: (t) => 0.035 * flick(t, 2.3, 0.12, 20, 7) },
  orelhaE: { rot: (t) => -0.04 * flick(t, 3.3, 0.1, 24, 8) },
  ...zRise("zSmall", 0.2, 4, 22),
  ...zRise("zMid", 0.9, 6, 28),
  ...zRise("zBig", 1.7, 8, 34),
});
variation("ressonar", 5.6, {
  corpo: {
    sy: (t) => 1 + 0.022 * bump(t, 0.4, 3.6),
    sx: (t) => 1 - 0.006 * bump(t, 0.4, 3.6),
  },
  orelhaE: { rot: (t) => -0.012 * bump(t, 0.4, 3.6) },
  estrela: {
    sx: (t) => 1 + 0.03 * bump(t, 0.4, 3.6),
    sy: (t) => 1 + 0.03 * bump(t, 0.4, 3.6),
  },
  ...zRise("zMid", 1.2, 6, 26, 3),
  ...zRise("zBig", 2.0, 8, 32, 3),
});

// ---------- reação ao clique (nó r, camada Reacao) ----------
const R_UNIVERSE = {
  corpo: ["y", "sx", "sy"],
  orelhaE: ["rot"],
  cauda: ["rot"],
  estrela: ["rot", "sx", "sy"],
  olhoE: ["sy"],
  olhoD: ["sy"],
};
const A_SUSTO = file.anim(
  "susto",
  1.3,
  60,
  0,
  track("r", R_UNIVERSE, {
    corpo: {
      y: (t) => -4 * bump(t, 0, 0.4),
      sy: (t) => 1 + 0.02 * flick(t, 0.2, 0.08, 20, 7),
      sx: (t) => 1 - 0.01 * flick(t, 0.2, 0.08, 20, 7),
    },
    orelhaE: { rot: (t) => -0.07 * flick(t, 0.05, 0.08, 24, 7) },
    cauda: { rot: (t) => 0.05 * flick(t, 0.25, 0.12, 16, 5) },
    estrela: {
      sx: (t) => 1 + 0.26 * bump(t, 0.05, 0.7),
      sy: (t) => 1 + 0.26 * bump(t, 0.05, 0.7),
    },
    olhoE: { sy: (t) => 1 - 0.4 * bump(t, 0.35, 0.5) },
    olhoD: { sy: (t) => 1 - 0.4 * bump(t, 0.35, 0.5) },
  }),
);
const A_REPOUSO = file.anim("repouso", 0.5, 30, 1, track("r", R_UNIVERSE, {}));

// ---------- estresse (só verificação) ----------
if (process.env["OLENA_STRESS"]) {
  const poses = [
    { ear: 1, tail: 1, body: 1, eye: 0, star: 1 },
    { ear: -1, tail: -1, body: -1, eye: 1, star: -1 },
    { ear: 1, tail: -1, body: 1, eye: 1, star: 1 },
  ];
  const at = (t) => poses[Math.min(poses.length - 1, Math.round(t))];
  const list = [
    [R.orelhaE.v, P.rot, (t) => -0.09 * at(t).ear],
    [R.cauda.v, P.rot, (t) => 0.06 * at(t).tail],
    [R.corpo.v, P.sy, (t) => 1 + 0.024 * at(t).body],
    [R.estrela.v, P.rot, (t) => 0.25 * at(t).star],
    [R.estrela.v, P.sx, (t) => 1.1],
    [R.estrela.v, P.sy, (t) => 1.1],
    [R.olhoE.v, P.sy, (t) => (at(t).eye ? 0.55 : 1)],
    [R.olhoD.v, P.sy, (t) => (at(t).eye ? 0.55 : 1)],
  ];
  file.animations.push({
    name: "estresse",
    frames: poses.length - 1,
    fps: 1,
    loop: 0,
    tracks: list,
  });
}

// ---------- máquina de estados "Olena" ----------
// Base: sequência automática; cada espera passa à seguinte quando termina, e a entrada variacao
// (1 a 5) pula para a primeira ocorrência da espera pedida.
const SEQUENCE = ["quieta", "orelha", "quieta", "estrela", "cauda", "sonho", "quieta", "ressonar"];
const JUMP = ["orelha", "estrela", "cauda", "sonho", "ressonar"];
file.stateMachine(
  "Olena",
  ["clique", "variacao"],
  [
    { name: "Respirar", states: [{ anim: A_RESPIRAR, transitions: [] }] },
    {
      name: "Base",
      states: SEQUENCE.map((name, i) => ({
        anim: variations[name],
        transitions: [
          { to: (i + 1) % SEQUENCE.length, onExit: true },
          ...JUMP.map((target, k) => ({
            to: SEQUENCE.indexOf(target),
            input: "variacao",
            value: k + 1,
            duration: 250,
          })).filter((jump) => jump.to !== i),
        ],
      })),
    },
    {
      name: "Reacao",
      states: [
        { anim: A_REPOUSO, transitions: [{ to: 1, input: "clique", value: 1 }] },
        { anim: A_SUSTO, transitions: [{ to: 0, onExit: true }] },
      ],
    },
  ],
);

file.serialize(OUTPUT, OUTPUT);
