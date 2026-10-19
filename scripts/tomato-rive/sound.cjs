// Gera public/pomodoro-tomato/mordida.wav, o efeito sonoro de cada mordida do tomate, por
// síntese (sem amostras de terceiros): um sopro curto de antecipação, a crocância da casca em três
// estalos, o baque da polpa, o esguicho do suco e as gotinhas caindo. O estalo principal cai em
// 0,22 s, o instante em que a animação troca o tomate pelo estágio mordido (T_SWAP em generate.cjs).
// Determinístico: mesmo arquivo a cada execução. Uso: node scripts/tomato-rive/sound.cjs
const fs = require("node:fs");
const path = require("node:path");

const RATE = 22050;
const SECONDS = 0.85;
const length = Math.round(RATE * SECONDS);
const out = new Float32Array(length);

let seed = 20261019;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296 - 0.5;
};
const TAU = Math.PI * 2;

// ruído filtrado: passa-baixas e passa-altas de um polo
function noise(cutLow, cutHigh) {
  const a = Math.exp((-TAU * cutHigh) / RATE);
  const b = Math.exp((-TAU * cutLow) / RATE);
  let lp = 0;
  let hp = 0;
  return () => {
    const white = random() * 2;
    lp = white + (lp - white) * a; // passa-baixas (corta acima de cutHigh)
    hp = lp + (hp - lp) * b; // acompanha o nível baixo
    return lp - hp; // passa-faixa entre cutLow e cutHigh
  };
}
function add(start, duration, gain, source, shape) {
  const first = Math.round(start * RATE);
  const count = Math.round(duration * RATE);
  for (let i = 0; i < count && first + i < length; i++) {
    const t = i / count;
    out[first + i] += gain * source(i / RATE) * shape(t);
  }
}
const decay = (rate) => (t) => Math.exp(-rate * t);
const hump = (t) => Math.sin(Math.PI * t) ** 2;

// sopro de antecipação
add(0, 0.2, 0.18, noise(300, 2500), hump);
// crocância da casca: três estalos agudos em sequência, cada um com seu corpo
const crunch = [
  [0.22, 0.95],
  [0.243, 0.7],
  [0.272, 0.55],
];
for (const [at, gain] of crunch) {
  add(at, 0.05, gain, noise(1800, 7500), decay(7));
  add(at, 0.03, gain * 0.5, noise(500, 2500), decay(6));
}
// baque da polpa
add(0.22, 0.13, 0.85, (t) => Math.sin(TAU * (190 - 700 * t) * t), decay(5));
// esguicho do suco
add(0.27, 0.3, 0.32, noise(700, 3200), (t) => hump(Math.min(1, t * 1.6)) * (1 - t));
// gotinhas caindo
for (const [at, freq] of [
  [0.5, 1500],
  [0.58, 1850],
  [0.67, 1250],
]) {
  add(at, 0.07, 0.16, (t) => Math.sin(TAU * (freq + 900 * t) * t), decay(5));
}

let peak = 0;
for (const sample of out) peak = Math.max(peak, Math.abs(sample));
const gain = 0.85 / peak;
const pcm = Buffer.alloc(length * 2);
out.forEach((sample, i) =>
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample * gain)) * 32767), i * 2),
);
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);
const target = path.join(__dirname, "..", "..", "public", "pomodoro-tomato", "mordida.wav");
fs.writeFileSync(target, Buffer.concat([header, pcm]));
console.log(`mordida.wav ${(44 + pcm.length) / 1024} KiB, pico original ${peak.toFixed(2)}`);
