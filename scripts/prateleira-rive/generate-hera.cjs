// Gera public/olena-prateleira/hera.riv: a hera que pende dos cantos da prateleira. São 16 folhas
// presas a uma haste; cada folha balança em volta do ponto onde se prende (o entalhe de cima) e a
// haste inteira balança junto. No repouso (t = 0) tudo fica onde o CSS põe, então o canvas
// substitui as folhas de CSS sem salto.
// Uso: node scripts/prateleira-rive/generate-hera.cjs
const fs = require("fs");
const path = require("path");
const { RiveFile, P, K } = require("./rive-writer.cjs");

const LAYERS = path.join(__dirname, "layers-hera");
const OUTPUT =
  process.env["HERA_OUT"] ??
  path.join(__dirname, "..", "..", "public", "olena-prateleira", "hera.riv");
const meta = JSON.parse(fs.readFileSync(path.join(LAYERS, "layers.json"), "utf8"));

// folga: as folhas giram e saem um pouco do quadro de 55 x 208
const PAD_X = 10;
const PAD_Y = 6;
const file = new RiveFile("Hera", meta.width + 2 * PAD_X, meta.height + 2 * PAD_Y);
const assets = {};
for (const [name, image] of Object.entries(meta.images))
  assets[name] = file.asset(name, fs.readFileSync(path.join(LAYERS, image.file)), image.w, image.h);

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
const rad = (degrees) => (degrees * Math.PI) / 180;

const root = file.node(0, "raiz", PAD_X, PAD_Y);
// nós da haste inteira: p (posiciona), a (brisa), v (rajada). O pivô é o topo da haste.
const VINE_PIVOT = [27.5, 0];
const vp = file.node(root, "hera-posicao", VINE_PIVOT[0], VINE_PIVOT[1]);
const va = file.node(vp, "hera-brisa");
const vv = file.node(va, "hera-rajada");
const SCALE_HALF = 1 / meta.scale;

// haste: atrás das folhas (criada por último, fica por baixo) mas sob o mesmo nó
const leafSpecs = [];
for (let i = 0; i < 16; i++) {
  const n = i + 1; // nth-child é de base 1
  const variant = n % 3 === 0 ? "C" : n % 2 === 0 ? "B" : "A";
  const left = n % 3 === 0 ? 4 : n % 2 === 0 ? 18 : 0;
  const degrees = n % 3 === 0 ? 26 : n % 2 === 0 ? -32 : -18;
  const top = i * 12;
  const center = [left + meta.leaf / 2, top + meta.leaf / 2];
  // o entalhe de cima da folha (50% 19%) é onde ela se prende; girado com a folha
  const offset = [0, (0.19 - 0.5) * meta.leaf];
  const a = rad(degrees);
  const pivot = [
    center[0] + offset[0] * Math.cos(a) - offset[1] * Math.sin(a),
    center[1] + offset[0] * Math.sin(a) + offset[1] * Math.cos(a),
  ];
  leafSpecs.push({ i, variant, center, pivot });
}
const leaves = leafSpecs.map((spec) => {
  const p = file.node(
    vv,
    `folha${spec.i}-posicao`,
    spec.pivot[0] - VINE_PIVOT[0],
    spec.pivot[1] - VINE_PIVOT[1],
  );
  const a = file.node(p, `folha${spec.i}-brisa`);
  const v = file.node(a, `folha${spec.i}-rajada`);
  return { ...spec, p, a, v };
});
// primeiro desenhável por cima: a última folha (a de baixo) cobre as de cima, como no CSS
for (const leaf of [...leaves].reverse()) {
  const id = file.image(
    leaf.v,
    `folha${leaf.i}`,
    assets["folha" + leaf.variant],
    leaf.center[0] - leaf.pivot[0],
    leaf.center[1] - leaf.pivot[1],
  );
  file.comps[id].props.push([K.scaleX, "d", SCALE_HALF], [K.scaleY, "d", SCALE_HALF]);
}
const stemId = file.image(
  vv,
  "haste",
  assets["haste"],
  meta.width / 2 - VINE_PIVOT[0],
  meta.height / 2 - VINE_PIVOT[1],
);
file.comps[stemId].props.push([K.scaleX, "d", SCALE_HALF], [K.scaleY, "d", SCALE_HALF]);

// ---------- animações ----------
const FPS = 30;
const depth = (i) => i / 15; // 0 no alto, 1 embaixo: embaixo balança mais
const tracks = (level, fns) => {
  const list = [[{ brisa: va, rajada: vv }[level === "a" ? "brisa" : "rajada"], P.rot, fns.vine]];
  for (const leaf of leaves) list.push([leaf[level], P.rot, (t) => fns.leaf(leaf.i, t)]);
  return list;
};

// brisa: 6 s em laço, sempre rodando. Uma onda desce pela hera (fase por folha).
const BRISA = 6;
const A_BRISA = file.anim(
  "brisa",
  BRISA,
  FPS,
  1,
  tracks("a", {
    vine: (t) => rad(0.5) * Math.sin(TAU * (t / BRISA)),
    leaf: (i, t) =>
      rad(1 + 2.6 * depth(i)) *
      (Math.sin(TAU * (t / BRISA - i * 0.03)) + Math.sin(-TAU * i * 0.03) * -1),
  }),
);

// rajadas: cada uma começa e termina em repouso (nó v)
const rest = { vine: () => 0, leaf: () => 0 };
const calm = (name, seconds) => file.anim(name, seconds, FPS, 0, tracks("v", rest));
const gust = (name, seconds, strength, cycles) =>
  file.anim(
    name,
    seconds,
    FPS,
    0,
    tracks("v", {
      vine: (t) =>
        rad(1.6 * strength) * bump(t, 0, seconds) * Math.sin(TAU * cycles * 0.5 * (t / seconds)),
      leaf: (i, t) =>
        rad((2.5 + 6 * depth(i)) * strength) *
        bump(t, 0, seconds) *
        Math.sin(TAU * (cycles * (t / seconds) - i * 0.055)),
    }),
  );
const A_CALMO_A = calm("calmo", 6);
const A_RAJADA = gust("rajada", 2.8, 1, 2.5);
const A_CALMO_B = calm("calmo2", 9);
const A_BALANCO = gust("balanco", 4.2, 0.7, 2);

// ---------- máquina de estados "Hera" ----------
// Brisa roda sempre. Rajada alterna espera e rajada; a entrada vento (1) dispara a rajada na hora.
file.stateMachine(
  "Hera",
  ["vento"],
  [
    { name: "Brisa", states: [{ anim: A_BRISA, transitions: [] }] },
    {
      name: "Rajada",
      states: [
        {
          anim: A_CALMO_A,
          transitions: [
            { to: 1, onExit: true },
            { to: 1, input: "vento", value: 1, duration: 200 },
          ],
        },
        { anim: A_RAJADA, transitions: [{ to: 2, onExit: true }] },
        {
          anim: A_CALMO_B,
          transitions: [
            { to: 3, onExit: true },
            { to: 1, input: "vento", value: 1, duration: 200 },
          ],
        },
        { anim: A_BALANCO, transitions: [{ to: 0, onExit: true }] },
      ],
    },
  ],
);

file.serialize(OUTPUT, OUTPUT);
