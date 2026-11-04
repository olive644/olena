// Preparo do áudio capturado antes do Whisper. O modelo foi treinado com fala em volume
// normal e sem longos silêncios: celular com volume baixo, meio segundo de ruído antes da
// fala e o segundo de silêncio que a captura espera no fim pioram a transcrição (inclusive
// com o "Thank you." inventado). Aqui só cortamos as pontas sem voz e ajustamos o ganho.
// Nada é enviado para fora: o áudio continua em memória, no aparelho.
const FRAME = 320; // 20 ms a 16 kHz
const MARGIN = 14; // quadros mantidos antes e depois da voz (280 ms)
const PAD = 4800; // 300 ms de silêncio nas duas pontas, como o modelo espera
const MAX_GAIN = 31.6; // +30 dB, para não transformar ruído de fundo em fala
const TARGET_PEAK = 0.9;

function percentile(sorted: number[], p: number) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
}

/** Devolve uma cópia sem DC, sem silêncio nas pontas e com o volume normalizado. */
export function prepareSpeechAudio(input: Float32Array): Float32Array {
  const frames = Math.floor(input.length / FRAME);
  if (frames < 4) return input.slice();
  let mean = 0;
  for (const sample of input) mean += sample;
  mean /= input.length;
  const energy: number[] = [];
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let n = f * FRAME; n < (f + 1) * FRAME; n++) sum += (input[n]! - mean) ** 2;
    energy.push(Math.sqrt(sum / FRAME));
  }
  const sorted = [...energy].sort((a, b) => a - b);
  const floor = percentile(sorted, 0.15);
  const loud = percentile(sorted, 0.95);
  const threshold = Math.max(floor * 3, loud * 0.01, 1e-4);
  const first = energy.findIndex((e) => e > threshold);
  if (first < 0) return input.slice();
  let last = first;
  for (let f = frames - 1; f > first; f--)
    if (energy[f]! > threshold) {
      last = f;
      break;
    }
  const from = Math.max(0, first - MARGIN) * FRAME;
  const to = Math.min(frames, last + 1 + MARGIN) * FRAME;
  let peak = 1e-9;
  for (let n = from; n < to; n++) peak = Math.max(peak, Math.abs(input[n]! - mean));
  const gain = Math.min(TARGET_PEAK / peak, MAX_GAIN);
  const output = new Float32Array(PAD + (to - from) + PAD);
  for (let n = from; n < to; n++)
    output[PAD + n - from] = Math.max(-1, Math.min(1, (input[n]! - mean) * gain));
  return output;
}
