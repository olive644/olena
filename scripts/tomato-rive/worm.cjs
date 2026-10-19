// A minhoca verde de papel recortado que fica sob o relógio do Pomodoro. Cada gomo é um polígono
// facetado com uma face clara em cima, empilhados da cauda (esquerda) para a cabeça.
//   node scripts/tomato-rive/worm.cjs  gera public/pomodoro-tomato/minhoca.svg, o quadro estático
//   (imagem decorativa que vive como arquivo para não pesar no JavaScript da aplicação)
// art.cjs usa `wormParts()` para recortar os gomos, os olhos e a boca em camadas que o Rive anima.
const WIDTH = 320;
const HEIGHT = 120;
const SIDES = 9;

// o corpo ondula de leve e engorda da cauda até a cabeça
const BODY = [
  { x: 24, y: 70, r: 30 },
  { x: 62, y: 54, r: 38 },
  { x: 102, y: 70, r: 42 },
  { x: 142, y: 54, r: 44 },
  { x: 182, y: 70, r: 44 },
  { x: 222, y: 54, r: 44 },
  { x: 262, y: 64, r: 50 },
];

const point = (x, y, r, index, squash = 1) => {
  const angle = (Math.PI * 2 * index) / SIDES - Math.PI / 2;
  // raio levemente irregular: dá o corte de tesoura em vez de um círculo perfeito
  const jitter = 1 + (index % 3 === 0 ? 0.05 : index % 3 === 1 ? -0.04 : 0.01);
  return [x + Math.cos(angle) * r * jitter, y + Math.sin(angle) * r * jitter * squash];
};
const ring = (s, dy = 0) =>
  Array.from({ length: SIDES }, (_, i) => point(s.x, s.y + dy, s.r, i, 0.92));
const light = (s) => [
  point(s.x, s.y, s.r * 0.86, 7, 0.92),
  point(s.x, s.y, s.r * 0.86, 8, 0.92),
  point(s.x, s.y, s.r * 0.86, 0, 0.92),
  point(s.x, s.y, s.r * 0.86, 1, 0.92),
  [s.x + s.r * 0.1, s.y - s.r * 0.05],
];
const facet = (s) => [
  [s.x - s.r * 0.1, s.y - s.r * 0.8],
  [s.x + s.r * 0.45, s.y - s.r * 0.62],
  [s.x + s.r * 0.1, s.y - s.r * 0.3],
];

const head = BODY[BODY.length - 1];
const poly = (points, fill) => ({ kind: "poly", points, fill });
const ellipse = (cx, cy, rx, ry, fill) => ({ kind: "ellipse", cx, cy, rx, ry, fill });
const eye = (dx, dy, rx, ry, pr, pdx, pdy, hr) => [
  ellipse(head.x + dx, head.y + dy, rx, ry, "#fffaf0"),
  ellipse(head.x + pdx, head.y + pdy, pr, pr, "#242033"),
  ellipse(head.x + pdx + 2, head.y + pdy - 2, hr, hr, "#fffaf0"),
];

/** Partes da minhoca em unidades de 320 x 120, da cauda para a cabeça: gomos, olhos e boca. */
function wormParts() {
  return {
    segments: BODY.map((s, i) => [
      poly(ring(s, 5), "#24603a"),
      poly(ring(s), i % 2 ? "#3f9d52" : "#4aa95a"),
      poly(light(s), i % 2 ? "#63bd68" : "#72c873"),
      poly(facet(s), "#9be28d"),
    ]),
    eyes: [...eye(6, -12, 13, 14, 6, 9, -10, 2), ...eye(26, -4, 11, 12, 5, 28, -2, 1.8)],
    mouth: [
      poly(
        [
          [head.x + 6, head.y + 18],
          [head.x + 20, head.y + 22],
          [head.x + 32, head.y + 14],
          [head.x + 20, head.y + 28],
        ],
        "#24603a",
      ),
    ],
    body: BODY,
  };
}

function toSvg(shapes) {
  const n = (v) => v.toFixed(1);
  return shapes
    .map((s) =>
      s.kind === "poly"
        ? `<polygon points="${s.points.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}" fill="${s.fill}"/>`
        : `<ellipse cx="${n(s.cx)}" cy="${n(s.cy)}" rx="${s.rx}" ry="${s.ry}" fill="${s.fill}"/>`,
    )
    .join("");
}

module.exports = { wormParts, WIDTH, HEIGHT };

if (require.main === module) {
  const { writeFileSync } = require("node:fs");
  const { join } = require("node:path");
  const parts = wormParts();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">${toSvg([
    ...parts.segments.flat(),
    ...parts.eyes,
    ...parts.mouth,
  ])}</svg>\n`;
  writeFileSync(join(__dirname, "../../public/pomodoro-tomato/minhoca.svg"), svg);
  console.log(`minhoca.svg ${svg.length} bytes`);
}
