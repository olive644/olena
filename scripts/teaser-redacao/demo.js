// Cena de demonstração da Olena desenhada: pula para dentro, respira, pisca, mexe as orelhas,
// escreve com o lápis (olhos seguindo a ponta) e fala (boca abre e fecha) no balão.
import { COLOR, FPS, WIDTH, HEIGHT, ruledPaper, scribble, onPaper, bubble, title, seg, out } from "./scenes.js";
import { drawOlenaBrush, toLocal } from "./olena-brush.js";

export const DEMO_SECONDS = 6;

const pulse = (t, at, width) => {
  const u = (t - at) / width;
  return u < 0 || u > 1 ? 0 : Math.sin(u * Math.PI);
};

export function drawDemoFrame({ brush, brushCanvas, ctx, frame }) {
  const t = frame / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ruledPaper(brush, t);
  const lines = [
    { seed: 71, y: 1330, from: 1.3, to: 2.2, length: 400 },
    { seed: 72, y: 1410, from: 2.2, to: 3.0, length: 420 },
    { seed: 73, y: 1490, from: 3.0, to: 3.6, length: 300 },
  ];
  const X0 = 560;
  onPaper(brush, () => {
    for (const line of lines) scribble(brush, line.seed, X0, line.y, line.length, seg(t, line.from, line.to), COLOR.charcoal, 4.5);
  });

  // entrada: pulo com antecipação (agacha), sobe esticada, pousa amassada
  const pose = { x: 330, y: 1700, s: 0.8, sx: 1, sy: 1, shadow: 1 };
  if (t < 0.25) {
    const k = seg(t, 0, 0.25);
    pose.y = 2300;
    pose.shadow = 0;
    pose.sy = 1;
  } else if (t < 0.7) {
    const k = seg(t, 0.25, 0.7);
    pose.y = 1700 + (1 - out(k)) * 700;
    const stretch = Math.sin(k * Math.PI) * 0.18;
    pose.sy = 1 + stretch;
    pose.sx = 1 - stretch * 0.5;
    pose.shadow = k;
  } else {
    const s = t - 0.7;
    const wobble = Math.exp(-7 * s) * Math.cos(17 * s);
    pose.sy = 1 - 0.22 * wobble;
    pose.sx = 1 + 0.13 * wobble;
  }
  pose.breath = t > 1 ? Math.sin(((t - 1) / 2.2) * Math.PI * 2) : 0;
  pose.blink = Math.max(pulse(t, 1.0, 0.16), pulse(t, 2.7, 0.16), pulse(t, 4.9, 0.16));
  pose.earL = 0.18 * pulse(t, 2.0, 0.4) * Math.sin(((t - 2.0) / 0.4) * Math.PI * 4);
  pose.earR = 0.2 * pulse(t, 3.4, 0.4) * Math.sin(((t - 3.4) / 0.4) * Math.PI * 4);
  pose.star = 1 + 0.35 * pulse(t, 4.2, 0.6);
  pose.tail = Math.sin(t * 3);
  pose.head = 0.04 * Math.sin(t * 1.6) + (t > 4.2 ? -0.06 * out(seg(t, 4.2, 4.8)) : 0);
  pose.brow = t > 4.2 ? 0.8 * out(seg(t, 4.2, 4.6)) : 0.2;
  pose.smile = t > 4.2 ? 1 : 0.4;
  pose.pupil = t > 4.2 ? 0.6 : 0;

  // escrita: a pata segura o lápis e a ponta segue a linha atual
  const active = lines.find((line) => t >= line.from && t < line.to);
  const idle = [-185, -170];
  let target = idle;
  let tipX = X0;
  let tipY = 1330;
  if (active) {
    const progress = seg(t, active.from, active.to);
    tipX = X0 + progress * active.length;
    tipY = active.y + 10 * Math.sin(progress * 30);
    const [lx, ly] = toLocal(pose, tipX, tipY);
    target = [lx + 43, ly - 70];
    pose.pencil = true;
  } else if (t >= 1.0 && t < 4.3) {
    const last = lines.filter((line) => t >= line.to).at(-1);
    const [lx, ly] = toLocal(pose, X0 + (last ? last.length : 0), (last ? last.y : 1330) + 40);
    target = [lx + 43, ly - 70];
    pose.pencil = true;
  } else {
    pose.pencil = t > 4.3 && t < 5.5;
    target = pose.pencil ? [200, -430] : idle;
  }
  // a mão vem do repouso até o papel, com suavidade
  const reach = t < 1.0 ? 0 : out(seg(t, 1.0, 1.3));
  pose.armR = [idle[0] + (target[0] - idle[0]) * reach, idle[1] + (target[1] - idle[1]) * reach];
  pose.armL = [-185, -150];

  // olhar: acompanha a ponta; depois olha para quem assiste
  if (active) {
    pose.lookX = 0.6 + seg(t, active.from, active.to) * 0.4;
    pose.lookY = 0.45;
  } else if (t < 4.2) {
    pose.lookX = 0.8;
    pose.lookY = 0.5;
  } else {
    pose.lookX = 0;
    pose.lookY = 0;
  }

  // fala: a boca abre e fecha enquanto o balão aparece
  const speaking = t > 4.3 && t < 5.9;
  pose.mouth = speaking ? 0.25 + 0.75 * Math.abs(Math.sin(t * 17)) * (0.6 + 0.4 * Math.sin(t * 5)) : 0;

  drawOlenaBrush(brush, WIDTH, HEIGHT, pose);
  brush.render();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(brushCanvas, 0, 0);
  title(ctx, "Redação", 205, 360, 170, seg(t, 0.2, 1.2));
  bubble(ctx, 60, 760, 720, ["Vem aí na Biblioteca:", "treino de redação!"], seg(t, 4.3, 4.9));
}
