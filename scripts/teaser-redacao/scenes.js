// Teaser de Redação do OlenaStudy, 9:16, desenhado por código. O pincel (p5.brush) é a mão do aluno:
// escrita, marca-texto e aquarela. A Olena e os blocos de estrutura seguem o papel recortado do app.
// Cada elemento usa uma semente própria, então o traço não "ferve" de um quadro para o outro.
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;

export const COLOR = {
  paper: "#fff9ef",
  ink: "#292432",
  violet: "#7c3aed",
  violetDeep: "#51259b",
  lilac: "#a779ef",
  yellow: "#facc15",
  yellowSoft: "#ffe88d",
  rule: "#cdbde8",
  charcoal: "#3b3347",
};

// Linha do tempo em segundos. O animatic só precisa de um quadro-chave por cena.
export const SCENES = [
  { id: "gancho", from: 0, to: 3.5 },
  { id: "problema", from: 3.5, to: 8 },
  { id: "estrutura", from: 8, to: 16 },
  { id: "pratica", from: 16, to: 26 },
  { id: "evoluir", from: 26, to: 33 },
  { id: "fecho", from: 33, to: 38 },
];

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
const out = (x) => 1 - (1 - clamp(x)) ** 3;
const seg = (t, a, b) => clamp((t - a) / (b - a));

export async function loadAssets() {
  const load = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("imagem: " + src));
      image.src = src;
    });
  return { olena: await load("/olena-favicon.png"), oliver: await load("/oliver-math-islands.png") };
}

// ---------------------------------------------------------------- pincel
function onPaper(brush, draw) {
  brush.push();
  brush.translate(-WIDTH / 2, -HEIGHT / 2);
  draw();
  brush.pop();
}

/** Linha de "escrita à mão": ondula como letras cursivas, sem formar palavras. */
function scribble(brush, seed, x, y, length, progress, color, weight = 1.15) {
  const step = 16;
  const total = Math.max(2, Math.floor(length / step));
  const shown = Math.max(1, Math.floor(total * clamp(progress)));
  if (progress <= 0) return;
  brush.seed(seed);
  brush.set("pen", color, weight);
  brush.beginStroke("segments", x, y);
  for (let i = 0; i < shown; i++) {
    const loop = i % 6 === 2 ? 38 : i % 6 === 4 ? -34 : 0;
    brush.move(10 * Math.sin(i * 0.9 + seed) + loop, step, 0.8);
  }
  brush.endStroke(0, 0.7);
}

function ruledPaper(brush, t) {
  brush.clear(COLOR.paper);
  onPaper(brush, () => {
    for (let i = 0; i < 26; i++) {
      const y = 190 + i * 66;
      if (y > HEIGHT - 60) break;
      brush.seed(100 + i);
      brush.set("2H", COLOR.rule, 0.7);
      brush.line(70, y, WIDTH - 70, y);
    }
    brush.seed(7);
    brush.set("HB", "#e9a6b7", 0.8);
    brush.line(170, 120, 170, HEIGHT - 80);
  });
}

function markerUnderline(brush, seed, x, y, width, progress, color = COLOR.yellow) {
  if (progress <= 0) return;
  brush.seed(seed);
  brush.set("marker", color, 3.4);
  brush.beginStroke("segments", x, y);
  const parts = 14;
  const shown = Math.max(1, Math.floor(parts * clamp(progress)));
  for (let i = 0; i < shown; i++) brush.move(3 * Math.sin(i), width / parts, 0.9);
  brush.endStroke(0, 0.8);
}

function watercolor(brush, seed, x, y, w, h, color, opacity = 120, bleed = 0.25) {
  brush.seed(seed);
  brush.noStroke();
  brush.fill(color, opacity);
  brush.fillBleed(bleed);
  brush.fillTexture(0.55, 0.4);
  brush.rect(x, y, w, h);
  brush.noFill();
}

// ---------------------------------------------------------------- 2D (texto e papel recortado)
function title(ctx, text, x, y, size, progress, color = COLOR.ink) {
  ctx.save();
  ctx.font = `800 ${size}px Manrope, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  const width = ctx.measureText(text).width;
  ctx.beginPath();
  ctx.rect(x - 8, y - size, (width + 16) * clamp(progress), size * 1.4);
  ctx.clip();
  ctx.fillText(text, x, y);
  ctx.restore();
  return width;
}

function paperChip(ctx, x, y, w, h, fill, edge, label, size = 40, textColor = COLOR.ink, lift = 0) {
  ctx.save();
  ctx.translate(x, y - lift);
  // sombra de papel: uma base mais escura embaixo, como os botões do app
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.roundRect(0, 8, w, h, [10, 28, 10, 28]);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, [10, 28, 10, 28]);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `800 ${size}px Manrope, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(label, w / 2, h / 2 + 2);
  ctx.restore();
}

function olenaSprite(ctx, assets, cx, cy, size, bob = 0, tilt = 0) {
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.rotate(tilt);
  ctx.shadowColor = "rgba(41,36,50,0.18)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.drawImage(assets.olena, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function bubble(ctx, x, y, w, lines, progress) {
  if (progress <= 0) return;
  const p = out(progress);
  const h = 70 + lines.length * 62;
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  ctx.scale(p, p);
  ctx.translate(-(x + w / 2), -(y + h));
  ctx.fillStyle = COLOR.violetDeep;
  ctx.beginPath();
  ctx.roundRect(x, y + 9, w, h, [14, 40, 14, 40]);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, [14, 40, 14, 40]);
  ctx.fill();
  ctx.fillStyle = COLOR.ink;
  ctx.font = `700 44px Nunito, sans-serif`;
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => ctx.fillText(line, x + 40, y + 52 + index * 62));
  ctx.restore();
}

// ---------------------------------------------------------------- cenas
function sceneGancho({ brush, ctx, assets }, t) {
  ruledPaper(brush, t);
  onPaper(brush, () => {
    scribble(brush, 11, 200, 470, 700, seg(t, 0.2, 1.4), COLOR.charcoal);
    scribble(brush, 12, 200, 536, 640, seg(t, 0.6, 1.8), COLOR.charcoal);
    markerUnderline(brush, 21, 205, 392, 620, seg(t, 1.2, 2.4));
  });
  return () => {
    title(ctx, "Redação", 205, 360, 170, seg(t, 0.1, 1.2));
    const bob = Math.sin(t * 4) * 8;
    olenaSprite(ctx, assets, 860 + (1 - out(seg(t, 1.6, 2.6))) * 300, 1090 + bob, 420, 0, -0.08);
    bubble(ctx, 120, 1330, 680, ["Vem aí na Biblioteca:", "treino de redação!"], seg(t, 2.4, 3.2));
  };
}

function sceneEstrutura({ brush, ctx, assets }, t) {
  ruledPaper(brush, t);
  const blocks = [
    { label: "Tese", color: "#7c3aed", edge: "#51259b", text: "#fff9ef", y: 420 },
    { label: "Argumentos", color: "#a779ef", edge: "#51259b", text: "#292432", y: 760 },
    { label: "Proposta de intervenção", color: "#facc15", edge: "#c99a06", text: "#292432", y: 1100 },
  ];
  onPaper(brush, () => {
    blocks.forEach((block, i) => {
      const p = seg(t, 1 + i * 1.6, 2.4 + i * 1.6);
      brush.seed(300 + i);
      brush.set("2B", COLOR.charcoal, 0.8);
      brush.hatch(18, 40 + i * 20, { rand: 0.08 });
      brush.noFill();
      if (p > 0) brush.rect(150, block.y + 150, 780 * out(p), 120);
      brush.noHatch();
    });
  });
  return () => {
    title(ctx, "Como montar um texto", 120, 290, 76, seg(t, 0.2, 1));
    blocks.forEach((block, i) => {
      const p = out(seg(t, 1 + i * 1.6, 2 + i * 1.6));
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      paperChip(ctx, 130, block.y, 820, 150, block.color, block.edge, block.label, block.label.length > 14 ? 50 : 66, block.text, (1 - p) * -120);
      ctx.restore();
    });
    olenaSprite(ctx, assets, 900, 1640, 300, Math.sin(t * 3) * 6, 0.05);
  };
}

function scenePratica({ brush, ctx, assets }, t) {
  ruledPaper(brush, t);
  onPaper(brush, () => {
    for (let i = 0; i < 7; i++)
      scribble(brush, 40 + i, 200, 330 + i * 66, 700 - (i % 3) * 90, seg(t, 0.4 + i * 0.7, 1.4 + i * 0.7), COLOR.charcoal);
    // marca-texto de aquarela sobre os conectivos (trechos fixos do rascunho)
    if (t > 3.2) watercolor(brush, 61, 360, 392, 190, 46, COLOR.yellow, 150 * out(seg(t, 3.2, 4)));
    if (t > 4.6) watercolor(brush, 62, 560, 722, 210, 46, COLOR.yellow, 150 * out(seg(t, 4.6, 5.4)));
  });
  return () => {
    title(ctx, "Escreva. Revise. Evolua.", 120, 260, 70, seg(t, 0.1, 0.9));
    const items = ["Norma culta", "Compreensão do tema", "Argumentação", "Coesão", "Proposta de intervenção"];
    items.forEach((label, i) => {
      const p = out(seg(t, 5.2 + i * 0.7, 5.9 + i * 0.7));
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      paperChip(ctx, 120 + (1 - p) * 200, 880 + i * 120, 840, 94, "#fff", "#dccfee", "✓  " + label, 38, COLOR.ink);
      ctx.restore();
    });
    olenaSprite(ctx, assets, 900, 1700, 280, Math.sin(t * 3) * 6, -0.05);
  };
}

const SCENE_DRAW = {
  gancho: sceneGancho,
  problema: sceneGancho,
  estrutura: sceneEstrutura,
  pratica: scenePratica,
  evoluir: scenePratica,
  fecho: sceneGancho,
};

export function drawFrame(context) {
  const t = context.frame / FPS;
  const scene = SCENES.find((s) => t >= s.from && t < s.to) ?? SCENES[SCENES.length - 1];
  const local = t - scene.from;
  const overlay = SCENE_DRAW[scene.id](context, local);
  context.brush.render();
  const { ctx, brushCanvas } = context;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(brushCanvas, 0, 0);
  overlay();
}

export { ruledPaper, scribble, bubble, markerUnderline, watercolor, title, onPaper, paperChip, out, ease, seg, clamp };
