// Gera os efeitos sonoros do Pomodoro em public/pomodoro-tomato/*.wav, por síntese (sem amostras de
// terceiros): mordida.wav (cada mordida do tomate) e comecar.wav, pausar.wav e reiniciar.wav (os
// botões do contador). O estalo principal da mordida cai em 0,22 s, o instante em que a animação
// troca o tomate pelo estágio mordido (T_SWAP em generate.cjs). Determinístico: mesmos arquivos a
// cada execução. Uso: node scripts/tomato-rive/sound.cjs
const fs = require("node:fs");
const path = require("node:path");

const RATE = 22050;
const TAU = Math.PI * 2;
const TARGET = path.join(__dirname, "..", "..", "public", "pomodoro-tomato");

function synth(file, seconds, build) {
  const length = Math.round(RATE * seconds);
  const out = new Float32Array(length);
  let seed = 20261019;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296 - 0.5;
  };
  // ruído filtrado: passa-faixa entre cutLow e cutHigh
  const noise = (cutLow, cutHigh) => {
    const a = Math.exp((-TAU * cutHigh) / RATE);
    const b = Math.exp((-TAU * cutLow) / RATE);
    let lp = 0;
    let hp = 0;
    return () => {
      const white = random() * 2;
      lp = white + (lp - white) * a;
      hp = lp + (hp - lp) * b;
      return lp - hp;
    };
  };
  const add = (start, duration, gain, source, shape) => {
    const first = Math.round(start * RATE);
    const count = Math.round(duration * RATE);
    for (let i = 0; i < count && first + i < length; i++)
      out[first + i] += gain * source(i / RATE) * shape(i / count);
  };
  // nota com um harmônico, no timbre de papel e madeira
  const tone = (start, duration, gain, freq, rate) =>
    add(
      start,
      duration,
      gain,
      (t) => Math.sin(TAU * freq * t) + 0.35 * Math.sin(TAU * freq * 2 * t),
      (t) => Math.exp(-rate * t),
    );
  build({ add, noise, tone });
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
  fs.writeFileSync(path.join(TARGET, file), Buffer.concat([header, pcm]));
  console.log(`${file} ${((44 + pcm.length) / 1024).toFixed(1)} KiB`);
}

const decay = (rate) => (t) => Math.exp(-rate * t);
const hump = (t) => Math.sin(Math.PI * t) ** 2;

// cada mordida: sopro de antecipação, três estalos da casca, baque da polpa, suco e gotas
synth("mordida.wav", 0.85, ({ add, noise }) => {
  add(0, 0.2, 0.18, noise(300, 2500), hump);
  for (const [at, gain] of [
    [0.22, 0.95],
    [0.243, 0.7],
    [0.272, 0.55],
  ]) {
    add(at, 0.05, gain, noise(1800, 7500), decay(7));
    add(at, 0.03, gain * 0.5, noise(500, 2500), decay(6));
  }
  add(0.22, 0.13, 0.85, (t) => Math.sin(TAU * (190 - 700 * t) * t), decay(5));
  add(0.27, 0.3, 0.32, noise(700, 3200), (t) => hump(Math.min(1, t * 1.6)) * (1 - t));
  for (const [at, freq] of [
    [0.5, 1500],
    [0.58, 1850],
    [0.67, 1250],
  ])
    add(at, 0.07, 0.16, (t) => Math.sin(TAU * (freq + 900 * t) * t), decay(5));
});

// Começar e Continuar: estalo de papel e três notas subindo, com um brilho no final
synth("comecar.wav", 0.55, ({ add, noise, tone }) => {
  add(0, 0.04, 0.5, noise(2500, 8000), decay(8));
  tone(0.01, 0.22, 0.55, 659, 9);
  tone(0.08, 0.22, 0.55, 988, 9);
  tone(0.15, 0.36, 0.6, 1319, 7);
  add(0.14, 0.3, 0.1, noise(4000, 9000), hump);
});

// Pausar: duas notas macias descendo e um baque leve, como um papel pousando
synth("pausar.wav", 0.4, ({ add, tone }) => {
  tone(0, 0.2, 0.55, 784, 11);
  tone(0.09, 0.28, 0.55, 523, 9);
  add(0, 0.12, 0.45, (t) => Math.sin(TAU * (160 - 300 * t) * t), decay(6));
});

// Reiniciar e Finalizar: papel sendo puxado, um pop e um brilho curto
synth("reiniciar.wav", 0.5, ({ add, noise, tone }) => {
  add(0, 0.26, 0.4, noise(500, 5000), (t) => hump(t) * (0.4 + t));
  add(0.26, 0.12, 0.7, (t) => Math.sin(TAU * (520 - 1500 * t) * t), decay(6));
  add(0.26, 0.03, 0.4, noise(2000, 8000), decay(6));
  tone(0.3, 0.2, 0.25, 1568, 10);
});
