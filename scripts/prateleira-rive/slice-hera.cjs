// Desenha a arte da hera da prateleira (as 16 folhas e a haste de src/views/notebook-shelf.css,
// `.notebook-shelf-vines`) em layers-hera/*.png, no dobro da resolução. Só há três imagens de folha
// (uma por rotação do CSS) porque as 16 folhas repetem a mesma forma: a rotação fica assada na
// imagem e o Rive anima o balanço em volta do ponto onde a folha se prende na haste.
// A folha é um polígono de 27 x 27 com gradiente de 133 graus em três faixas chapadas.
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");

const OUT = path.join(__dirname, "layers-hera");
const SCALE = 2;
const LEAF = 27;
const POLYGON = [
  [50, 19],
  [32, 4],
  [15, 5],
  [3, 19],
  [3, 40],
  [15, 60],
  [50, 100],
  [85, 60],
  [97, 40],
  [97, 19],
  [85, 5],
  [68, 4],
];
const COLORS = [
  [0.35, "#79964d"],
  [0.68, "#4d713e"],
  [1, "#304b36"],
];
// quadro quadrado de cada folha: a diagonal de uma folha de 27 cabe girada em qualquer ângulo
const BOX = 42;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function leafPng(degrees) {
  const size = BOX * SCALE;
  const c = createCanvas(size, size);
  const x = c.getContext("2d");
  x.scale(SCALE, SCALE);
  x.translate(BOX / 2, BOX / 2);
  x.rotate((degrees * Math.PI) / 180);
  x.translate(-LEAF / 2, -LEAF / 2);
  // linear-gradient(133deg, ...): a linha do gradiente tem |w sin a| + |h cos a| de comprimento
  const angle = (133 * Math.PI) / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const length = Math.abs(LEAF * dx) + Math.abs(LEAF * dy);
  const cx = LEAF / 2;
  const cy = LEAF / 2;
  const gradient = x.createLinearGradient(
    cx - (dx * length) / 2,
    cy - (dy * length) / 2,
    cx + (dx * length) / 2,
    cy + (dy * length) / 2,
  );
  gradient.addColorStop(0, COLORS[0][1]);
  for (let i = 0; i < COLORS.length - 1; i++) {
    gradient.addColorStop(COLORS[i][0], COLORS[i][1]);
    gradient.addColorStop(COLORS[i][0], COLORS[i + 1][1]);
  }
  gradient.addColorStop(1, COLORS[COLORS.length - 1][1]);
  x.fillStyle = gradient;
  x.beginPath();
  POLYGON.forEach(([px, py], i) => {
    const point = [(px / 100) * LEAF, (py / 100) * LEAF];
    if (i) x.lineTo(point[0], point[1]);
    else x.moveTo(point[0], point[1]);
  });
  x.closePath();
  x.fill();
  return c.toBuffer("image/png");
}

// haste: border-inline-start de 3px com border-radius 45% numa caixa de 25 x 200 (left 12, top 0),
// girada -4 graus em torno do centro. O traço some nos cantos: é um crescente.
function stemPng() {
  const W = 55;
  const H = 208;
  const c = createCanvas(W * SCALE, H * SCALE);
  const x = c.getContext("2d");
  x.scale(SCALE, SCALE);
  x.translate(12 + 12.5, 100);
  x.rotate((-4 * Math.PI) / 180);
  x.translate(-12.5, -100);
  const boxW = 25;
  const boxH = 200;
  const rx = 0.45 * boxW;
  const ry = 0.45 * boxH;
  const border = 3;
  const curve = (y, radiusX) => {
    if (y >= ry && y <= boxH - ry) return 0;
    const dy = y < ry ? ry - y : y - (boxH - ry);
    return radiusX - radiusX * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));
  };
  const outer = [];
  const inner = [];
  for (let y = 0; y <= boxH; y += 1) {
    outer.push([curve(y, rx), y]);
    inner.push([border + curve(y, rx - border), y]);
  }
  x.fillStyle = "#4d713e";
  x.beginPath();
  outer.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
  inner.reverse().forEach(([px, py]) => x.lineTo(px, py));
  x.closePath();
  x.fill();
  return c.toBuffer("image/png");
}

const images = {};
const save = (name, png, w, h) => {
  fs.writeFileSync(path.join(OUT, name + ".png"), png);
  images[name] = { file: name + ".png", w, h };
};
// as três rotações do CSS: 6n usa a do 3n (+26), os pares -32 e o resto -18
save("folhaA", leafPng(-18), BOX * SCALE, BOX * SCALE);
save("folhaB", leafPng(-32), BOX * SCALE, BOX * SCALE);
save("folhaC", leafPng(26), BOX * SCALE, BOX * SCALE);
save("haste", stemPng(), 55 * SCALE, 208 * SCALE);
fs.writeFileSync(
  path.join(OUT, "layers.json"),
  JSON.stringify({ width: 55, height: 208, scale: SCALE, leaf: LEAF, box: BOX, images }, null, 2) +
    "\n",
);
console.log("hera:", Object.keys(images).join(", "));
